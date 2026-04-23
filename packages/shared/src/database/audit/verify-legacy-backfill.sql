-- Post-migration audit for the group-oriented scoping refactor (Phase 1).
-- Run against Turso (local or staging) after the three Phase 1 migrations:
--   20260422120200-backfill-legacy-group
--   20260422120300-migrate-user-role
--
-- Every SELECT below should return 0 (or the expected value noted in the
-- comment). Non-zero results mean the migration left something unscoped.

-- 1. No unscoped rows on any scoped table.
SELECT 'matches_unscoped' AS check_name, COUNT(*) AS offending_rows
FROM matches WHERE group_id IS NULL
UNION ALL
SELECT 'locations_unscoped', COUNT(*) FROM locations WHERE group_id IS NULL
UNION ALL
SELECT 'courts_unscoped', COUNT(*) FROM courts WHERE group_id IS NULL
UNION ALL
SELECT 'signups_unscoped', COUNT(*) FROM signups WHERE group_id IS NULL
UNION ALL
SELECT 'voting_criteria_unscoped', COUNT(*) FROM voting_criteria WHERE group_id IS NULL
UNION ALL
SELECT 'match_votes_unscoped', COUNT(*) FROM match_votes WHERE group_id IS NULL
UNION ALL
SELECT 'match_player_stats_unscoped', COUNT(*) FROM match_player_stats WHERE group_id IS NULL;

-- 2. Exactly one platform admin (Ignacio); every other former admin is a
-- plain user. (Group-level organizer status is tracked separately in
-- group_members.role; this check is about the platform escape hatch only.)
SELECT 'platform_admin_count' AS check_name, COUNT(*) AS expected_one
FROM user WHERE role = 'admin';

SELECT 'platform_admin_is_ignacio' AS check_name, COUNT(*) AS expected_one
FROM user WHERE role = 'admin' AND email = 'ignacioguri@gmail.com';

-- 3. Every user has a membership row in the legacy group.
SELECT 'users_missing_membership' AS check_name, COUNT(*) AS expected_zero
FROM user u
LEFT JOIN group_members gm
  ON gm.user_id = u.id AND gm.group_id = 'grp_legacy'
WHERE gm.id IS NULL;

-- 4. Membership count equals user count (no duplicates).
SELECT 'membership_equals_users' AS check_name,
       (SELECT COUNT(*) FROM user) AS user_count,
       (SELECT COUNT(*) FROM group_members WHERE group_id = 'grp_legacy') AS membership_count;

-- 5. Legacy group exists and has Ignacio as owner.
SELECT 'legacy_group_owner' AS check_name, g.owner_user_id, u.email
FROM groups g
LEFT JOIN user u ON u.id = g.owner_user_id
WHERE g.id = 'grp_legacy';

-- 6. All settings rows were copied into group_settings.
SELECT 'settings_copied' AS check_name,
       (SELECT COUNT(*) FROM settings) AS global_count,
       (SELECT COUNT(*) FROM group_settings WHERE group_id = 'grp_legacy') AS group_count;

-- 7. Phase 4: every legacy guest signup has a roster_id. Post the
-- convert-legacy-guests-to-ghosts migration this must be 0.
SELECT 'unlinked_guest_signups' AS check_name, COUNT(*) AS expected_zero
FROM signups
WHERE group_id = 'grp_legacy'
  AND user_id IS NULL
  AND roster_id IS NULL;
