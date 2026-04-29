# Group-oriented Scoping

Every group-scoped resource (match, location, court, signup, setting, invite, roster) belongs to a group. The API binds the active group per-request and authz decisions are group-relative.

## Roles

**Platform roles** (`user.role`):
- `user` — default; no platform-level privileges.
- `admin` — full cross-group access; only one today (Ignacio). Acts as the "platform admin" escape hatch.

**Group-relative roles** (`group_members.role`):
- `member` — default; can view/join matches of the group.
- `organizer` — can manage matches, locations, courts, invites, roster for that group. Owner (see below) is always an organizer.

**Ownership**: `groups.owner_user_id` points at a single organizer member; owner is the only one who can delete the group or transfer ownership.

**Platform-admin escape hatch**: `user.role === "admin"` passes every group-gated check regardless of group membership. Do not conflate with the group-level `organizer` role on `group_members`.

## Active Group

The client sends `X-Group-Id: <groupId>` on every scoped request. `apps/api/src/middleware/group-context.ts` resolves it to a `currentGroup: { id, role, isOwner }` via `requireCurrentGroup(c)`. The mobile client persists the active id via `packages/api-client/src/group-storage.ts`; the fetch wrapper in `client.ts` injects the header automatically.

## Authz Helpers

Defined in `apps/api/src/middleware/authz.ts` — use these at the route boundary:

- `assertInCurrentGroup(c, id)` — 404 if the path `:id` doesn't match the active group (platform admin bypasses).
- `requireOrganizer(c)` / `requireOwner(c)` / `requirePlatformAdmin(c)` — return a 403 `Response` or `null`.
- `isPlatformAdmin(c)` — boolean check for field-level gating (e.g., `visibility` in PATCH /groups/:id).

## Ghost Roster

`group_roster` holds named non-users (guests added by organizers). A ghost auto-claims by phone/email when a matching user accepts an invite (`GroupService.acceptInvite`). See `docs/group-visibility.md` for the public/private group flag.

## Deprecated

`match_invitations` table + `MatchInvitationRepository` are not wired to any active route or UI (only GDPR cleanup touches the table). Treat as dead code; don't build against it.

## Observability

`GroupService` emits structured JSON logs on `group.created`, `invite.accepted`, `ghost.claimed`, `group.ownership_transferred` — picked up by Cloudflare Workers logs.
