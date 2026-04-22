# Group-Oriented Scoping — Implementation Plan

**Date:** 2026-04-22
**Status:** Ready to start Phase 0
**Design spec:** [`../specs/2026-04-22-group-oriented-scoping-design.md`](../specs/2026-04-22-group-oriented-scoping-design.md)

> **How to use this document.** Each phase below is a coherent deliverable that should land as its own PR (or a small sequence of PRs). Tick checkboxes as work lands. Do not move to the next phase until the **Verification Gate** at the end of the current phase passes. If work inside a phase forces a design change, update the spec doc first, then adjust this checklist.

---

## Progress Dashboard

- [x] **Phase 0** — Schema foundation (no behavior change)
- [ ] **Phase 1** — Backfill + tightening (scoping turns on under the hood)
- [ ] **Phase 2** — Group management API + mobile-web switcher
- [ ] **Phase 3** — Invites (link + accept flow)
- [ ] **Phase 4** — Ghost roster (full lifecycle + legacy guest conversion)
- [ ] **Phase 5** — Polish (phone invites, copy-venues helper, public-directory flag, i18n pass)

---

## Data Model Reference (target shape)

### New tables

```sql
-- groups
id TEXT PK
name TEXT NOT NULL
slug TEXT UNIQUE
owner_user_id TEXT NOT NULL REFERENCES user(id)
visibility TEXT CHECK IN ('private','public') DEFAULT 'private'
created_at, updated_at

-- group_members
id TEXT PK
group_id TEXT REFERENCES groups(id) ON DELETE CASCADE
user_id TEXT REFERENCES user(id) ON DELETE CASCADE
role TEXT CHECK IN ('organizer','member')
joined_at
UNIQUE (group_id, user_id)

-- group_invites
id TEXT PK
group_id TEXT REFERENCES groups(id) ON DELETE CASCADE
token TEXT UNIQUE NOT NULL        -- opaque, 24-char URL-safe
created_by_user_id TEXT REFERENCES user(id)
expires_at INT NULL
max_uses INT NULL
uses_count INT DEFAULT 0
target_phone TEXT NULL            -- phone-shortcut invite
target_user_id TEXT NULL REFERENCES user(id)
revoked_at INT NULL
created_at

-- group_roster (ghosts + claimed)
id TEXT PK
group_id TEXT REFERENCES groups(id) ON DELETE CASCADE
display_name TEXT NOT NULL
phone TEXT NULL (indexed)         -- for auto-claim
email TEXT NULL (indexed)         -- for auto-claim
claimed_by_user_id TEXT NULL REFERENCES user(id)
created_by_user_id TEXT REFERENCES user(id)
created_at, updated_at

-- group_settings
id TEXT PK
group_id TEXT UNIQUE REFERENCES groups(id) ON DELETE CASCADE
-- + all columns currently in `settings`
```

### New columns on existing tables

- `matches.group_id` (FK, NOT NULL after backfill)
- `locations.group_id` (FK, NOT NULL after backfill)
- `courts.group_id` (FK, NOT NULL after backfill — denormalized from location)
- `signups.group_id` (FK, NOT NULL after backfill — denormalized from match)
- `signups.roster_id` (FK group_roster.id, NULL)
- `voting_criteria.group_id` (FK, NOT NULL after backfill)
- `match_votes.group_id` (FK, NOT NULL after backfill)
- `match_player_stats.group_id` (FK, NOT NULL after backfill)

### Semantic changes

- `user.role`: `'user' | 'admin'` → `'user' | 'superadmin'`. Post-migration: only Ignacio is `superadmin`.
- `settings` (global) → replaced by `group_settings` keyed by `group_id`.

---

# Phase 0 — Schema Foundation

**Goal:** Land the new tables and nullable columns. Zero behavior change.

**Deliverable:** A single PR with additive migrations only. App runs as before.

### Subtasks

- [x] Write migration `migrations/20260422120000-create-group-tables.ts` (collapses the planned "create-groups-tables" + "create-group-settings-table" into one file, since they're all new tables with no existing data):
  - [x] Create `groups` with owner FK to `user(id)`, `visibility` CHECK constraint, soft-delete column, and indexes on `owner_user_id` + partial index on `visibility WHERE deleted_at IS NULL`.
  - [x] Create `group_members` with `UNIQUE(group_id, user_id)` and indexes on `user_id` and `(group_id, role)`.
  - [x] Create `group_invites` with `UNIQUE(token)` and indexes on `(group_id, revoked_at)` + partial index on `target_user_id`.
  - [x] Create `group_roster` with partial indexes on `(group_id, phone) WHERE phone IS NOT NULL` and `(group_id, email) WHERE email IS NOT NULL` for auto-claim lookups, plus partial index on `claimed_by_user_id`.
  - [x] Create `group_settings` with composite PK `(group_id, key)`, EAV shape matching the existing global `settings` table.
  - [x] Implement `down` that drops tables in reverse FK order.
- [x] Write migration `migrations/20260422120100-add-group-scoping-columns.ts`:
  - [x] Add nullable `group_id TEXT` to `matches`, `locations`, `courts`, `signups`, `voting_criteria`, `match_votes`, `match_player_stats`.
  - [x] Add nullable `roster_id TEXT` to `signups`.
  - [x] Create `idx_<table>_group_id` on each scoped table + `idx_signups_roster_id`.
  - [x] FK constraints NOT added — SQLite can't add FKs via ALTER; enforced at app layer (matches how `courts` migration handled `matches.court_id`).
  - [x] `down` drops columns + indexes (uses raw SQL `DROP INDEX` since SQLite rejects Kysely's `dropIndex().on(table)` syntax — verified in rollback test).
- [x] Extend `packages/shared/src/database/schema.ts`:
  - [x] Add `GroupsTable`, `GroupMembersTable`, `GroupInvitesTable`, `GroupRosterTable`, `GroupSettingsTable` interfaces.
  - [x] Add nullable `group_id: string | null` to `MatchesTable`, `LocationsTable`, `CourtsTable`, `SignupsTable`, `VotingCriteriaTable`, `MatchVotesTable`, `MatchPlayerStatsTable`.
  - [x] Add nullable `roster_id: string | null` to `SignupsTable`.
  - [x] Register new tables in `Database` interface.
  - [x] Export `Selectable`/`Insertable`/`Updateable` helpers for each new table.
- [x] Extend `packages/shared/src/domain/types.ts`:
  - [x] Add `Group`, `GroupMember`, `GroupInvite`, `GroupRoster`, `GroupInvitePreview` types.
  - [x] Add `MEMBER_ROLES` const + `MemberRole` type, `GROUP_VISIBILITIES` const + `GroupVisibility` type.
  - [x] Add DTOs: `CreateGroupData`, `UpdateGroupData`, `CreateGroupInviteData`, `CreateGroupRosterData`, `UpdateGroupRosterData`.
  - [x] Add filter types: `GroupMemberFilters`, `GroupRosterFilters`.
  - [x] `User.role` left untouched (Phase 1 renames it).
- [x] Add repo skeletons in `packages/shared/src/repositories/group-repositories.ts` (single new file, not bloating `turso-repositories.ts`):
  - [x] `TursoGroupRepository` — create, findById, findBySlug, listByUserId, update, softDelete, transferOwnership.
  - [x] `TursoGroupMembershipRepository` — find, listByGroup, add, updateRole, remove.
  - [x] `TursoGroupInviteRepository` — create, findByToken, listActiveByGroup, incrementUsesCount, revoke.
  - [x] `TursoGroupRosterRepository` — create, listByGroup, findByGroupAndPhone, findByGroupAndEmail, update, delete.
  - [x] `TursoGroupSettingsRepository` — getAll, get, set (with UPSERT).
  - [x] Exported from `packages/shared/src/repositories/index.ts` for consumers. NOT wired into `factory.ts` yet — Phase 2 will define interfaces and register them.
- [x] `pnpm migrate:up` — both migrations apply cleanly on local SQLite.
- [x] `pnpm typecheck` — passes across all workspaces (shared, api-client, ui, api, mobile-web).

### Verification Gate

- [x] `pnpm migrate:up` applied both migrations successfully.
- [x] `pnpm migrate:down && pnpm migrate:down` rolled both back without error.
- [x] `pnpm migrate:up` re-applied both — full `up → down → down → up` reversibility confirmed.
- [x] `pnpm typecheck` green.
- [x] SQL-level spot-check: all 5 new tables + 16 new indexes present after up; all scoped tables have nullable `group_id` column; no rows mutated in existing tables.
- [ ] Manual smoke (user-side, before/after this PR merges): sign in, list matches, create match as admin — behavior identical to pre-PR. *(Deferred to PR review; all new columns are nullable so existing queries continue to work unchanged.)*
- [ ] `pnpm lint` — ran but tripped a Node V8 OOM crash during `eslint -f json .` (pre-existing tooling issue, unrelated to Phase 0 code). Investigate / run per-package lint before merging.

---

# Phase 1 — Backfill + Scoping (the big cut-over)

**Goal:** Create the Legacy group, backfill all existing rows, tighten columns to NOT NULL, and flip authorization from global `role=admin` to group-relative organizer checks. After this phase, the app is functionally identical to users but group-aware underneath.

**Deliverable:** One carefully-staged PR (or a tight sequence). This is the riskiest phase — the verification gate is strict.

### Subtasks — Migrations

- [x] Write migration `migrations/20260422120200-backfill-legacy-group.ts`:
  - [x] Look up Ignacio's user id by email `ignacioguri@gmail.com`. **Fail the migration if not found** (do not fall back silently — this is a fatal misconfig).
  - [x] Insert one row into `groups`: `id='grp_legacy'`, `name='Fútbol con los pibes'`, `slug='legacy'`, `owner_user_id=<Ignacio>`, `visibility='private'`.
  - [x] For every row in `user`: insert `group_members` with `role='organizer'` iff `user.role='admin'`, else `role='member'`.
  - [x] `UPDATE matches SET group_id='grp_legacy' WHERE group_id IS NULL`.
  - [x] Same for `locations`, `courts`, `signups`, `voting_criteria`, `match_votes`, `match_player_stats`.
  - [x] Copy every row of `settings` into `group_settings` with `group_id='grp_legacy'`.
  - [x] `down` reverses by nullifying all group_id columns, deleting `group_settings` rows, deleting `group_members` rows, deleting the legacy group.
- [ ] ~~Write migration `<ts>-tighten-group-id-not-null.ts`~~ **DEFERRED** — SQLite doesn't support `ALTER COLUMN … SET NOT NULL`; the only path is a full table rebuild for each of the 7 tables, which is disproportionately risky for the guarantee it provides. Enforcement moves up a layer:
  - Kysely schema types (`packages/shared/src/database/schema.ts`) will tighten `group_id` to `string` (non-null) once repos thread it through (see "Thread groupId through repos").
  - Every repo read/write method takes a required `groupId: string` parameter. A row can only land in the DB with `group_id = currentGroup.id`, so new rows can never be NULL at rest.
  - Revisit post-launch if we ever observe drift (e.g. in an analytics export) — that's when the table rebuild becomes worth the risk.
- [x] Write migration `migrations/20260422120300-migrate-user-role.ts`:
  - [x] `UPDATE user SET role='user' WHERE role='admin' AND email != 'ignacioguri@gmail.com'`.
  - [x] `UPDATE user SET role='superadmin' WHERE email='ignacioguri@gmail.com'`.
  - [x] Runtime guard: migration throws if `superadmin_count != 1` after running.
  - [x] `down` re-elevates anyone whose `group_members.role='organizer' AND group_id='grp_legacy'` back to `'admin'` — reconstructs the pre-migration admin set.
- [x] Migration-audit SQL script at `packages/shared/src/database/audit/verify-legacy-backfill.sql`:
  - [x] Asserts zero unscoped rows on every scoped table.
  - [x] Asserts exactly 1 superadmin and 0 residual `'admin'` users.
  - [x] Asserts `group_members where group_id='grp_legacy'` count equals `user` count.
  - [x] Spot-checks legacy group owner and settings copy count. Verified locally: all checks pass.

### Subtasks — Auth middleware

- [ ] Extend `AppVariables` in `apps/api/src/middleware/security.ts`:
  - [ ] Narrow `SessionUser.role` type to `'user' | 'superadmin'` (treat `'admin'` as alias-for-superadmin internally if BetterAuth still emits it).
  - [ ] Add `currentGroup?: { id: string; role: MemberRole; isOwner: boolean }`.
  - [ ] Add `isSuperadmin: boolean` convenience.
- [ ] Create `apps/api/src/middleware/group-context.ts`:
  - [ ] Export `groupContextMiddleware`. Reads `X-Group-Id` header. Validates membership via `GroupMembershipRepository.find(groupId, userId)`. Sets `currentGroup` in ctx. If header missing, picks user's oldest-joined group and echoes the chosen id in the response header `X-Group-Id` so clients sync.
  - [ ] If user has zero groups, return `409 {code: "NO_GROUP"}`.
  - [ ] Superadmin with explicit `X-Group-Id` → trust it (but still validate the group exists); set `role='organizer'`, `isOwner=true` for ergonomic downstream checks.
- [ ] Create `apps/api/src/middleware/authz.ts`:
  - [ ] `requireOrganizer(c)` → throws HTTPException 403 if not organizer and not superadmin.
  - [ ] `requireOwner(c)` → throws 403 if not owner and not superadmin.
  - [ ] `requireMember(c)` → no-op (middleware already enforced); export for explicit call-site clarity.

### Subtasks — Wire middleware & replace checks

- [ ] In `apps/api/src/index.ts` (or wherever routers are mounted), wire `groupContextMiddleware` on the group-scoped router namespace (everything under `/api` except `/api/auth/*`, `/api/phone-auth/*`, `/api/invites/*`, `/api/matches/:id/preview`, `/api/profile/picture/:key`, `/health`, `/api/cron/*`, `/api/groups/me`).
- [ ] In every route file below, replace `user.role !== "admin"` checks with `requireOrganizer(c)` and thread `c.var.currentGroup.id` into every repo call:
  - [ ] `apps/api/src/routes/matches.ts`
  - [ ] `apps/api/src/routes/locations.ts`
  - [ ] `apps/api/src/routes/courts.ts`
  - [ ] `apps/api/src/routes/players.ts`
  - [ ] `apps/api/src/routes/voting.ts`
  - [ ] `apps/api/src/routes/rankings.ts`
  - [ ] `apps/api/src/routes/settings.ts` — reads/writes via `group_settings` now, keyed by `currentGroup.id`.
  - [ ] `apps/api/src/routes/match-media.ts`
  - [ ] `apps/api/src/routes/notifications.ts`
- [ ] In `packages/shared/src/repositories/turso-repositories.ts`, add a **required** `groupId: string` argument to every list/read/write method on:
  - [ ] `MatchRepository` (findAll, findById, create, update, delete)
  - [ ] `LocationRepository`
  - [ ] `CourtRepository`
  - [ ] `SignupRepository`
  - [ ] `VotingRepository`
  - [ ] `StatsRepository`
  - [ ] `GroupSettingsRepository`
- [ ] Every query body now includes `AND group_id = ?` (or equivalent via Kysely).
- [ ] Service layer (`packages/shared/src/services/match-service.ts` etc.) threads `groupId` through from the route handler.

### Subtasks — Client

- [ ] In `packages/api-client/src/client.ts`, add a request interceptor that appends `X-Group-Id` from persisted state (AsyncStorage on web, SecureStore on mobile). Persistence layer: new `packages/api-client/src/group-storage.ts` with `getActiveGroupId()` / `setActiveGroupId(id)`.
- [ ] On first launch post-migration, client has no persisted id → omits the header → server picks legacy group → echoes `X-Group-Id` back → client persists it. Verify this round-trip.

### Subtasks — Tests

- [ ] `apps/api/src/test/middleware/group-context.test.ts`:
  - [ ] Header absent → picks first group, echoes header back.
  - [ ] Header present + user is member → currentGroup set correctly.
  - [ ] Header present + user is NOT member + not superadmin → 403.
  - [ ] User in zero groups → 409 `NO_GROUP`.
  - [ ] Superadmin with explicit header → trusted.
- [ ] `apps/api/src/test/routes/matches-scoped.test.ts`:
  - [ ] User in group A cannot read a match from group B by id (404, not 403, to avoid id-existence leakage).
  - [ ] User in group A listing matches returns zero group B matches.
- [ ] Parameterized cross-group leak test across every scoped endpoint.

### Verification Gate

- [ ] Run migration-audit SQL on local DB — all assertions pass.
- [ ] Run `pnpm migrate-remote:up` against **staging** Turso; run audit SQL remotely; then `down`; then `up` again. Reversibility confirmed.
- [ ] Manual smoke on staging: sign in as a pre-migration admin → sees same matches as before, still can CRUD; sign in as a regular user → sees same matches as before.
- [ ] Create a second test group via direct SQL with one test user; confirm they 403/404 trying to access legacy group resources.
- [ ] All new tests green.
- [ ] Logs clean (no warnings about missing `currentGroup`).

---

# Phase 2 — Group Management API + Mobile-Web Switcher

**Goal:** Users with ≥2 groups can switch between them; superadmin can create new groups and manage membership.

**Deliverable:** Group CRUD API, member management API, mobile-web switcher + "My Groups" screen + superadmin "Create Group" flow.

### Subtasks — API (`apps/api/src/routes/groups.ts`)

- [ ] Create the route file. Mount under `/api/groups` in `apps/api/src/index.ts`. Only `GET /api/groups/me` is OUTSIDE `groupContextMiddleware` (it's the endpoint that powers the switcher itself).
- [ ] `GET /api/groups/me` → list my groups with my role in each. Used by the switcher; no `X-Group-Id` needed.
- [ ] `POST /api/groups` → create a new group. **Superadmin only at launch** (feature-flagged: `allowUserCreateGroups` setting, default `false`). Body: `{name}`. Sets caller as owner + organizer.
- [ ] `GET /api/groups/:id` → group details, members list, settings. Organizer can see everything; member sees name + their own role only.
- [ ] `PATCH /api/groups/:id` → update name/settings. `requireOrganizer`.
- [ ] `DELETE /api/groups/:id` → soft-delete. `requireOwner`.
- [ ] `GET /api/groups/:id/members` → full roster of users. `requireOrganizer`.
- [ ] `PATCH /api/groups/:id/members/:userId` → promote/demote. `requireOwner` only.
- [ ] `DELETE /api/groups/:id/members/:userId` → kick. `requireOrganizer`. Cannot kick the owner.
- [ ] `POST /api/groups/:id/leave` → self-leave. Non-owner only (owner must transfer first).
- [ ] `POST /api/groups/:id/transfer-ownership` → `requireOwner`. Target must be an existing organizer.

### Subtasks — Service layer

- [ ] `packages/shared/src/services/group-service.ts`:
  - [ ] `createGroup({ownerUserId, name})` — transactional: insert group, insert organizer membership.
  - [ ] `transferOwnership({groupId, fromUserId, toUserId})` — guards: `fromUserId` is current owner, `toUserId` is existing organizer.
  - [ ] `leaveGroup({groupId, userId})` — guard: not owner.
  - [ ] `deleteGroup({groupId, userId})` — guard: owner. Soft-delete (set `deleted_at` column if schema supports; else hard-delete with CASCADE).

### Subtasks — Client hooks (`packages/api-client/src/groups.ts`)

- [ ] `useMyGroups()` — wraps `GET /api/groups/me`.
- [ ] `useCurrentGroup()` — exposes `{groupId, setGroupId, myGroups, isLoading, noGroup: boolean}`. `setGroupId` persists via `group-storage.ts` and invalidates every React Query cache entry (use `queryClient.invalidateQueries()` with a `groupId` dimension in query keys, see below).
- [ ] `useGroup(groupId)` — details.
- [ ] `useGroupMembers(groupId)`.
- [ ] `useCreateGroup()`, `useUpdateGroup()`, `useDeleteGroup()`, `usePromoteMember()`, `useKickMember()`, `useLeaveGroup()`, `useTransferOwnership()`.
- [ ] Update the React Query convention: every scoped query key includes `currentGroup.id` so switching invalidates correctly. E.g. `['matches', groupId, tab]`.

### Subtasks — Mobile-Web UX

- [ ] `apps/mobile-web/app/(tabs)/_layout.tsx`:
  - [ ] Add a header group switcher component (only rendered when `myGroups.length >= 2`). Shows `currentGroup.name` + chevron; tap opens bottom sheet with group list.
  - [ ] Swap admin-tab visibility check from `user.role === "admin"` to `currentGroup.role === "organizer"`.
- [ ] New screen `apps/mobile-web/app/(tabs)/profile/groups/index.tsx` — "My Groups" list, entry point from profile.
- [ ] New screen `apps/mobile-web/app/(tabs)/profile/groups/[groupId].tsx` — group detail (members, settings, invite management placeholder for Phase 3).
- [ ] New screen `apps/mobile-web/app/(tabs)/admin/create-group.tsx` — superadmin-only (hidden behind a `useIsSuperadmin()` hook).
- [ ] Verify match/admin screens work — most should need no direct change, only verify `queryKey` includes `groupId`.
- [ ] "No group yet" screen if `useCurrentGroup().noGroup`: message + CTA to paste an invite link (placeholder; real handler lands in Phase 3).

### Subtasks — i18n

- [ ] Add keys to `apps/mobile-web/locales/en/common.json` and `.../es/common.json`:
  - [ ] `groups.switcher.label`, `groups.switcher.empty`
  - [ ] `groups.myGroups.title`, `groups.myGroups.empty`
  - [ ] `groups.create.title`, `groups.create.cta`, `groups.create.success`
  - [ ] `groups.detail.members`, `groups.detail.settings`, `groups.detail.leave`, `groups.detail.transfer`, `groups.detail.delete`
  - [ ] `groups.members.promote`, `groups.members.demote`, `groups.members.kick`
  - [ ] `groups.noGroup.title`, `groups.noGroup.body`

### Verification Gate

- [ ] New tests green: group-service unit tests (create, transfer, leave, delete guards), groups-routes integration tests.
- [ ] Manual: as superadmin, create a second group, switch to it, confirm empty matches list; switch back to legacy, see legacy matches.
- [ ] Manual: as a regular member of legacy, confirm switcher is hidden (they're only in 1 group) and admin tab is hidden.
- [ ] Promote a test user to organizer → admin tab appears for them after refresh.
- [ ] Kick a user → their next request to a scoped endpoint for that group returns 403.

---

# Phase 3 — Invites

**Goal:** Organizers invite new members via shareable links. Invites resolve to a preview, then (post-auth) to group membership — optionally auto-claiming a ghost roster entry.

**Deliverable:** Invite generation UI + deep-link acceptance flow on web & mobile.

### Subtasks — API (`apps/api/src/routes/invites.ts` + extensions to `groups.ts`)

- [ ] `POST /api/groups/:id/invites` → create invite. `requireOrganizer`. Body: `{expiresInHours?, maxUses?, targetPhone?, targetUserId?}`. Generates a 24-char URL-safe token (use the existing crypto RNG from `apps/api/src/crypto/password.ts`).
- [ ] `GET /api/groups/:id/invites` → list active invites. `requireOrganizer`.
- [ ] `DELETE /api/groups/:id/invites/:inviteId` → revoke. `requireOrganizer`.
- [ ] `GET /api/invites/:token` — **PUBLIC** (no auth, no group context). Returns invite preview: `{group: {name}, inviter: {name}, expiresAt, valid: boolean, reason?: 'expired'|'revoked'|'exhausted'}`.
- [ ] `POST /api/invites/:token/accept` — **authed** but no group context required. Validates invite → creates `group_members` row (ignores duplicate if already member) → attempts ghost auto-claim by user's phone and email.
- [ ] Add `/api/invites/:token*` to PUBLIC_ROUTES regex in `apps/api/src/middleware/security.ts` for the GET only; accept POST requires a session.

### Subtasks — Ghost auto-claim hook

- [ ] In `group-service.ts`, add `acceptInvite({token, userId})`:
  - [ ] Load invite; validate (not revoked, not expired, uses_count < max_uses, target_phone/user_id matches if set).
  - [ ] Create membership (upsert).
  - [ ] Increment `uses_count`.
  - [ ] Query `group_roster` for rows in this group with `phone = user.phone` OR `email = user.email` AND `claimed_by_user_id IS NULL`. If exactly one match → set `claimed_by_user_id = userId`. If multiple matches → log for organizer review (don't guess).
- [ ] Expose result `{joined: true, claimedRosterId?: string}` so the client can show a toast "Your history is now linked."

### Subtasks — Mobile-Web UX

- [ ] New screen `apps/mobile-web/app/(auth)/join/[token].tsx`:
  - [ ] On mount, call `GET /api/invites/:token` (unauthenticated). Render preview card.
  - [ ] If invalid → error state with clear message.
  - [ ] If user is not signed in → CTA "Sign up to join" / "Already have an account? Sign in" — both flows preserve the token via a `redirectTo` query param so post-auth we return to the accept screen.
  - [ ] If signed in → call `POST /api/invites/:token/accept` → on success, set active group to the joined one, navigate to `/(tabs)/matches`.
- [ ] In the group detail screen (Phase 2), add an "Invites" section for organizers: list active invites, "Create invite link" button, copy-to-clipboard, revoke.
- [ ] Web: register the route. Mobile: add `footballwithfriends://join/<token>` scheme in `apps/mobile-web/app.config.ts`; test cold-start deep-link.
- [ ] i18n: `groups.invite.*` keys (create, copy, revoke, expires, valid, invalid, expired, joined, claimedHistory).

### Subtasks — Tests

- [ ] Invite creation: organizer can create, member gets 403, expired invite is unusable, max_uses enforced.
- [ ] Invite accept: user added to group, duplicate accept is idempotent, phone-match ghost is claimed exactly once, multi-match ghost is not guessed.
- [ ] E2E (Chrome DevTools MCP): organizer creates invite → open in fresh session → sign up → land in group with zero matches from other groups.

### Verification Gate

- [ ] A brand-new user can go from invite link → sign up → inside the group, seeing only that group's data.
- [ ] A user who exists in another group (say legacy) can accept an invite to a second group and then use the switcher to navigate between them.
- [ ] A ghost with phone `+49XXXXXX` is auto-claimed when the user signs up with that phone.
- [ ] Revoked invite returns `valid: false` with reason `'revoked'`.

---

# Phase 4 — Ghost Roster (full lifecycle)

**Goal:** Organizers can manage a roster of player profiles (ghosts) that may be linked to real users. Legacy guest-signup data is converted to ghosts in the legacy group.

**Deliverable:** Admin roster UI + CRUD API + legacy guest conversion migration.

### Subtasks — API

- [ ] `GET /api/groups/:id/roster` → organizer: list all roster entries (ghosts + claimed). Includes `claimed_by_user_id`, joined user profile if claimed.
- [ ] `POST /api/groups/:id/roster` → create ghost entry. Body: `{displayName, phone?, email?}`. Reject if a user with that phone/email is already a member (suggest inviting them instead).
- [ ] `PATCH /api/groups/:id/roster/:rosterId` → update. Organizer can also `claimed_by_user_id` to manually link.
- [ ] `DELETE /api/groups/:id/roster/:rosterId` → remove. Reject if any `signups` still reference it (either cascade-delete those signups, or force-unlink — confirm policy in PR review).
- [ ] Update `signups` creation flow: when organizer adds a guest to a match (existing `POST /api/matches/:id/guest`), require `rosterId` instead of free-text `player_name`. Add a shortcut: if request has `player_name` but no `rosterId`, auto-create a ghost in the current group (transactional).

### Subtasks — Legacy guest conversion migration

- [ ] Write `<ts>-convert-legacy-guests-to-ghosts.ts`:
  - [ ] For every unique `(guest_owner_id, player_name)` in `signups` where `user_id IS NULL`:
    - [ ] Insert a `group_roster` row in `grp_legacy`: `display_name=player_name`, `created_by_user_id=guest_owner_id`.
    - [ ] Update all matching `signups` rows to set `roster_id` to the new ghost entry id.
  - [ ] Keep `guest_owner_id` column as audit (do NOT drop). Mark it as legacy in a comment.
- [ ] Audit SQL: `SELECT COUNT(*) FROM signups WHERE user_id IS NULL AND roster_id IS NULL` must be 0.

### Subtasks — Mobile-Web UX

- [ ] New tab under admin: `apps/mobile-web/app/(tabs)/admin/roster.tsx`.
  - [ ] List of roster entries with claimed/unclaimed badge.
  - [ ] "Add ghost" form (name + optional phone/email).
  - [ ] Tap row → edit / delete.
  - [ ] For unclaimed ghosts: "Link to existing member" picker (search members by name).
- [ ] Update the existing "Add guest to match" UI to pick from the group's roster OR add-and-add-to-roster in one step.
- [ ] i18n: `groups.roster.*`.

### Subtasks — Tests

- [ ] Ghost CRUD routes: organizer-only, scoped to currentGroup.
- [ ] Auto-claim on invite accept (already tested in Phase 3; extend with legacy-migration data).
- [ ] Manual linking: admin can link a ghost to a member; existing signups under that ghost now attribute to the member.
- [ ] Migration: legacy guest-signups are all converted; counts match pre vs. post.

### Verification Gate

- [ ] On staging, every legacy guest signup has a `roster_id`.
- [ ] Creating a new match and adding a guest goes through the roster flow.
- [ ] A ghost with known phone auto-claims on invite acceptance.
- [ ] Reporting / stats attribute correctly to the claimed user post-claim.

---

# Phase 5 — Polish

**Goal:** Smooth edges and ship the small-but-nice features from Q5/Q6.

### Subtasks

- [ ] **Phone-shortcut invite**: In the invite creation form, allow entering a phone number. If that phone matches an existing user, send an in-app notification via the existing push mechanism; always return the shareable link for manual sharing.
- [ ] **Copy-venues helper**: Under admin > locations, add a "Copy from another group" action. List groups where caller is `organizer`; upon selection, duplicate all location/court rows into the current group (fresh ids, `group_id = currentGroup.id`).
- [ ] **Public visibility flag**: Expose a superadmin-only toggle on `PATCH /api/groups/:id` for `visibility`. Surface nothing in the member-facing UI yet. Document internal expectations for when public discovery UI ships.
- [ ] **i18n pass**: Native-speaker review of EN/ES strings added across Phases 2–4.
- [ ] **Empty states & error states**: 0-groups onboarding screen, invalid-invite screen, expired-invite screen, revoked-invite screen — all illustrated or at least well-copy'd.
- [ ] **Documentation**:
  - [ ] Update root `CLAUDE.md` with the new auth model (group-relative roles, superadmin).
  - [ ] Update `docs/phone-auth-password-as-otp.md` to note phone-invite interaction.
  - [ ] Retire or reference `match_invitations` — decide and document.
- [ ] **Observability**: Add structured logs on key events (`group.created`, `invite.accepted`, `ghost.claimed`, `group.ownership_transferred`). Wire them into the existing Cloudflare Workers logs.

### Verification Gate

- [ ] Phone invite: creating one with a known user's phone triggers their notification; link still works manually.
- [ ] Copy-venues: destination group gains the source group's venues without mutating the source.
- [ ] Public flag: superadmin toggles it on; no UI change visible; flag is persisted and returned via API.
- [ ] i18n: a full walkthrough in ES has no English strings leaking.
- [ ] Docs: a new engineer can read the docs and understand the group model without this spec's help.

---

## Critical Files Index

### API
- `apps/api/src/middleware/security.ts` — extend `AppVariables`, public route allowlist
- `apps/api/src/middleware/group-context.ts` — **new**
- `apps/api/src/middleware/authz.ts` — **new**
- `apps/api/src/routes/groups.ts` — **new**
- `apps/api/src/routes/invites.ts` — **new**
- `apps/api/src/routes/matches.ts` — replace admin checks, thread groupId
- `apps/api/src/routes/locations.ts` — same
- `apps/api/src/routes/courts.ts` — same
- `apps/api/src/routes/players.ts` — same
- `apps/api/src/routes/voting.ts` — same
- `apps/api/src/routes/rankings.ts` — same
- `apps/api/src/routes/settings.ts` — same, plus move to `group_settings`
- `apps/api/src/routes/match-media.ts` — same
- `apps/api/src/routes/notifications.ts` — same
- `apps/api/src/index.ts` — mount new routers

### Shared
- `packages/shared/src/domain/types.ts` — add Group, GroupMember, GroupInvite, GroupRoster, GroupSettings types
- `packages/shared/src/repositories/turso-repositories.ts` — new repos + thread groupId through existing ones
- `packages/shared/src/services/group-service.ts` — **new**
- `packages/shared/src/services/match-service.ts` — accept groupId in signatures
- `packages/shared/src/database/migrations/` — 6 new migrations (Phase 0 & 1), 1 more in Phase 4
- `packages/shared/src/database/audit/verify-legacy-backfill.sql` — **new**

### Client
- `packages/api-client/src/client.ts` — add X-Group-Id interceptor
- `packages/api-client/src/group-storage.ts` — **new**
- `packages/api-client/src/groups.ts` — **new** hooks

### Mobile-Web
- `apps/mobile-web/app/(tabs)/_layout.tsx` — switcher + admin-tab visibility swap
- `apps/mobile-web/app/(tabs)/profile/groups/index.tsx` — **new**
- `apps/mobile-web/app/(tabs)/profile/groups/[groupId].tsx` — **new**
- `apps/mobile-web/app/(auth)/join/[token].tsx` — **new**
- `apps/mobile-web/app/(tabs)/admin/roster.tsx` — **new**
- `apps/mobile-web/app/(tabs)/admin/create-group.tsx` — **new**
- `apps/mobile-web/app/(tabs)/admin/*` — verify queryKeys include groupId
- `apps/mobile-web/app.config.ts` — register `footballwithfriends://join/:token` deep link
- `apps/mobile-web/locales/en/common.json` + `.../es/common.json` — new keys

## Reusable Utilities (do not duplicate)

- `packages/shared/src/utils/timezone.ts` — keep using; no changes.
- `apps/api/src/crypto/password.ts` — crypto RNG already in place; use it for invite token generation.
- BetterAuth `admin` plugin — stays mounted; semantics of its `role` field are repurposed (see Phase 1 role migration).
- Existing `match_invitations` table — keep for match-level invitations if in active use; audit & decide in Phase 3.
- `packages/shared/src/domain/*` constants (`MATCH_STATUSES` etc.) — continue to be the source of truth for enum-like values; add `MEMBER_ROLES`, `GROUP_VISIBILITIES` here (not inline).

## Verification (cross-phase)

**Unit / Integration (API):**
- Group-context middleware: all five scenarios above.
- Cross-group leak: parameterized test hitting every scoped endpoint with a wrong-group user.
- Ghost auto-claim: exact-one-match claims, multi-match doesn't guess.

**E2E (Chrome DevTools MCP — web):**
- Sign in as single-group user → only A's matches.
- Superadmin → switch to arbitrary group.
- Invite flow end-to-end.
- Ghost-claim end-to-end.

**Mobile (iOS sim / Android emu MCP):**
- Switcher only shows with ≥2 groups.
- Deep link `footballwithfriends://join/<token>` on cold-start and warm-state.
- Active group persists across app relaunches.

**Migration:**
- `pnpm migrate-remote:up` on staging → audit SQL passes.
- Full `up → down → up` reversibility.
- Post-migration smoke: no UX regression for any pre-existing user.
- `SELECT role, COUNT(*) FROM user GROUP BY role` → exactly one `superadmin`, rest `user`.

## Open Questions to Settle in the First PR

1. Confirm legacy group name before migration ("Fútbol con los pibes" suggested default).
2. Choose + register the invite link base URL (web domain) and mobile scheme.
3. Verify BetterAuth `admin` plugin accepts `'superadmin'` as a role value, or keep `'admin'` as an internal alias.
4. Decide whether `match_invitations` is retired or retained — requires checking active usage.
