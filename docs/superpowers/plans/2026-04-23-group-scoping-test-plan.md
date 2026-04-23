# Group-Scoping Manual Test Plan

**Date:** 2026-04-23
**Branch under test:** `feat/group-scoping`
**Related docs:**
- Design spec: [`../specs/2026-04-22-group-oriented-scoping-design.md`](../specs/2026-04-22-group-oriented-scoping-design.md)
- Implementation plan (per-phase checklists): [`2026-04-22-group-oriented-scoping.md`](2026-04-22-group-oriented-scoping.md)
- Visibility flag notes: [`../../group-visibility.md`](../../group-visibility.md)

---

## Context

This document is the checked-in manual QA script for the five-phase group-scoping
refactor (PRs #42–#47) that landed on `feat/group-scoping`. The feature adds 5
new DB tables, a `X-Group-Id` header protocol, two new middlewares
(`group-context` + `authz`), 18+ API endpoints, and 7+ UI screens. **None of it
is covered by automated tests today** — `apps/api` has no test runner wired —
so the list below is the contract we walk by hand before every merge to `main`,
and again on staging after deploy.

**How to use it.** Each section is independently runnable. Each flow has
**Preconditions / Steps / Expected / Also verify**. Tick the `- [ ]` box in
the header once you've walked the flow in the environment you're signing off
on. Sections 1–4 cover normal user paths; Section 5 is the cross-group leak
matrix (single biggest risk); Sections 6–9 cover settings, admin gating,
observability, and migration reversibility. Every section ends with an entry
in the **Sign-off log** appendix so we can see when each env was last walked.

**Manual-first, automated-later.** The plan that produced this doc also calls
for a `bun:test` harness under `apps/api/src/test/` — that work is Part B of
[`we-have-finished-our-unified-pony.md`](../../../../../.claude-personal/plans/we-have-finished-our-unified-pony.md)
and is out of scope for this document. Until that lands, the checkboxes below
are what stand between us and a regression.

---

## 0. Setup

### 0.1 [ ] Test users + seed groups

**Preconditions**

- Fresh local DB: `pnpm migrate:up` from repo root has been run against
  `local.db` (or reset via `rm local.db && pnpm migrate:up`).
- Platform admin already exists after migrations: Ignacio
  (`ignacioguri@gmail.com`, `user.role='admin'`) is the sole platform admin
  and owner of `grp_legacy`.

**Seed roster (inline SQL — there is no pnpm-level fixture script yet; paste
into `sqlite3 local.db` or equivalent Turso shell).** Adjust phone numbers if
you already have accounts under these emails.

```sql
-- 8 test users covering every privilege slice.
-- Passwords are created by BetterAuth on first sign-up; seed rows manually
-- via the UI or via direct `user`-table insert if your auth setup allows.
-- Preferred path: sign each one up through the web app, then re-run the
-- memberships below to shape their group state.

-- Target users (create via UI):
--   organizer-a@test.local   +4915100000001   organizer of grp_legacy
--   member-a@test.local      +4915100000002   member of grp_legacy
--   member-ab@test.local     +4915100000003   member of grp_legacy + grp_b
--   organizer-b@test.local   +4915100000004   organizer/owner of grp_b
--   member-b@test.local      +4915100000005   member of grp_b
--   no-group-user@test.local +4915100000006   member of zero groups
--   pre-claim-user@test.local +4915100000099  phone matches a seeded ghost

-- Second group (grp_b). Use the platform admin "Create Group" flow (flow 2.2)
-- OR insert directly for headless setup:
INSERT INTO groups (id, name, slug, owner_user_id, visibility, created_at, updated_at)
VALUES ('grp_b', 'Group B', 'group-b',
        (SELECT id FROM user WHERE email='organizer-b@test.local'),
        'private', unixepoch(), unixepoch());

-- Promote organizer-a to organizer of grp_legacy:
UPDATE group_members SET role='organizer'
WHERE group_id='grp_legacy'
  AND user_id=(SELECT id FROM user WHERE email='organizer-a@test.local');

-- Add organizer-b as organizer of grp_b (creation inserts owner row; verify):
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
VALUES ('gm_orgb', 'grp_b',
        (SELECT id FROM user WHERE email='organizer-b@test.local'),
        'organizer', unixepoch());

-- member-ab gets memberships in BOTH groups:
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
VALUES ('gm_mab_leg', 'grp_legacy',
        (SELECT id FROM user WHERE email='member-ab@test.local'),
        'member', unixepoch());
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
VALUES ('gm_mab_b', 'grp_b',
        (SELECT id FROM user WHERE email='member-ab@test.local'),
        'member', unixepoch());

-- member-b in grp_b only:
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
VALUES ('gm_mb_b', 'grp_b',
        (SELECT id FROM user WHERE email='member-b@test.local'),
        'member', unixepoch());

-- no-group-user: remove legacy membership the migration auto-created:
DELETE FROM group_members
WHERE user_id=(SELECT id FROM user WHERE email='no-group-user@test.local');

-- Pre-claim ghost for flow 4.2 (phone matches pre-claim-user):
INSERT INTO group_roster (id, group_id, display_name, phone, email,
                          claimed_by_user_id, created_by_user_id,
                          created_at, updated_at)
VALUES ('rst_preclaim', 'grp_legacy', 'Pre-Claim Ghost', '+4915100000099',
        NULL, NULL,
        (SELECT id FROM user WHERE email='organizer-a@test.local'),
        unixepoch(), unixepoch());
```

**Expected**

- `SELECT role, COUNT(*) FROM user GROUP BY role;` → `platform admin=1`, rest `user`.
- `SELECT group_id, COUNT(*) FROM group_members GROUP BY group_id;` →
  `grp_legacy` has one row per seeded non-`no-group-user`; `grp_b` has 4
  (organizer-b, member-ab, member-b, and any organizer auto-joined by
  `createGroup`).

**Also verify**

- `SELECT * FROM groups WHERE deleted_at IS NOT NULL;` → empty at start; used
  later as a delete-test baseline.

---

### 0.2 [ ] Running the dev servers

**Preconditions**

- `pnpm install` completed at repo root.
- `.env` has `TURSO_DATABASE_URL=file:local.db` (or wherever `local.db` lives;
  see `/Users/ignacioguri/Documents/Repos/football-with-friends/local.db`).

**Steps**

1. Terminal A: `pnpm dev:api`. API listens on
   `http://localhost:3001` (see `apps/api/src/index.ts:138` — `const port =
   process.env.PORT || 3001;`).
2. Terminal B: `pnpm dev:app`. Expo dev server starts; press `w` to open
   web at `http://localhost:8081` (default Expo web port).
3. Optional Terminal C: `cd apps/api && pnpm cf:tail` against staging, or
   `wrangler dev` if you want Workers-style logs locally. For sections 8.x
   you need **some** view of the structured logs emitted by `GroupService`.

**Expected**

- `curl -s http://localhost:3001/health` → `{"status":"ok"}` (unauthenticated,
  it's in `PUBLIC_ROUTES` — see `apps/api/src/middleware/security.ts:53`).
- Web renders the sign-in landing at `http://localhost:8081` with no console
  errors.

---

### 0.3 [ ] Chrome DevTools setup for X-Group-Id inspection

Every scoped request must carry `X-Group-Id`. Watch it at all times.

**Steps**

1. Open Chrome. Menu → More Tools → Developer Tools (⌥⌘I on macOS).
2. Network tab. Filter box: type `X-Group-Id` and click **Has blocked cookies ▾ →
   Has-Response-Header** (in Chrome 121+ the UI is **Filter → Name contains**
   plus a toggle; easier path below).
3. Easier path: click **Fetch/XHR** on the sub-filter row. Sort by **Name**.
   Click a request row → **Headers** tab → **Request Headers** → look for
   `X-Group-Id:`. **Response Headers** → also shows `X-Group-Id:` echoed back
   (set by `groupContextMiddleware` at
   `apps/api/src/middleware/group-context.ts:48`).
4. Persist the filter across navigations: gear icon → **Preserve log**.

**Expected**

- Every `/api/*` request except the public allowlist
  (`apps/api/src/middleware/security.ts:47-57`) has an `X-Group-Id` header on
  request OR gets one echoed on response (first-login auto-pick).

**Also verify**

- For the six allowlisted publics — `/api/auth/*`, `/api/phone-auth/*`,
  `/api/matches/:id/preview`, `/api/invites/:token` (GET only),
  `/api/profile/picture/*`, `/health`, and the three `/api/cron/*` endpoints —
  the header is absent on request and absent on response. Confirm this for at
  least `/api/invites/:token` in flow 3.3.

---

### 0.4 [ ] Audit SQL for migrations

**Steps**

1. Run at any time after `pnpm migrate:up`:
   `sqlite3 local.db < packages/shared/src/database/audit/verify-legacy-backfill.sql`
2. For staging, use the Turso shell:
   `turso db shell football-with-friends-staging-pepegrillo < packages/shared/src/database/audit/verify-legacy-backfill.sql`.

**Expected** — all 7 checks resolve to zero / expected values (see the
comments in the SQL file itself). The only non-zero expected results are
`platform admin_count=1`, `membership_equals_users` user/member counts match,
`legacy_group_owner` returns Ignacio's email, and `settings_copied` shows
equal global vs. group_settings counts.

---

## 1. Authentication + Group-Context Middleware

Scope: behavior of `groupContextMiddleware`
(`apps/api/src/middleware/group-context.ts`), header echo semantics, and
client self-healing via `packages/api-client/src/client.ts`.

### 1.1 [ ] Fresh login auto-picks group

**Preconditions**

- Member-A has exactly one membership (`grp_legacy`).
- Browser: clear AsyncStorage / SecureStore for the site (DevTools →
  Application → Storage → Clear site data).

**Steps**

1. Sign in as `member-a@test.local`.
2. In DevTools Network, open the first scoped request after sign-in
   (e.g. `GET /api/matches`). Inspect request + response headers.

**Expected**

- Request header `X-Group-Id` **absent** on first call.
- Response header `X-Group-Id: grp_legacy` **present** — middleware picked
  `findFirstMembership` and echoed it
  (`group-context.ts:40-48`).
- Next scoped request in the same session carries
  `X-Group-Id: grp_legacy` (client persisted via
  `packages/api-client/src/group-storage.ts → recordGroupIdFromResponse`).

**Also verify**

- Matches list renders legacy matches only. No console errors.

---

### 1.2 [ ] Zero-group user gets NO_GROUP + onboarding screen

**Preconditions**

- `no-group-user@test.local` has no rows in `group_members`.

**Steps**

1. Sign in as `no-group-user@test.local`.
2. Observe the app UI and the first scoped API call.

**Expected**

- Any scoped endpoint returns `409 {"error":"You do not belong to any
  group","code":"NO_GROUP"}` (`group-context.ts:43`).
- Web UI renders the `<NoGroupOnboarding />` component in place of `<Tabs>`
  (see `apps/mobile-web/app/(tabs)/_layout.tsx:47`), using copy from
  `groups.noGroup.title` / `.body` / `.hint` / `.signOut`.
- `/api/groups/me` still works — returns `{groups: []}` (no group context
  required; registered before the middleware in `routes/groups.ts:33`).

---

### 1.3 [ ] Stale X-Group-Id after being kicked self-heals

**Preconditions**

- Member-AB is in `grp_legacy` and `grp_b`. Active group persisted to
  `grp_b` (walk flow 1.6 first if needed).

**Steps**

1. As organizer-b, kick member-ab from `grp_b`
   (`DELETE /api/groups/grp_b/members/<member-ab-id>`) via admin UI or curl.
2. Switch back to member-ab's browser (still signed in, still holding
   `X-Group-Id: grp_b` in storage). Trigger any scoped request (tab reload
   on matches).

**Expected**

- First request with `X-Group-Id: grp_b` → `403 {"error":"Not a member of
  this group","code":"FORBIDDEN_GROUP"}` (`group-context.ts:38`).
- Client's `useCurrentGroup` self-heals: next scoped request omits the
  header, server auto-picks `grp_legacy`, response echoes
  `X-Group-Id: grp_legacy`. Matches list refetches to legacy data.

**Also verify**

- No infinite loop of 403s in Network panel.

---

### 1.4 [ ] Platform admin can pin any X-Group-Id; non-platform admin cannot

**Preconditions**

- Platform admin (Ignacio) and organizer-a both signed in (two browser profiles).

**Steps (platform admin side)**

1. In DevTools Console, force a scoped request with
   `fetch('/api/groups/grp_b', {headers: {'X-Group-Id': 'grp_b'}})` (or use
   the switcher UI to set `grp_b`).

**Expected**

- `200 {group: {...}}` — platform admin bypass at
  `group-context.ts:31-37` returns `{id, role:'organizer', isOwner:true}`
  even without membership.

**Steps (non-platform admin side)**

1. As organizer-a (no membership in `grp_b`), `fetch('/api/groups/grp_b',
   {headers: {'X-Group-Id': 'grp_b'}})`.

**Expected**

- `403 FORBIDDEN_GROUP`.

---

### 1.5 [ ] Soft-deleted group id → 404

**Preconditions**

- Temporary throwaway group exists. Create one via flow 2.2, then delete
  via flow 2.8 before running this.

**Steps**

1. After delete, platform admin tries
   `curl -H "X-Group-Id: <deleted-id>" http://localhost:3001/api/groups/<deleted-id>`.

**Expected**

- `404 {"error":"Group not found","code":"GROUP_NOT_FOUND"}`
  (`group-context.ts:34`). `findById` filters `deleted_at IS NULL`.

---

### 1.6 [ ] Switching groups invalidates TanStack caches

**Preconditions**

- Member-AB in both `grp_legacy` and `grp_b`. Each group has at least one
  distinct match created (use flows 2.2 / match creation UI).

**Steps**

1. Sign in as member-ab. Matches tab shows legacy matches.
2. Open DevTools Network, clear log.
3. Use the header group switcher (visible because `myGroups.length >= 2` —
   see `apps/mobile-web/components/group-switcher.tsx`). Pick `Group B`.
4. Watch Network.

**Expected**

- `switchGroup` writes the new active id via `setActiveGroupId` then calls
  `queryClient.invalidateQueries()` (no filter) — see
  `packages/api-client/src/groups.ts` `useCurrentGroup`.
- Immediately a new `GET /api/matches` fires with `X-Group-Id: grp_b`.
- UI re-renders with `grp_b`'s matches.

---

## 2. Group Management API + Switcher UI

Endpoints under `apps/api/src/routes/groups.ts`. Hooks under
`packages/api-client/src/groups.ts`.

### 2.1 [ ] GET /api/groups/me shape

**Preconditions**

- Member-AB signed in (2 memberships).

**Steps**

1. `curl -H "Cookie: <session>" http://localhost:3001/api/groups/me`
   (or watch the app fire it on launch).

**Expected**

- `200 {"groups": [{ id, name, slug, visibility, role, isOwner,
  joinedAt }, ...]}` — both memberships present. `role` reflects per-group
  role. `isOwner` true only for groups owned.

**Also verify**

- Endpoint is registered **before** `groupContextMiddleware` in
  `routes/groups.ts:33` — hits without `X-Group-Id` succeed.

---

### 2.2 [ ] Platform admin creates a second group

**Preconditions**

- Signed in as Ignacio (platform admin).

**Steps**

1. Navigate to **Admin → Create Group** (`/admin/create-group`).
2. Fill `Group name = Ad-hoc Test`. Submit.
3. Observe `POST /api/groups` in Network.

**Expected**

- `201 {"group": {...}}`. Body echoes the created group with `owner_user_id =
  Ignacio.id`.
- Client auto-switches via `useCreateGroup` onSuccess (sets active
  groupId), navigates to the new group's detail page.
- Platform admin is present as `organizer` in `group_members` for the new group.

**Also verify**

- `groups.created` structured log event emitted (see section 8.1).

---

### 2.3 [ ] Non-platform admin cannot create groups

**Preconditions**

- Organizer-a (organizer of legacy, NOT platform admin) signed in.

**Steps**

1. `curl -X POST -H "Cookie: <org-a-session>" -H "Content-Type: application/json" \
      -d '{"name":"Sneaky"}' http://localhost:3001/api/groups`

**Expected**

- `403 {"error":"Platform admin role required","code":"FORBIDDEN"}` —
  `requirePlatformAdmin` at `routes/groups.ts:54`.

**Also verify**

- Admin tab on organizer-a's UI does NOT surface a "Create Group" entry.

---

### 2.4 [ ] Switcher visibility threshold

**Preconditions**

- A single-group user (organizer-a) and a two-group user (member-ab) each
  have their own browser profile.

**Steps**

1. As organizer-a: load any tab. Inspect the header area.
2. As member-ab: reload.

**Expected**

- Organizer-a: `<GroupSwitcher />` renders nothing (component returns null
  when `myGroups.length < 2`).
- Member-ab: switcher visible, showing current group name + chevron.

**Also verify**

- When organizer-a joins a second group via invite (flow 3.5), the
  switcher appears on next full app reload (or on next
  `useMyGroups` refetch).

---

### 2.5 [ ] Group detail organizer view vs. member view

**Preconditions**

- Organizer-a and member-a both in `grp_legacy`.

**Steps**

1. Organizer-a opens **Profile → My Groups → Legacy**.
2. Member-a does the same.

**Expected**

- Organizer view: members list, invites section, settings row, Transfer /
  Delete actions. Served by `getGroupDetails` branch in `routes/groups.ts:91`.
- Member view: stripped payload — only `{id, name, slug, visibility,
  myRole}` — with a **Leave group** button. `routes/groups.ts:97`.

---

### 2.6 [ ] Visibility toggle is platform admin-only

**Preconditions**

- Organizer-a and Ignacio in `grp_legacy`.

**Steps (organizer-a)**

1. `curl -X PATCH -H "X-Group-Id: grp_legacy" -H "Cookie: <org-a>" \
      -H "Content-Type: application/json" \
      -d '{"visibility":"public"}' \
      http://localhost:3001/api/groups/grp_legacy`

**Expected**

- `403 {"error":"Only platform admin can change visibility"}`
  (`routes/groups.ts:132`).

**Steps (Ignacio)**

1. Same request with Ignacio's session.

**Expected**

- `200 {"group": {... "visibility": "public"}}`. See
  [`docs/group-visibility.md`](../../group-visibility.md) for full semantics.
- Revert: PATCH back to `"visibility":"private"` at end of flow.

---

### 2.7 [ ] Ownership transfer

**Preconditions**

- In `grp_legacy`: Ignacio is owner; organizer-a is organizer.

**Steps**

1. As Ignacio, `POST /api/groups/grp_legacy/transfer-ownership
   {"toUserId": "<organizer-a-id>"}`.
2. As organizer-a, `GET /api/groups/me`.

**Expected**

- `200 {success: true}`.
- Organizer-a's `/me` now shows `isOwner: true` for `grp_legacy`. Ignacio
  drops to `role: 'organizer'` / `isOwner: false`.
- `group.ownership_transferred` log event emitted.

**Also verify**

- Transfer to a non-organizer target (e.g. member-a) → `400 {"error":
  "..."}`. Service guard in `group-service.ts` transferOwnership.
- Transfer back to Ignacio at end of flow so later tests match baseline.

---

### 2.8 [ ] Owner leave / delete

**Preconditions**

- Throwaway group from flow 2.2 ("Ad-hoc Test"), owned by platform admin.

**Steps (leave attempt)**

1. As owner, `POST /api/groups/<id>/leave`.

**Expected**

- `400 {"error": "..."}` — owner cannot leave (service guard in
  `leaveGroup`).

**Steps (delete)**

1. As owner, `DELETE /api/groups/<id>`.
2. Reload the app.

**Expected**

- `200 {success:true}`. `groups.deleted_at` set (soft-delete).
- `useDeleteGroup` clears active group id when the deleted group was active
  — next request auto-picks fallback membership.
- Scoped request with `X-Group-Id: <deleted-id>` → `404 GROUP_NOT_FOUND`
  (see flow 1.5).

---

### 2.9 [ ] Kick member self-heals target

Same as flow 1.3 but exercised through the UI: admin/members list →
kebab → **Remove from group** → confirm. Target's next request 403s and
client self-heals to another membership.

---

### 2.10 [ ] i18n EN + ES

**Preconditions**

- English session and Spanish session of the app.

**Steps**

1. Walk: My Groups list, group detail (organizer view + member view),
   switcher sheet, Create Group form, No-Group onboarding.

**Expected**

- All `groups.*` keys render human copy. **No raw `groups.xyz` placeholders
  leak** in either locale.
- Keys to verify rendered (from `locales/en/common.json:741-839` and the
  matching `locales/es/common.json`):
  - `groups.switcher.label`, `groups.switcher.loading`, `groups.switcher.open`
  - `groups.myGroups.title` / `.empty` / `.owner` / `.organizer` / `.member`
  - `groups.create.title` / `.nameLabel` / `.namePlaceholder` / `.cta`
    / `.success` / `.platform adminOnly`
  - `groups.detail.title` / `.members` / `.settings` / `.leave` /
    `.transfer` / `.delete` / `.deleteConfirm` / `.loadError`
  - `groups.members.promote` / `.demote` / `.kick`
  - `groups.noGroup.title` / `.body` / `.hint` / `.signOut`

**Also verify**

- Native-speaker audit of ES strings is **out of scope** — listed in the
  Known deferred items appendix. This flow only checks keys render.

---

## 3. Invites (Phase 3)

Routes: `apps/api/src/routes/invites.ts` (public + authed) and the invite
subset of `apps/api/src/routes/groups.ts` (create/list/revoke).
Service: `acceptInvite` in `packages/shared/src/services/group-service.ts:310`.

### 3.1 [ ] Create + copy shareable invite

**Preconditions**

- Organizer-a signed in, in `grp_legacy`.

**Steps**

1. Profile → My Groups → Legacy → Invites section → **Create invite link**.
2. Confirm default expiry toast. Tap **Copy**.

**Expected**

- `POST /api/groups/grp_legacy/invites` → `201 {invite: {token, expiresAt,
  ...}}`. `expiresAt` ≈ `now + 7d` if no `expiresInHours` sent.
- Token present in clipboard on web (use `navigator.clipboard.readText()`
  in DevTools console to confirm).
- New invite appears in the list.

---

### 3.2 [ ] Phone-targeted invite E.164 validation

**Preconditions**

- Organizer-a on group-detail/invites section.

**Steps**

1. Create invite with phone `12345` (invalid).
2. Create invite with phone `+4915100000099` (valid, matches pre-claim-user).

**Expected**

- Invalid → inline error from zod refinement
  (`routes/groups.ts:263-267`, message `"targetPhone must be E.164 (e.g.
  +1234567890)"`). UI copy: `groups.invite.phoneInvalid`.
- Valid → `201`. DB row has `target_phone='+4915100000099'`.
- If the phone matches an existing user, a `PushNotification` is kicked off
  via `notifyGroupInviteTarget` (fire-and-forget through
  `c.executionCtx?.waitUntil`). Push delivery is **not tested here** —
  see Known deferred items.

---

### 3.3 [ ] Invite preview reasons

**Preconditions**

- A known-valid invite token `T_VALID`.
- Prepare four broken tokens by direct DB manipulation of the same row or
  separate rows:
  - Expired: `UPDATE group_invites SET expires_at = strftime('%s','now','-1
    day')*1 WHERE id='<id>'` — save token as `T_EXPIRED`.
  - Revoked: `DELETE /api/groups/:id/invites/:inviteId` via UI, then fetch
    preview on its token — save as `T_REVOKED`.
  - Exhausted: create an invite with `maxUses=1`, accept it once (flow
    3.5), then preview again — `T_EXHAUSTED`.
  - Garbage: `T_BAD = zzzzzzzzzzzzzzzzzzzzzzzz`.

**Steps**

1. `curl http://localhost:3001/api/invites/$T_VALID` (no auth — it's in
   `PUBLIC_ROUTES`; `security.ts:51`).
2. Repeat for each token.

**Expected**

| Token          | Response                                                                                        |
|----------------|-------------------------------------------------------------------------------------------------|
| `T_VALID`      | `200 {valid:true, group:{name}, inviter:{name}, expiresAt}`                                     |
| `T_EXPIRED`    | `200 {valid:false, reason:"expired"}`                                                           |
| `T_REVOKED`    | `200 {valid:false, reason:"revoked"}`                                                           |
| `T_EXHAUSTED`  | `200 {valid:false, reason:"exhausted"}`                                                         |
| `T_BAD`        | `200 {valid:false, reason:"not_found"}`                                                         |

- No `X-Group-Id` header on request **or** response. Confirm in DevTools.
- `target_mismatch` is surfaced only on `POST /accept` (see flow 3.6),
  not on preview — the preview endpoint doesn't know the caller's identity.

---

### 3.4 [ ] Signed-out → sign up → auto-accept flow

**Preconditions**

- Fresh browser profile / incognito. `T_VALID` in hand.

**Steps**

1. Open `http://localhost:8081/join/$T_VALID`.
2. Observe preview card.
3. Click **Sign in to join** → complete sign-up with a brand new email.
4. Observe redirect behavior.

**Expected**

- `/join/[token]` screen renders preview using `groups.invite.previewTitle`
  + `groups.invite.invitedBy`.
- Sign-in CTA carries `redirectTo=/join/<token>`.
- After auth, the app returns to `/join/<token>`, auto-calls
  `POST /api/invites/<token>/accept`, receives
  `{joined:true, groupId, ...}`, persists active group, navigates to
  `/(tabs)/matches`.
- Matches list shows the group's matches (may be empty).

---

### 3.5 [ ] Signed-in cross-group join

**Preconditions**

- Member-a is in `grp_legacy` only. Organizer-b has created `T_B` invite
  for `grp_b`.

**Steps**

1. Member-a signed in. Open `/join/$T_B`.

**Expected**

- Auto-accept fires. `newMembership: true`. Active group flips to `grp_b`.
- Switcher appears (`myGroups.length === 2` now).
- Matches tab refetches with `X-Group-Id: grp_b` — shows only `grp_b`'s
  matches.

---

### 3.6 [ ] Idempotent accept

**Preconditions**

- Member-a now in both groups (after flow 3.5). Same token `T_B`.

**Steps**

1. `POST /api/invites/T_B/accept` again (curl or re-hit `/join/T_B`).

**Expected**

- `200 {joined:true, groupId:'grp_b', claimedRosterId?:undefined,
  ambiguousRosterMatches?:undefined}`.
- `memberRepo.tryAdd` returns `addedNewMembership=false`, so
  `tryConsumeUse` is NOT called (see service lines 349–361):
  `SELECT uses_count FROM group_invites WHERE token='T_B'` shows +1 over
  flow 3.5, not +2.

---

### 3.7 [ ] Concurrency smoke on max_uses=1

**Preconditions**

- Two fresh users (e.g. sign up two throwaway accounts). Organizer-a creates
  an invite with `maxUses: 1` → `T_SINGLE`.

**Steps**

1. In two separate browsers, both simultaneously POST
   `/api/invites/T_SINGLE/accept`. Easiest: two DevTools consoles, paste
   `fetch(...)` into both, hit Enter ~within a tick.

**Expected**

- Exactly one returns `{joined:true}`; the other returns `400 {error:
  "exhausted", joined:false}` (invites route body — `routes/invites.ts:29`).
- DB: `uses_count = 1`. Exactly one new row in `group_members`.
- Per the service comment at `group-service.ts:301-308`, under extreme
  concurrency an extra member row *may* slip in; acceptable at current
  scale. Note any such occurrence in the sign-off log.

---

### 3.8 [ ] Revoke an active invite

**Preconditions**

- `T_VALID` from flow 3.1 still active.

**Steps**

1. `DELETE /api/groups/grp_legacy/invites/<inviteId>` (via UI button).
2. `GET /api/invites/$T_VALID` → preview.
3. `POST /api/invites/$T_VALID/accept` as any signed-in user.

**Expected**

- DELETE → `200 {success:true}`.
- Preview → `{valid:false, reason:"revoked"}`.
- Accept → `400 {error:"revoked", joined:false}`.

---

## 4. Ghost Roster + Auto-Claim (Phases 3 + 4)

### 4.1 [ ] Organizer creates ghost

**Preconditions**

- Organizer-a in `grp_legacy`.

**Steps**

1. Admin → Roster → **Add ghost**. Name: "Pibe Nuevo", phone:
   `+4915199999999`.

**Expected**

- `POST /api/groups/grp_legacy/roster` → `201 {entry: {...}}`.
- Roster list shows the new entry with **Unclaimed** badge
  (`groups.roster.unclaimed`).
- `SELECT claimed_by_user_id FROM group_roster WHERE display_name='Pibe
  Nuevo'` → NULL.

---

### 4.2 [ ] Auto-claim on invite accept

**Preconditions**

- `rst_preclaim` ghost (from setup 0.1) exists with phone
  `+4915100000099`. `pre-claim-user@test.local` has that phone on their
  BetterAuth `user.phoneNumber`.
- Organizer-a creates invite `T_CLAIM` for `grp_legacy` (no targetPhone).

**Steps**

1. Sign in as `pre-claim-user`. Open `/join/$T_CLAIM`.

**Expected**

- Accept returns `{joined:true, claimedRosterId:'rst_preclaim'}`.
- `ghost.claimed` structured log event emitted
  (`group-service.ts:397`).
- Roster UI (as organizer-a) now shows `rst_preclaim` as **Claimed**,
  linked to pre-claim-user (`groups.roster.linkedTo`).
- DB: `claimed_by_user_id = <pre-claim-user.id>`.

---

### 4.3 [ ] Ambiguous auto-claim

**Preconditions**

- Two unclaimed ghosts in `grp_legacy` sharing phone `+4915100000055`:

```sql
INSERT INTO group_roster (id, group_id, display_name, phone, created_by_user_id, created_at, updated_at)
VALUES ('rst_amb1', 'grp_legacy', 'Ambi One', '+4915100000055',
        (SELECT id FROM user WHERE email='organizer-a@test.local'),
        unixepoch(), unixepoch()),
       ('rst_amb2', 'grp_legacy', 'Ambi Two', '+4915100000055',
        (SELECT id FROM user WHERE email='organizer-a@test.local'),
        unixepoch(), unixepoch());
```

- A fresh user with phone `+4915100000055` is signed in.
- Organizer-a mints a non-targeted invite `T_AMB`.

**Steps**

1. Fresh user accepts `T_AMB`.

**Expected**

- Response: `{joined:true, ambiguousRosterMatches:2}`, no
  `claimedRosterId` (service branch at `group-service.ts:386-388`).
- Neither ghost's `claimed_by_user_id` changes.
- Organizer resolves manually: Admin → Roster → edit ghost → **Link to
  existing member** → picks the user. Sets `claimed_by_user_id`.

---

### 4.4 [ ] Ghost create with phone of existing member

**Preconditions**

- Member-a exists with phone `+4915100000002`. Organizer-a on roster UI.

**Steps**

1. Submit create-ghost form with name "Duplicate" + phone
   `+4915100000002`.

**Expected**

- `409 {error:"already_member", userId:"<member-a-id>"}`
  (`routes/groups.ts:385-388`).
- UI shows `groups.roster.alreadyMemberError` copy: *"A member with that
  phone or email is already in this group — invite them directly instead
  of adding a ghost."*

---

### 4.5 [ ] Roster CRUD flows

**Preconditions**

- Organizer-a, at least 3 ghosts in the group.

**Steps**

1. **Add**: flow 4.1.
2. **Edit**: tap ghost → change display name → save.
3. **Link**: edit ghost → **Link to existing member** → search by name →
   pick member-a.
4. **Unlink**: edit same ghost → **Unlink from member-a**.
5. **Delete**: delete the throwaway ghost from step 1.

**Expected**

- Each step's PATCH / DELETE returns `200` / `201`.
- Link picker filters member list as you type
  (`groups.roster.searchMembers`).
- Unlink sends `{claimedByUserId: null}` PATCH. DB row's
  `claimed_by_user_id` → NULL.

---

### 4.6 [ ] Delete ghost with referencing signups

**Preconditions**

- Create a ghost AND sign them up for a match. Easiest path: admin quick-add
  on a match detail (flow 4.8).

**Steps**

1. Delete the ghost from the roster UI (without `force`).
2. Confirm the second-stage **Delete anyway** prompt.

**Expected**

- First DELETE → `409 {error:"has_signups", referencingSignupCount: <N>}`
  (see `routes/groups.ts:459-467`).
- UI uses `groups.roster.forceDeleteConfirm` for the second prompt.
- Second DELETE with `?force=true` → `200`. `signups.roster_id` for those
  rows becomes NULL; signup history preserved (not deleted).

---

### 4.7 [ ] Match-detail invite-a-friend modal

**Preconditions**

- A match exists in `grp_legacy`. Organizer-a and member-a sessions.

**Steps**

1. Open match detail as organizer-a → "Invite a friend".
2. Same as member-a.

**Expected**

- Organizer view: two tabs / modes: **Pick from roster**
  (`groups.roster.guestPickerTitle`) and **Quick add**
  (`groups.roster.quickAddTitle`). Roster query fires (200).
- Member view: only Quick-add. **The roster query is NOT fetched** —
  confirm in Network panel that there's no `GET /api/groups/:id/roster`
  from member-a (would otherwise 403 and pollute console).

---

### 4.8 [ ] Quick-add creates ghost + signup atomically

**Preconditions**

- Organizer-a on a match.

**Steps**

1. Match detail → Invite → Quick add → name "Pibe Instantáneo" → submit.

**Expected**

- One call creates ghost + signup in the same request (see service quick-add
  flow).
- Roster list now contains "Pibe Instantáneo" as **Unclaimed**.
- Match signups include the new entry attributed via `roster_id`.

---

### 4.9 [ ] Legacy guest conversion migration audit

**Preconditions**

- Phase 4 migration `<ts>-convert-legacy-guests-to-ghosts.ts` has been
  applied (local) OR is being verified on staging.

**Steps**

1. `sqlite3 local.db < packages/shared/src/database/audit/verify-legacy-backfill.sql`
2. Look at the `unlinked_guest_signups` row (the SQL's check #7, lines
   56-61).

**Expected**

- `unlinked_guest_signups` count = 0.
- Spot-check: pick an old match, open its signup list in the UI, confirm
  guest names still appear correctly (now attributed via
  `signups.roster_id`).

---

## 5. Cross-Group Isolation (leak tests)

**This is the highest-risk section.** We intentionally return `404` (not
`403`) from `assertInCurrentGroup` to avoid leaking row existence across
groups (`apps/api/src/middleware/authz.ts:60-75`).

**Setup for every row in the table**

- Sign in as **member-a** (in `grp_legacy` only).
- `grp_b` has at least one of each entity type, owned by organizer-b.
- Substitute `:id` with the **grp_b** entity's id. `X-Group-Id` header
  stays `grp_legacy`.
- Platform admin column: repeat the request as Ignacio with
  `X-Group-Id: grp_b` (explicit pin). All should succeed.

### 5.1 [ ] Cross-group leak matrix

| # | Method | Path                                               | Expected (member-a → `grp_legacy` active) | Expected (platform admin → `X-Group-Id: grp_b`) |
|---|--------|----------------------------------------------------|-------------------------------------------|---------------------------------------------|
| a | GET    | `/api/matches/:id`                                 | `404`                                     | `200`                                       |
| b | PATCH  | `/api/matches/:id`                                 | `404`                                     | `200` (valid body)                          |
| c | POST   | `/api/matches/:id/signup`                          | `404`                                     | `200` / `201`                               |
| d | GET    | `/api/locations/:id`                               | `404`                                     | `200`                                       |
| e | GET    | `/api/courts/:id`                                  | `404`                                     | `200`                                       |
| f | GET    | `/api/groups/:id/members`                          | `404`                                     | `200`                                       |
| g | GET    | `/api/groups/:id/roster`                           | `404`                                     | `200`                                       |
| h | GET    | `/api/groups/:id/invites`                          | `404`                                     | `200`                                       |
| i | GET    | `/api/voting/match/:matchId/criteria`              | `404`                                     | `200`                                       |
| j | GET    | `/api/rankings?...`                                | `200` (scoped to `grp_legacy`)            | `200` (scoped to `grp_b`)                   |
| k | GET    | `/api/player-stats/match/:matchId`                 | `404`                                     | `200`                                       |
| l | GET    | `/api/match-media/:matchId`                        | `404`                                     | `200`                                       |
| m | GET    | `/api/match-media/feed`                            | `200` (only `grp_legacy` media)           | `200` (only `grp_b` media)                  |

**Expected across the board**

- **Never** `200` for member-a on a `grp_b` entity.
- **Never** `403` on the 404 rows — the id-hiding property is
  load-bearing. If you see a `403` on a row entry, file an issue.
- Platform admin column: `200` on every row (bypass via `isPlatformAdmin` in
  `authz.ts:23-25`).

**Also verify**

- Look at response body for member-a 404s: message is generic ("Not
  found"), no group name or owner email leaked.
- `match-media/feed` (row m) and `rankings` (row j) return scoped lists but
  never 404 — they're aggregate endpoints, not entity-by-id. They still
  must not include the other group's data. Confirm row counts differ
  between the two sessions.

---

## 6. Settings scoping

Each group has its own `group_settings` row. Legacy group got a copy of the
pre-migration global `settings` table (audit check #6).

### 6.1 [ ] Per-group settings isolation

**Preconditions**

- Organizer-a in `grp_legacy`, organizer-b in `grp_b`.

**Steps**

1. Organizer-a: `PATCH /api/settings {"defaultCostPerPlayer": 10}` (with
   `X-Group-Id: grp_legacy`).
2. Organizer-b: `GET /api/settings` with `X-Group-Id: grp_b`.

**Expected**

- Organizer-b sees the pre-existing / default value, **not** `10`. The
  write was scoped to `grp_legacy`.
- `SELECT group_id, key, value FROM group_settings WHERE key LIKE
  '%cost%';` shows the difference row-by-row.

---

### 6.2 [ ] Legacy settings preserved by migration

**Steps**

1. Run the audit SQL, inspect `settings_copied` check (line 51-53 of
   `verify-legacy-backfill.sql`).

**Expected**

- `global_count == group_count` (5 rows was the local baseline; staging may
  differ — match whatever the source `settings` table has).

---

## 7. Admin tab + UI gating

Tab visibility lives in `apps/mobile-web/app/(tabs)/_layout.tsx:51-52`:

```tsx
const isPlatformAdmin = session?.user?.role === "platform admin";
const isAdmin = isPlatformAdmin || myRole === "organizer";
```

### 7.1 [ ] Legacy admin now organizer, still sees admin tab

**Preconditions**

- Organizer-a (pre-migration `user.role='admin'` → post-migration
  `user.role='user'` + `group_members.role='organizer'` in `grp_legacy`).

**Steps**

1. Sign in as organizer-a. Check tab bar.

**Expected**

- **Admin** tab visible (`myRole === 'organizer'` → `isAdmin = true`).

---

### 7.2 [ ] Regular user has no admin tab

**Preconditions**

- Member-a (`user.role='user'`, `group_members.role='member'`).

**Expected**

- **Admin** tab hidden.

---

### 7.3 [ ] Cross-group role change re-hides tab

**Preconditions**

- Organizer-ab: organizer in `grp_legacy`, member in `grp_b`.
  (Promote member-ab to organizer in legacy first if needed.)

**Steps**

1. Sign in as organizer-ab. `grp_legacy` active. Admin tab visible.
2. Open switcher → pick `grp_b`. Tab layout reads `myRole` from
   `useCurrentGroup()`.

**Expected**

- Admin tab disappears because `myRole === 'member'` for `grp_b` and the
  user is not platform admin.
- If it doesn't update immediately, force a router refresh (Cmd+R). This
  is a known minor UX quirk — tab layout reads membership at mount time.
  Note in Sign-off log if seen.

---

### 7.4 [ ] Platform admin always sees admin tab

**Preconditions**

- Ignacio signed in.

**Expected**

- Admin tab visible regardless of active group (even in a group where
  Ignacio has no membership row — platform admin pin covers it).

---

## 8. Observability

`GroupService` emits structured JSON log lines. The event names below are
the exact strings in `packages/shared/src/services/group-service.ts`:

| Event                          | Emitted at                           | Source line (approx) |
|--------------------------------|--------------------------------------|----------------------|
| `group.created`                | `createGroup` success                | `:131`               |
| `invite.accepted`              | `acceptInvite` after membership add  | `:390`               |
| `ghost.claimed`                | `acceptInvite` after `tryClaim`      | `:397`               |
| `group.ownership_transferred`  | `transferOwnership` success          | `:225`               |

### 8.1 [ ] Log events during core flows

**Preconditions**

- Local: API is running via `pnpm dev:api` — `logEvent` should land in
  stdout.
- Staging: run `cd apps/api && pnpm cf:tail --env=preview` in a dedicated
  terminal (or the `cloudflare-observability` MCP against the preview
  worker).

**Steps — walk flows and grep the stream**

1. Flow 2.2 (platform admin create) → expect `group.created`.
2. Flow 3.4 or 3.5 (invite accept with new membership) → expect
   `invite.accepted` with `newMembership: true`.
3. Flow 4.2 (claim ghost during invite accept) → expect both
   `invite.accepted` and `ghost.claimed` for the same `userId`.
4. Flow 2.7 (transfer ownership) → expect `group.ownership_transferred`
   with `fromUserId` + `toUserId`.

**Expected**

- Each event is a structured JSON line (not plain text) so it can be
  queried from Cloudflare logs and filtered by `event` key.
- `invite.accepted` fires exactly once per flow, even on idempotent
  re-accepts (flow 3.6 returns `newMembership: false` — log still emitted;
  confirm behavior during walk and note it if suppression is preferred).

---

## 9. Migration reversibility (local only)

Migration scripts wired from root `package.json:14-22`:

```
pnpm migrate          # tsx scripts/migrate.ts (default: status)
pnpm migrate:up       # tsx scripts/migrate.ts up
pnpm migrate:down     # tsx scripts/migrate.ts down
pnpm migrate:status   # tsx scripts/migrate.ts status
pnpm migrate-remote:up  # against Turso (requires TURSO_* env)
```

Audit SQL:
`packages/shared/src/database/audit/verify-legacy-backfill.sql`.

### 9.1 [ ] Fresh up → audit passes

**Steps**

1. `rm -f local.db`
2. `pnpm migrate:up`
3. `sqlite3 local.db < packages/shared/src/database/audit/verify-legacy-backfill.sql`

**Expected**

- All seven checks return expected values (see section 0.4).
- Specifically: `platform admin_count = 1`, `residual_admin_count = 0`,
  `users_missing_membership = 0`, `users == memberships`,
  `legacy_group_owner = ignacioguri@gmail.com`, `settings_copied` global ==
  group.

---

### 9.2 [ ] Down twice walks back to pre-group state

**Steps**

1. `pnpm migrate:status` — note the last 3 applied migrations
   (`20260422120300-migrate-user-role`,
   `20260422120200-backfill-legacy-group`,
   `20260422120100-add-group-scoping-columns` — adjust if more landed).
2. `pnpm migrate:down` three times (rolls back the three Phase 1
   migrations). (Phase 0 tables may persist; verify with the schema dump.)
3. `sqlite3 local.db '.schema matches'` — confirm `group_id` column gone.

**Expected**

- No errors. `pnpm migrate:status` reflects the rolled-back state.

---

### 9.3 [ ] Up again → identical final state

**Steps**

1. `pnpm migrate:up`.
2. Re-run audit SQL.

**Expected**

- All checks pass identical to flow 9.1.

---

### 9.4 [ ] Role cardinality invariant

**Steps**

1. `sqlite3 local.db "SELECT role, COUNT(*) FROM user GROUP BY role;"`

**Expected**

- `platform admin | 1`
- `user | N` (all other users).
- No rows with `role='admin'` (security.ts still accepts it as a
  transitional alias — `security.ts:78-80` — but the DB must not carry
  any at rest).

---

## Appendix A — Known deferred items

These are explicitly **not** covered by this document. They belong to
Phase 5 polish or later follow-ups and are tracked elsewhere.

- **Phone-invite push notifications.** `notifyGroupInviteTarget`
  (`routes/groups.ts:300`) is fire-and-forget via
  `c.executionCtx?.waitUntil`. End-to-end delivery to Expo push tokens is
  not walked here; smoke via the Cloudflare logs only.
- **Copy-venues helper.** Planned under admin > locations (Phase 5 in the
  implementation plan). No UI to exercise yet.
- **Platform admin visibility toggle UI.** The `PATCH /api/groups/:id
  {visibility}` endpoint works (flow 2.6), but no member-facing UI surface
  exists. See [`docs/group-visibility.md`](../../group-visibility.md).
- **Public directory UI.** Waiting on `visibility='public'` to mean
  something user-visible.
- **i18n native-speaker pass for ES.** Flow 2.10 only checks keys resolve;
  copy quality review is deferred.
- **Automated `apps/api` test harness.** Part B of the parent plan.
  `bun:test` is not yet wired; `apps/api` has no `test` script.
- **CI wiring.** Even once tests exist, GitHub Actions integration is a
  follow-up.
- **Mobile-native deep-link testing.** `football-with-friends://join/<token>`
  should resolve via Expo Router; iOS / Android simulator walkthroughs are
  out of scope for this pass (web-only).
- **`match_invitations` table retirement.** Deprecated (see CLAUDE.md
  "Group-oriented Scoping" section); no active routes. Decision to drop is
  deferred.

---

## Appendix C — Bugs found during the 2026-04-23 QA pass (now fixed)

Captured here so future testers don't chase the same regressions on prior
commits.

### Bug 1 — BetterAuth `admin` plugin rejected `superadmin` role → every auth call 500'd

`apps/api/src/auth.ts` passed `admin({ adminRoles: ["admin", "superadmin"] })`
but BetterAuth 1.5.6's admin plugin validates every entry in `adminRoles`
against its `roles` config (default: `{admin, user}`); `superadmin` wasn't a
key there, so plugin init threw and every `/api/auth/*` call returned 500.
Fix: decided against the rename. Platform role reverted to `admin`;
`adminRoles` override dropped (plugin default covers it). Spec + CLAUDE.md
updated; helpers renamed `isSuperadmin → isPlatformAdmin` and
`requireSuperadmin → requirePlatformAdmin` for clarity. See
2026-04-22 design spec's post-implementation note.

### Bug 2 — CORS blocked the `X-Group-Id` round-trip on web

`apps/api/src/index.ts` + `apps/api/src/worker.ts` defined:
```
allowHeaders: ["Content-Type", "Authorization"]
exposeHeaders: ["set-auth-token"]
```
Consequences on any cross-origin deploy (localhost:8084 → localhost:3001,
Vercel → Cloudflare Workers):
- Client couldn't **send** `X-Group-Id` — preflight blocked (wasn't in
  `allowHeaders`). Every scoped request arrived without the header, so the
  server fell back to auto-picking the first membership on every call →
  group switching was silently impossible for multi-group users.
- Client couldn't **read** the server's echoed `X-Group-Id` response header
  — CORS only exposes simple response headers plus what's explicitly listed.
  `recordGroupIdFromResponse` in `packages/api-client/src/group-storage.ts`
  was a no-op on web.
Fix: both CORS configs now include `X-Group-Id` in `allowHeaders` and
`exposeHeaders`. Verified in DevTools Network: subsequent requests carry
`x-group-id: grp_legacy` and the echo is readable on the response.

### Bug 3 — Engagement-column rename migration breaks on fresh DB

`migrations/20260408130000-rename-engagement-column.ts:7` tries to rename
`last_engagement_reminder_at` to `lastEngagementReminderAt`, but the
previous migration (`20260408120000-add-notification-tracking.ts`) already
creates the column in camelCase. On any fresh env (new dev box, CI, new
staging DB) migrations fail at this step. Production works only because
the column was applied via an earlier variant of the migration that was
later rewritten. **Not fixed in this pass — scoped to a follow-up PR.**
The test harness (`apps/api/src/test/helpers/db.ts`) works around it by
inserting a matching row into `kysely_migration` so the migrator treats
it as applied.

---

## Appendix B — Sign-off log

Record a row per full or partial walkthrough. "Partial" is fine — note which
section numbers were covered.

| Date       | Tester           | Env         | Sections walked                                  | Notes                                                                 |
|------------|------------------|-------------|--------------------------------------------------|-----------------------------------------------------------------------|
| 2026-04-23 | Claude (agent)   | local       | 1.1–1.6, 2.1, 2.3–2.6, 3.1, 3.3, 3.5, 5.1/5.4/5.6, 7.1 | Bugs 1 & 2 below surfaced+fixed during walkthrough. 26 unit tests green. |
|            |                  | staging     |                                                  |                                                                       |
|            |                  | production  |                                                  |                                                                       |

Legend:
- **Env**: `local` (your dev box), `staging`
  (`https://football-api-staging.pepe-grillo-parlante.workers.dev` +
  Vercel preview), `production`.
- **Sections walked**: use the numbering above (e.g. `1.1–1.4, 5.1.a–e`).
- **Notes**: bugs filed (link the issue), flows skipped + why, any
  deviation from expected behavior.
