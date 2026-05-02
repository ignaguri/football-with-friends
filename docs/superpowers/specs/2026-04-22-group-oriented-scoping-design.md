# Group-Oriented Scoping — Design Spec

**Date:** 2026-04-22
**Status:** Approved design, implemented through Phase 4.
**Companion:** [`../plans/2026-04-22-group-oriented-scoping.md`](../plans/2026-04-22-group-oriented-scoping.md)

> **Post-implementation note (2026-04-23):** The platform-role rename from
> `admin` → `superadmin` proposed below was reverted on-branch because
> BetterAuth 1.5.6's `admin` plugin validates `adminRoles` against its `roles`
> config, rejecting any value outside `defaultRoles` (`user`/`admin`). The
> cross-group escape hatch is now called **"platform admin"** (`user.role ===
"admin"`); helpers are `isPlatformAdmin(c)` / `requirePlatformAdmin(c)`.
> Group-relative `organizer` / `member` is unchanged. See `CLAUDE.md`.

## Context

Today the app is a single global namespace. Every logged-in user sees every match, every venue, every player; the only authorization dimension is a global `user.role ∈ {"user","admin"}`. This works for one friend group but blocks every next step — a second organizer can't coexist, production data leaks between cohorts, and there's no notion of "this match is in _my_ realm."

The app should become **group-oriented**: each organizer runs a closed realm of matches, venues, and players; users in group A see nothing from group B. The refactor is designed for **small private multi-tenancy at launch** (curated organizers, invite-only joining), with **forward-compatible plumbing** for an open/self-serve future.

## Decisions (from brainstorming session 2026-04-22)

| #                          | Decision                    | Chosen                                                                                                                                                                   | Rationale                                                                                                                                                                                                              |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1**                     | Tenancy vision              | **Mostly private multi-tenancy**, future-compatible with self-serve                                                                                                      | Curated launch keeps UX & trust simple; schema designed so opening up later is additive (not a rewrite).                                                                                                               |
| **Q2**                     | Membership cardinality      | **N groups per user, explicit active context**                                                                                                                           | Football reality: one person plays in work league + neighborhood + friend circle. Explicit active context (vs. merged feed) makes every query's scoping rule unambiguous.                                              |
| **Q3**                     | Player roster               | **Hybrid** — users as primary identity + organizer-managed ghost entries (claimable)                                                                                     | BetterAuth user stays the identity root (keeps auth/push/profile simple). Ghosts let organizers pre-populate rosters and track chronic no-account players. Claim by phone/email auto-match on invite accept.           |
| **Q4**                     | Roles in a group            | **Two-tier flat (organizer / member) + single owner per group.** Plus a platform `superadmin` flag on `user` (Ignacio only) for cross-tenant debug.                      | Matches how small friend groups actually delegate. Owner is only for destructive ops (delete group, transfer). Superadmin is hidden infrastructure, never shown in UI.                                                 |
| **Q5**                     | Venues (locations + courts) | **Per-group strict**, with a later helper to "copy venues from another group I also organize"                                                                            | One scoping rule everywhere (`{entity}.group_id = currentGroup`) beats a venues-are-global asymmetry that would need to be explained in every endpoint review forever. Duplicate rows are a non-problem at this scale. |
| **Q6**                     | Joining flow                | **Invite links (primary) + phone-shortcut invites**, with `visibility` flag in schema for public discovery later                                                         | Matches "curated private" launch. Schema plumbing for public directory means it ships in one PR when ready.                                                                                                            |
| **Migration**              | Existing data               | **One `Legacy` group** seeded by migration. All current data backfilled with `group_id = grp_legacy`. Current `role=admin` users become `organizer` of the legacy group. | Zero user-visible disruption. Superadmin (Ignacio) can split/rename later by hand.                                                                                                                                     |
| **Naming**                 | What to call it             | **`group`** (table `groups`, context `currentGroup`, invite URLs `/invite/<token>`)                                                                                      | Neutral, matches WhatsApp/Slack/Discord mental model. i18n-friendly (_grupo_ in ES).                                                                                                                                   |
| **Active group transport** | How the server knows        | **`X-Group-Id` header on every authed request**, persisted client-side (AsyncStorage / SecureStore). No URL slug.                                                        | Keeps URLs clean and unchanged. Stateless on the server (no session write per switch). Superadmin can set any id for debug. Invite links stay `/invite/<token>` since the token resolves to its group.                 |

## Entities & Relationships

```
                          ┌─────────┐
                          │  user   │ (BetterAuth identity; role: user|superadmin)
                          └────┬────┘
                               │
                  ┌────────────┼──────────────┐
                  │            │              │
         (membership)   (owns 0..N)    (may own ghost rows)
                  │            │              │
                  ▼            ▼              ▼
           ┌─────────────┐ ┌─────────┐  ┌───────────────┐
           │group_members│ │ groups  │  │ group_roster  │
           └─────────────┘ └────┬────┘  └───────┬───────┘
                                │               │
                   ┌────────────┼───────────────┤
                   │            │               │
                   ▼            ▼               ▼
              ┌─────────┐ ┌───────────┐  ┌──────────┐
              │ matches │ │ locations │  │ signups  │──(roster_id optional)
              └────┬────┘ └─────┬─────┘  └──────────┘
                   │            │
                   └────┬───────┘
                        │
                        ▼
                   ┌────────┐
                   │ courts │
                   └────────┘
```

Everything below `groups` is scoped by `group_id`. `user` is not (identity stays global). `group_members` is the authorization edge; `group_roster` is the "ghosts + claimed-ghosts" roster; `signups.roster_id` optionally points into it for guest-added players.

## Authorization Model

- **Every group-scoped request carries a `currentGroup` context** set by a new `groupContextMiddleware`. The middleware reads `X-Group-Id`, verifies membership, and enriches the Hono context with `{id, role, isOwner}`.
- **Role checks become group-relative**:
  - `requireMember` = implicit (middleware 403s non-members)
  - `requireOrganizer` = `currentGroup.role === 'organizer' || isSuperadmin`
  - `requireOwner` = `currentGroup.isOwner || isSuperadmin`
- **Superadmin bypasses all group scoping** and can set any `X-Group-Id` for debug. No UI exposes this.
- **`user.role` semantics are redefined**: valid values become `'user' | 'superadmin'`. During migration, every current `role='admin'` user becomes `'user'` (and gets a `group_members(role='organizer')` row in the legacy group), except Ignacio who becomes `'superadmin'`.

## Boundaries & Invariants

- **Invariant 1**: Every row in `matches`, `locations`, `courts`, `signups`, `voting_criteria`, `match_votes`, `match_player_stats`, `group_settings` has `group_id NOT NULL` after Phase 1.
- **Invariant 2**: Every API response that returns scoped data was filtered by `currentGroup.id` at the repo layer. (A repo method without a `groupId` argument is a red flag in review.)
- **Invariant 3**: `user.role = 'superadmin'` belongs to exactly one user (Ignacio) in production post-migration. Enforced by audit SQL, not the schema.
- **Invariant 4**: `groups.owner_user_id` must be a current `organizer` of the same group (enforced by service-layer transfer logic, not a DB constraint — to allow atomic ownership transfer).
- **Invariant 5**: A user in zero groups gets a friendly onboarding screen, not a crash. The API signals this with `409 {code: "NO_GROUP"}`.

## Success Criteria

- A user in Group A can log in and perform every action they can today — list matches, sign up, view stats, access admin (if organizer) — and sees **exclusively** Group A's data.
- Superadmin can switch to any group via the switcher and sees the same group-scoped view as any organizer of that group.
- An invite link opens, previews the group, and — after sign-up or sign-in — lands the user in that group with zero UX dead-ends.
- A ghost roster entry with phone `+49...` is **automatically claimed** when a user signs up with that phone, without manual intervention. Their prior signups/stats are stitched onto the claimed user.
- Cross-group access attempts (direct API calls, deep-linked match IDs) return `403/404`, never leak data.
- Migration is reversible. `up → down → up` leaves the DB identical.

## Out of Scope (Deferred)

- Public group directory UI.
- Cross-group aggregated views ("all my upcoming matches across every group").
- Billing / monetization.
- Per-group branding/theming.
- Group-level push-notification channels (notifications stay per-user; payload carries `groupId` for routing).
- Self-serve group creation by non-superadmin users (feature flag exists from day one, off until we flip it).
- Retiring the existing `match_invitations` table (audited in Phase 3; decision deferred if it's in active use).

## Open Questions to Confirm at Implementation Time

1. **Legacy group name** — default text shown to existing users post-migration. Default: "Fútbol con los pibes". Confirm before running the migration.
2. **Invite link base URL** — needs a stable public domain. Vercel web-app URL is fine. Mobile deep-link scheme `footballwithfriends://` will be registered.
3. **BetterAuth `admin` plugin compat** — verify the plugin doesn't choke on the role being renamed from `'admin'` to `'superadmin'`. If it does, keep `'admin'` as an internal alias and map it to `superadmin` semantics in middleware.

## References

- Implementation plan with per-phase checklists: [`../plans/2026-04-22-group-oriented-scoping.md`](../plans/2026-04-22-group-oriented-scoping.md)
- Existing patterns / codebase conventions: root `CLAUDE.md`, [`../../accessibility-and-test-ids.md`](../../accessibility-and-test-ids.md)
- Related docs: [`../../phone-auth-password-as-otp.md`](../../phone-auth-password-as-otp.md) (phone auth mechanism relevant to phone-shortcut invites in Phase 5)
