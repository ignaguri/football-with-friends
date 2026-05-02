#!/usr/bin/env tsx
// Seed data script for local and staging environments

import { config } from "dotenv";

// Load environment variables
// For remote/staging: use .env.preview (staging Turso credentials)
// For local: use .env.local
const target = process.argv[2] || "local";
if (target === "remote") {
  config({ path: ".env.preview" });
} else {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely, sql } from "kysely";

// ── Types ──────────────────────────────────────────────────────────────────

interface Database {
  user: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: number;
    image: string | null;
    role: string;
    banned: number | null;
    banReason: string | null;
    banExpires: string | null;
    createdAt: number;
    updatedAt: number;
    username: string | null;
    displayUsername: string | null;
    profilePicture: string | null;
    nationality: string | null;
  };
  locations: {
    id: string;
    name: string;
    address: string | null;
    coordinates: string | null;
    court_count: number;
    created_at: string;
    updated_at: string;
  };
  courts: {
    id: string;
    location_id: string;
    name: string;
    description: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
  };
  matches: {
    id: string;
    location_id: string;
    court_id: string | null;
    date: string;
    time: string;
    status: string;
    max_players: number;
    max_substitutes: number;
    cost_per_player: string | null;
    same_day_cost: string | null;
    created_by_user_id: string;
    created_at: string;
    updated_at: string;
  };
  signups: {
    id: string;
    match_id: string;
    user_id: string | null;
    player_name: string;
    player_email: string;
    status: string;
    signup_type: string;
    guest_owner_id: string | null;
    added_by_user_id: string;
    signed_up_at: string;
    updated_at: string;
  };
  match_player_stats: {
    id: string;
    match_id: string;
    user_id: string;
    goals: number;
    third_time_attended: number;
    third_time_beers: number;
    confirmed: number;
    created_at: string;
    updated_at: string;
  };
  settings: {
    key: string;
    value: string;
    updated_at: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysFromNow(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function isoNow(): string {
  return new Date().toISOString();
}

function unixMsNow(): number {
  return Date.now();
}

// ── Seed Data ──────────────────────────────────────────────────────────────

const now = isoNow();
const unixMs = unixMsNow();

const USERS = [
  {
    id: "seed_user_01",
    name: "Ignacio Guri",
    email: "ignacio@example.com",
    nationality: "AR",
    role: "admin",
    username: "ignacio",
  },
  {
    id: "seed_user_02",
    name: "Carlos Tevez",
    email: "carlos@example.com",
    nationality: "AR",
    role: "user",
    username: "carlitos",
  },
  {
    id: "seed_user_03",
    name: "Lucas Silva",
    email: "lucas@example.com",
    nationality: "BR",
    role: "user",
    username: "lucas",
  },
  {
    id: "seed_user_04",
    name: "Marco Rossi",
    email: "marco@example.com",
    nationality: "IT",
    role: "user",
    username: "marco",
  },
  {
    id: "seed_user_05",
    name: "Hans Müller",
    email: "hans@example.com",
    nationality: "DE",
    role: "user",
    username: "hans",
  },
  {
    id: "seed_user_06",
    name: "Pablo García",
    email: "pablo@example.com",
    nationality: "ES",
    role: "user",
    username: "pablo",
  },
  {
    id: "seed_user_07",
    name: "Santiago López",
    email: "santiago@example.com",
    nationality: "UY",
    role: "user",
    username: "santiago",
  },
  {
    id: "seed_user_08",
    name: "Diego Ramírez",
    email: "diego@example.com",
    nationality: "CO",
    role: "user",
    username: "diego",
  },
];

const LOCATION = {
  id: "seed_location_01",
  name: "Sportpark Friedrichshain",
  address: "Margarete-Sommer-Str. 2, 10407 Berlin",
  coordinates: null,
  court_count: 1,
  created_at: now,
  updated_at: now,
};

const COURT = {
  id: "seed_court_01",
  location_id: "seed_location_01",
  name: "Kunstrasenplatz 1",
  description: null,
  is_active: 1,
  created_at: now,
  updated_at: now,
};

const MATCHES = [
  { id: "seed_match_01", dayOffset: -28, time: "19:00", status: "completed", cost: "10" },
  { id: "seed_match_02", dayOffset: -21, time: "19:00", status: "completed", cost: "10" },
  { id: "seed_match_03", dayOffset: -14, time: "19:00", status: "completed", cost: "10" },
  { id: "seed_match_04", dayOffset: -10, time: "20:00", status: "cancelled", cost: "10" },
  { id: "seed_match_05", dayOffset: -7, time: "19:00", status: "completed", cost: "10" },
  { id: "seed_match_06", dayOffset: -3, time: "20:00", status: "cancelled", cost: "10" },
  { id: "seed_match_07", dayOffset: 3, time: "19:00", status: "upcoming", cost: "10" },
  { id: "seed_match_08", dayOffset: 7, time: "19:30", status: "upcoming", cost: "10" },
  { id: "seed_match_09", dayOffset: 14, time: "19:00", status: "upcoming", cost: "12" },
  { id: "seed_match_10", dayOffset: 21, time: "19:00", status: "upcoming", cost: "12" },
];

// Which users are signed up for each match, and their status
// Users referenced by index (0-7) into USERS array
const MATCH_SIGNUPS: Record<string, { userIdx: number; status: string }[]> = {
  seed_match_01: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 1, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 3, status: "PAID" },
    { userIdx: 4, status: "PAID" },
    { userIdx: 5, status: "PAID" },
    { userIdx: 6, status: "PAID" },
    { userIdx: 7, status: "PAID" },
  ],
  seed_match_02: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 1, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 3, status: "PAID" },
    { userIdx: 4, status: "PAID" },
    { userIdx: 5, status: "PAID" },
    { userIdx: 6, status: "PAID" },
    { userIdx: 7, status: "PAID" },
  ],
  seed_match_03: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 1, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 4, status: "PAID" },
    { userIdx: 6, status: "PAID" },
    { userIdx: 7, status: "PAID" },
  ],
  seed_match_04: [
    { userIdx: 0, status: "CANCELLED" },
    { userIdx: 1, status: "CANCELLED" },
    { userIdx: 3, status: "CANCELLED" },
  ],
  seed_match_05: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 1, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 3, status: "PAID" },
    { userIdx: 4, status: "PAID" },
    { userIdx: 5, status: "PAID" },
    { userIdx: 6, status: "PAID" },
    { userIdx: 7, status: "PAID" },
  ],
  seed_match_06: [
    { userIdx: 2, status: "CANCELLED" },
    { userIdx: 4, status: "CANCELLED" },
  ],
  seed_match_07: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 1, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 3, status: "PAID" },
    { userIdx: 4, status: "PENDING" },
    { userIdx: 5, status: "PENDING" },
  ],
  seed_match_08: [
    { userIdx: 0, status: "PAID" },
    { userIdx: 2, status: "PAID" },
    { userIdx: 6, status: "PENDING" },
    { userIdx: 7, status: "PENDING" },
  ],
  seed_match_09: [
    { userIdx: 0, status: "PENDING" },
    { userIdx: 1, status: "PENDING" },
  ],
  // seed_match_10: no signups
};

// Player stats for completed matches
// { matchId, userIdx, goals, thirdTime (0|1), beers }
const PLAYER_STATS: {
  matchId: string;
  userIdx: number;
  goals: number;
  thirdTime: number;
  beers: number;
}[] = [
  // Match 1
  { matchId: "seed_match_01", userIdx: 0, goals: 2, thirdTime: 1, beers: 3 },
  { matchId: "seed_match_01", userIdx: 1, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_01", userIdx: 2, goals: 3, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_01", userIdx: 3, goals: 0, thirdTime: 1, beers: 4 },
  { matchId: "seed_match_01", userIdx: 4, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_01", userIdx: 5, goals: 0, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_01", userIdx: 6, goals: 1, thirdTime: 1, beers: 1 },
  { matchId: "seed_match_01", userIdx: 7, goals: 0, thirdTime: 1, beers: 3 },
  // Match 2
  { matchId: "seed_match_02", userIdx: 0, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_02", userIdx: 1, goals: 2, thirdTime: 1, beers: 3 },
  { matchId: "seed_match_02", userIdx: 2, goals: 0, thirdTime: 1, beers: 1 },
  { matchId: "seed_match_02", userIdx: 3, goals: 1, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_02", userIdx: 4, goals: 0, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_02", userIdx: 5, goals: 3, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_02", userIdx: 6, goals: 0, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_02", userIdx: 7, goals: 1, thirdTime: 1, beers: 1 },
  // Match 3 (6 players: 0,1,2,4,6,7)
  { matchId: "seed_match_03", userIdx: 0, goals: 0, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_03", userIdx: 1, goals: 1, thirdTime: 1, beers: 1 },
  { matchId: "seed_match_03", userIdx: 2, goals: 2, thirdTime: 1, beers: 3 },
  { matchId: "seed_match_03", userIdx: 4, goals: 1, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_03", userIdx: 6, goals: 0, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_03", userIdx: 7, goals: 1, thirdTime: 1, beers: 1 },
  // Match 5
  { matchId: "seed_match_05", userIdx: 0, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_05", userIdx: 1, goals: 0, thirdTime: 0, beers: 0 },
  { matchId: "seed_match_05", userIdx: 2, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_05", userIdx: 3, goals: 2, thirdTime: 1, beers: 3 },
  { matchId: "seed_match_05", userIdx: 4, goals: 0, thirdTime: 1, beers: 1 },
  { matchId: "seed_match_05", userIdx: 5, goals: 1, thirdTime: 1, beers: 2 },
  { matchId: "seed_match_05", userIdx: 6, goals: 0, thirdTime: 1, beers: 1 },
  { matchId: "seed_match_05", userIdx: 7, goals: 0, thirdTime: 0, beers: 0 },
];

const SETTINGS = [
  { key: "default_cost_per_player", value: "10" },
  { key: "same_day_extra_cost", value: "2" },
  { key: "default_max_substitutes", value: "2" },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const target = process.argv[2] || "local";

  let db: Kysely<Database>;

  if (target === "remote") {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

    if (!url || !authToken) {
      console.error("❌ TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set for remote seeding.");
      console.error("   Set them in .env.production or .env.staging");
      process.exit(1);
    }

    console.log("🔗 Connecting to remote Turso database...");
    console.log(`   URL: ${url.replace(/\/\/.*@/, "//***@")}`);

    // Confirmation prompt
    console.log("\n⚠️  This will insert seed data into the remote database.");
    console.log("   Existing seed records (id LIKE 'seed_%') will be replaced.");
    console.log("   Real user data will NOT be touched.");
    console.log("   Continue? (y/N)");

    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => rl.question("", resolve));
    rl.close();

    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.log("❌ Seed cancelled.");
      process.exit(0);
    }

    db = new Kysely<Database>({
      dialect: new LibsqlDialect({ url, authToken }),
    });
  } else {
    const localUrl = process.env.LOCAL_DATABASE_URL || "file:./local.db";
    console.log(`🔗 Connecting to local database: ${localUrl}`);
    db = new Kysely<Database>({
      dialect: new LibsqlDialect({ url: localUrl }),
    });
  }

  try {
    // ── Step 1: Clean up existing seed data ────────────────────────────

    console.log("\n🧹 Cleaning existing seed data...");

    // Delete in reverse dependency order
    await sql`DELETE FROM match_player_stats WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM signups WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM match_invitations WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM matches WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM courts WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM locations WHERE id LIKE 'seed_%'`.execute(db);
    await sql`DELETE FROM user WHERE id LIKE 'seed_%'`.execute(db);

    console.log("   ✅ Cleaned seed data");

    // ── Step 2: Insert users ───────────────────────────────────────────

    console.log("\n👤 Inserting users...");

    for (const u of USERS) {
      await db
        .insertInto("user")
        .values({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: 1,
          image: null,
          role: u.role,
          banned: null,
          banReason: null,
          banExpires: null,
          createdAt: unixMs,
          updatedAt: unixMs,
          username: u.username,
          displayUsername: u.name,
          profilePicture: null,
          nationality: u.nationality,
        })
        .execute();
    }

    console.log(`   ✅ Inserted ${USERS.length} users`);

    // ── Step 3: Insert location ────────────────────────────────────────

    console.log("\n📍 Inserting location...");
    await db.insertInto("locations").values(LOCATION).execute();
    console.log("   ✅ Inserted location: Sportpark Friedrichshain");

    // ── Step 4: Insert court ───────────────────────────────────────────

    console.log("\n🏟️  Inserting court...");
    await db.insertInto("courts").values(COURT).execute();
    console.log("   ✅ Inserted court: Kunstrasenplatz 1");

    // ── Step 5: Insert matches ─────────────────────────────────────────

    console.log("\n⚽ Inserting matches...");

    // Get existing non-seed match dates to avoid UNIQUE constraint conflicts
    const existingDatesResult =
      await sql`SELECT date FROM matches WHERE id NOT LIKE 'seed_%'`.execute(db);
    const existingDates = new Set((existingDatesResult.rows as any[]).map((r) => r.date));

    const skippedMatches = new Set<string>();
    for (const m of MATCHES) {
      let matchDate = daysFromNow(m.dayOffset);
      let dateStr = formatDate(matchDate);

      // Shift date forward until no conflict with real matches
      let attempts = 0;
      while (existingDates.has(dateStr) && attempts < 7) {
        matchDate.setDate(matchDate.getDate() + 1);
        dateStr = formatDate(matchDate);
        attempts++;
      }

      if (existingDates.has(dateStr)) {
        console.log(`   ⚠️  Skipping ${m.id} — could not find available date`);
        skippedMatches.add(m.id);
        continue;
      }

      if (attempts > 0) {
        console.log(`   ℹ️  ${m.id} shifted to ${dateStr} (real match on original date)`);
      }

      await db
        .insertInto("matches")
        .values({
          id: m.id,
          location_id: LOCATION.id,
          court_id: COURT.id,
          date: dateStr,
          time: m.time,
          status: m.status,
          max_players: 10,
          max_substitutes: 2,
          cost_per_player: m.cost,
          same_day_cost: "2",
          created_by_user_id: USERS[0].id,
          created_at: now,
          updated_at: now,
        })
        .execute();
    }

    const insertedMatches = MATCHES.length - skippedMatches.size;
    console.log(
      `   ✅ Inserted ${insertedMatches} matches${skippedMatches.size > 0 ? ` (${skippedMatches.size} skipped)` : ""}`,
    );

    // ── Step 6: Insert signups ─────────────────────────────────────────

    console.log("\n📝 Inserting signups...");

    let signupCount = 0;
    for (const [matchId, signups] of Object.entries(MATCH_SIGNUPS)) {
      if (skippedMatches.has(matchId)) continue;
      for (let i = 0; i < signups.length; i++) {
        const s = signups[i];
        const user = USERS[s.userIdx];
        const signupId = `seed_signup_${matchId.replace("seed_match_", "m")}_u${String(s.userIdx + 1).padStart(2, "0")}`;

        await db
          .insertInto("signups")
          .values({
            id: signupId,
            match_id: matchId,
            user_id: user.id,
            player_name: user.name,
            player_email: user.email,
            status: s.status,
            signup_type: "self",
            guest_owner_id: null,
            added_by_user_id: user.id,
            signed_up_at: now,
            updated_at: now,
          })
          .execute();
        signupCount++;
      }
    }

    console.log(`   ✅ Inserted ${signupCount} signups`);

    // ── Step 7: Insert player stats ────────────────────────────────────

    console.log("\n📊 Inserting player stats...");

    for (const ps of PLAYER_STATS) {
      if (skippedMatches.has(ps.matchId)) continue;
      const user = USERS[ps.userIdx];
      const statId = `seed_stat_${ps.matchId.replace("seed_match_", "m")}_u${String(ps.userIdx + 1).padStart(2, "0")}`;

      await db
        .insertInto("match_player_stats")
        .values({
          id: statId,
          match_id: ps.matchId,
          user_id: user.id,
          goals: ps.goals,
          third_time_attended: ps.thirdTime,
          third_time_beers: ps.beers,
          confirmed: 1,
          created_at: now,
          updated_at: now,
        })
        .execute();
    }

    console.log(`   ✅ Inserted ${PLAYER_STATS.length} player stats`);

    // ── Step 8: Insert settings ────────────────────────────────────────

    console.log("\n⚙️  Inserting settings...");

    for (const s of SETTINGS) {
      await db
        .insertInto("settings")
        .values({ key: s.key, value: s.value, updated_at: now })
        .onConflict((oc) => oc.column("key").doUpdateSet({ value: s.value, updated_at: now }))
        .execute();
    }

    console.log(`   ✅ Inserted ${SETTINGS.length} settings`);

    // ── Summary ────────────────────────────────────────────────────────

    console.log("\n🎉 Seed completed successfully!");
    console.log(`   Users:        ${USERS.length}`);
    console.log(`   Locations:    1`);
    console.log(`   Courts:       1`);
    console.log(`   Matches:      ${MATCHES.length}`);
    console.log(`   Signups:      ${signupCount}`);
    console.log(`   Player Stats: ${PLAYER_STATS.length}`);
    console.log(`   Settings:     ${SETTINGS.length}`);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error("❌ Seed error:", error);
  process.exit(1);
});
