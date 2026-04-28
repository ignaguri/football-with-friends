// One-off QA seeder: inserts one inbox row per NotificationType for the
// target user in their active (or first-membered) group, so the inbox UI
// can be exercised end-to-end without triggering real match/cron flows.
//
// Run with: bun run apps/api/scripts/seed-inbox.ts <email>
//
// Talks to whatever Turso DB the root .env.local points at — same DB the
// running API uses. Idempotent in the sense that re-running just appends
// another batch (older rows still age out via the prune cron).

import { getDatabase } from "@repo/shared/database";
import { NOTIFICATION_TYPES } from "@repo/shared/domain";
import { getRepositoryFactory } from "@repo/shared/repositories";

type SeedSpec = {
  type: (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
  category: "new_match" | "match_reminder" | "promo_to_confirmed" | null;
  title: string;
  body: string;
  screen?: string;
};

const SEEDS: SeedSpec[] = [
  {
    type: NOTIFICATION_TYPES.MATCH_CREATED,
    category: "new_match",
    title: "New match",
    body: "A new match was scheduled for Saturday at 19:00",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.MATCH_UPDATED,
    category: null,
    title: "Match updated",
    body: "Saturday's match start time changed to 20:00",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.MATCH_CANCELLED,
    category: null,
    title: "Match cancelled",
    body: "The match scheduled for Friday has been cancelled",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.PLAYER_CONFIRMED,
    category: null,
    title: "You're in",
    body: "You've been confirmed for Saturday's match",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.SUBSTITUTE_PROMOTED,
    category: "promo_to_confirmed",
    title: "Promoted off the waitlist",
    body: "A spot opened — you're now confirmed for Saturday",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.PLAYER_CANCELLED,
    category: null,
    title: "Player dropped out",
    body: "Juan cancelled their spot — first sub will be promoted",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.REMOVED_FROM_MATCH,
    category: null,
    title: "Removed from match",
    body: "An organizer removed you from Friday's match",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.MATCH_REMINDER,
    category: "match_reminder",
    title: "Match reminder",
    body: "Don't forget — Saturday's match starts in 2 hours",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.PAYMENT_REMINDER,
    category: null,
    title: "Payment reminder",
    body: "You owe €5 for last week's match",
    screen: "/(tabs)/matches",
  },
  {
    type: NOTIFICATION_TYPES.VOTING_OPEN,
    category: null,
    title: "Vote on the match",
    body: "Rate the players from yesterday's match",
    screen: "/(tabs)/social",
  },
  {
    type: NOTIFICATION_TYPES.ENGAGEMENT_REMINDER,
    category: null,
    title: "Come back!",
    body: "We miss you — there are open spots in upcoming matches",
    screen: "/(tabs)/matches",
  },
];

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: bun run apps/api/scripts/seed-inbox.ts <email>");
    process.exit(1);
  }

  const db = getDatabase();

  const user = await db
    .selectFrom("user")
    .select(["id", "email", "name"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const membership = await db
    .selectFrom("group_members")
    .innerJoin("groups", "groups.id", "group_members.group_id")
    .select(["groups.id as group_id", "groups.name as group_name"])
    .where("group_members.user_id", "=", user.id)
    .where("groups.deleted_at", "is", null)
    .executeTakeFirst();

  if (!membership) {
    console.error(`User ${email} has no group membership.`);
    process.exit(1);
  }

  console.log(
    `Seeding ${SEEDS.length} inbox rows for ${user.email} (${user.id}) in group ${membership.group_name} (${membership.group_id})`,
  );

  await getRepositoryFactory().notificationInbox.insertMany(
    SEEDS.map((s) => ({
      userId: user.id,
      groupId: membership.group_id,
      type: s.type,
      category: s.category,
      title: s.title,
      body: s.body,
      data: {
        type: s.type,
        screen: s.screen,
      } as never,
    })),
  );

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
