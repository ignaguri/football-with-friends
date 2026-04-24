# Phone Authentication: Password-as-OTP Pattern

## Problem

When using better-auth's expo client with custom phone authentication endpoints, the client enters an infinite `get-session` polling loop. This happens because sessions created outside better-auth's native flow aren't recognized by the expo client's session management.

## Solution: Password as OTP

We use better-auth's native `phoneNumber` plugin for session management, but pass the user's **password as the OTP code**. The server validates the password hash in `verifyOTP` instead of a real SMS code.

### Benefits

1. **No infinite polling** - Sessions created via native `phoneNumber.verify()` are recognized by the expo client
2. **Password security** - Users still authenticate with a real password, not a temporary code
3. **No SMS service needed** - No need to integrate Twilio or similar services
4. **Native session management** - Leverages better-auth's built-in session handling

## Architecture

### Sign-Up Flow

```
1. User enters: name + phone + password
2. Client → POST /api/phone-auth/sign-up
   └─ Creates user with credential account (password hash stored)
   └─ Returns success, NO session
3. Client → authClient.phoneNumber.sendOtp({ phoneNumber })
   └─ Server: no-op (we don't send real SMS)
4. Client → authClient.phoneNumber.verify({ phoneNumber, code: password })
   └─ Server verifyOTP: validates password against stored hash
   └─ Returns session token
5. User is logged in ✓
```

### Sign-In Flow

```
1. User enters: phone + password
2. Client → authClient.phoneNumber.sendOtp({ phoneNumber })
   └─ Server: no-op
3. Client → authClient.phoneNumber.verify({ phoneNumber, code: password })
   └─ Server verifyOTP: validates password against stored hash
   └─ Returns session token
4. User is logged in ✓
```

## Implementation Details

### Server: `apps/api/src/auth.ts`

The `phoneNumber` plugin is configured with custom `sendOTP` and `verifyOTP` callbacks:

```typescript
phoneNumber({
  sendOTP: async () => {
    // No-op: we don't send real SMS
  },
  verifyOTP: async ({ phoneNumber: phone, code }, ctx) => {
    // 'code' is actually the user's password

    // Find user by phone number
    const user = await ctx?.context.adapter.findOne({
      model: "user",
      where: [{ field: "phoneNumber", value: phone }],
    });

    if (!user) return false;

    // Get credential account with password hash
    const accounts = await ctx?.context.internalAdapter.findAccountByUserId(user.id);
    const credentialAccount = accounts?.find(a => a.providerId === "credential");

    if (!credentialAccount?.password) return false;

    // Verify password against stored hash
    return await ctx?.context.password.verify({
      hash: credentialAccount.password,
      password: code,
    });
  },
}),
```

### Client: `packages/api-client/src/auth.ts`

The client uses better-auth's native `phoneNumber` methods:

```typescript
// Sign-up: create user first, then establish session
export async function signUpWithPhone(data: PhoneSignUpData) {
  // Step 1: Create user (no session)
  await fetch(`${getApiUrl()}/api/phone-auth/sign-up`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  // Step 2: Create session via native flow
  await authClient.phoneNumber.sendOtp({ phoneNumber: data.phoneNumber });
  const result = await authClient.phoneNumber.verify({
    phoneNumber: data.phoneNumber,
    code: data.password, // Password as OTP!
  });

  return result.data;
}

// Sign-in: just use native flow
export async function signInWithPhone(data: PhoneSignInData) {
  await authClient.phoneNumber.sendOtp({ phoneNumber: data.phoneNumber });
  const result = await authClient.phoneNumber.verify({
    phoneNumber: data.phoneNumber,
    code: data.password, // Password as OTP!
  });

  return result.data;
}
```

### Sign-Up Endpoint: `apps/api/src/routes/phone-auth.ts`

The endpoint only creates the user—it does NOT create a session:

```typescript
app.post("/sign-up", async (c) => {
  const { phoneNumber, password, name } = c.req.valid("json");

  // Create user with email/password (for password hash storage)
  const generatedEmail = `phone_${phoneNumber.replace(/\+/g, "")}@football.local`;
  const signUpResponse = await auth.api.signUpEmail({
    body: { email: generatedEmail, password, name },
  });

  // Store phone number on user
  await db.updateTable("user")
    .set({ phoneNumber })
    .where("id", "=", signUpResponse.user.id)
    .execute();

  // Return success WITHOUT session
  return c.json({ success: true, user: signUpResponse.user });
});
```

## Why This Works

The expo client's infinite polling occurs when it can't find a valid session after authentication. By using better-auth's native `phoneNumber.verify()` endpoint:

1. The session is created through better-auth's standard flow
2. The expo client's session hooks recognize the session immediately
3. No polling is needed—the session is already available

The "trick" is that `verifyOTP` receives whatever the client passes as `code`. We simply pass the password and validate it server-side against the stored hash.

## Security Considerations

- **Password stored securely**: The password is hashed and stored in better-auth's credential account, same as email/password auth
- **No OTP to intercept**: Since we don't send SMS, there's no OTP that could be intercepted
- **Same security as email/password**: This is effectively email/password auth with phone number as the identifier

## Testing

To verify the fix works:

1. Sign in with phone number and password
2. Open browser DevTools → Network tab
3. Filter by `get-session`
4. After login, you should see only 2-3 `get-session` calls, not continuous polling

## Interaction with group invites

The `user.phoneNumber` column this pattern writes is also the target key for phone-shortcut group invites:

- Organizer creates an invite with `targetPhone: "+49..."` (`POST /api/groups/:id/invites`). If that phone matches an existing user's `phoneNumber`, the server sends them a push notification with the join link (best-effort, always returns the shareable link). See `apps/api/src/lib/notify.ts` `notifyGroupInviteTarget`.
- On invite accept (`GroupService.acceptInvite`), the server also uses `user.phoneNumber` to auto-claim any unclaimed `group_roster` ghost whose `phone` field matches — a single exact match claims, multiple matches are reported as `ambiguousRosterMatches` and require a manual link.

Both flows read the same `phoneNumber` column this pattern populates at sign-up time; if a user signs up via Google OAuth and never adds a phone, they simply won't match phone-targeted invites or phone-keyed ghost rows. Email-keyed ghost claim still works in that case.
