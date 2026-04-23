# Group Visibility

Groups carry a `visibility` field on the `groups` table:

- `private` (default) — group is invite-only; not discoverable.
- `public` — group opts in to future public discovery (directory, browse-and-request-to-join flows).

## Current state

- **DB**: `groups.visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'))`.
- **API**: `PATCH /api/groups/:id` accepts `visibility`. The field is **superadmin-gated** — only a `superadmin` can flip a group from `private` to `public` or back.
- **UI**: No member-facing toggle. The flag is settable today only by a superadmin directly against the API.

## When public discovery ships

Consumers that render or filter on `visibility` should:

1. Default to `private` semantics: members-only views, no listing in browse/search surfaces.
2. Only surface a group in public discovery UIs when `visibility === "public"`.
3. Never leak the member list, roster, or match details of a private group to non-members — the scoping middleware already enforces this; visibility is a second guard for directory endpoints.

## Changing the flag

Superadmin only:

```
PATCH /api/groups/:id
X-Group-Id: <id>
{ "visibility": "public" }
```

Non-superadmin organizers receive `403 Only superadmin can change visibility`.
