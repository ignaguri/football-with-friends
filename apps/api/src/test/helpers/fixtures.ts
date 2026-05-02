// Direct DB-insert seed helpers for tests. Side-steps the service layer so
// fixtures don't exercise the code under test.

import type { Kysely } from "kysely";
import { nanoid } from "nanoid";

export interface SeedUserParams {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: "user" | "admin";
}

export interface SeededUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export async function seedUser(db: Kysely<any>, params: SeedUserParams = {}): Promise<SeededUser> {
  const id = params.id ?? `user_${nanoid(10)}`;
  const email = params.email ?? `${id}@test.local`;
  const name = params.name ?? `User ${id.slice(-4)}`;
  const phone = params.phone ?? null;
  const role = params.role ?? "user";
  const now = Date.now();
  await db
    .insertInto("user")
    .values({
      id,
      name,
      email,
      emailVerified: 1,
      image: null,
      role,
      banned: null,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
      username: null,
      displayUsername: null,
      profilePicture: null,
      nationality: null,
      phoneNumber: phone,
      phoneNumberVerified: phone ? 1 : 0,
      primaryAuthMethod: null,
      lastEngagementReminderAt: null,
    })
    .execute();
  return { id, name, email, phone, role };
}

export interface SeedGroupParams {
  id?: string;
  ownerUserId: string;
  name?: string;
  slug?: string;
  visibility?: "private" | "public";
}

export interface SeededGroup {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
}

export async function seedGroup(db: Kysely<any>, params: SeedGroupParams): Promise<SeededGroup> {
  const id = params.id ?? `grp_${nanoid(10)}`;
  const name = params.name ?? `Group ${id.slice(-4)}`;
  const slug = params.slug ?? id.toLowerCase();
  const visibility = params.visibility ?? "private";

  await db
    .insertInto("groups")
    .values({
      id,
      name,
      slug,
      owner_user_id: params.ownerUserId,
      visibility,
    })
    .execute();

  // Owner is always an organizer member.
  await db
    .insertInto("group_members")
    .values({
      id: `gm_${nanoid(10)}`,
      group_id: id,
      user_id: params.ownerUserId,
      role: "organizer",
    })
    .execute();

  return { id, name, slug, ownerUserId: params.ownerUserId };
}

export interface SeedMembershipParams {
  groupId: string;
  userId: string;
  role?: "organizer" | "member";
}

export async function seedMembership(
  db: Kysely<any>,
  params: SeedMembershipParams,
): Promise<{ id: string }> {
  const id = `gm_${nanoid(10)}`;
  await db
    .insertInto("group_members")
    .values({
      id,
      group_id: params.groupId,
      user_id: params.userId,
      role: params.role ?? "member",
    })
    .execute();
  return { id };
}

export interface SeedInviteParams {
  groupId: string;
  createdByUserId: string;
  token?: string;
  expiresAt?: Date | null;
  maxUses?: number | null;
  targetPhone?: string | null;
  targetUserId?: string | null;
  revokedAt?: Date | null;
  usesCount?: number;
}

export interface SeededInvite {
  id: string;
  token: string;
}

export async function seedInvite(db: Kysely<any>, params: SeedInviteParams): Promise<SeededInvite> {
  const id = `inv_${nanoid(10)}`;
  const token = params.token ?? nanoid(24);
  await db
    .insertInto("group_invites")
    .values({
      id,
      group_id: params.groupId,
      token,
      created_by_user_id: params.createdByUserId,
      expires_at: params.expiresAt
        ? params.expiresAt.toISOString()
        : params.expiresAt === null
          ? null
          : null,
      max_uses: params.maxUses ?? null,
      uses_count: params.usesCount ?? 0,
      target_phone: params.targetPhone ?? null,
      target_user_id: params.targetUserId ?? null,
      revoked_at: params.revokedAt ? params.revokedAt.toISOString() : null,
    })
    .execute();
  return { id, token };
}

export interface SeedRosterParams {
  groupId: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
  claimedByUserId?: string | null;
  createdByUserId: string;
}

export async function seedRoster(
  db: Kysely<any>,
  params: SeedRosterParams,
): Promise<{ id: string }> {
  const id = `rst_${nanoid(10)}`;
  await db
    .insertInto("group_roster")
    .values({
      id,
      group_id: params.groupId,
      display_name: params.displayName,
      phone: params.phone ?? null,
      email: params.email ?? null,
      claimed_by_user_id: params.claimedByUserId ?? null,
      created_by_user_id: params.createdByUserId,
    })
    .execute();
  return { id };
}

export interface SeedSignupParams {
  matchId: string;
  rosterId?: string | null;
  userId?: string | null;
  playerName: string;
  playerEmail?: string;
  addedByUserId: string;
  groupId: string;
  signupType?: "self" | "guest" | "admin_added" | "invitation";
  status?: "PAID" | "PENDING" | "CANCELLED" | "SUBSTITUTE";
}

export async function seedSignup(
  db: Kysely<any>,
  params: SeedSignupParams,
): Promise<{ id: string }> {
  const id = `sgn_${nanoid(10)}`;
  await db
    .insertInto("signups")
    .values({
      id,
      match_id: params.matchId,
      user_id: params.userId ?? null,
      player_name: params.playerName,
      player_email: params.playerEmail ?? "guest@test.local",
      status: params.status ?? "PENDING",
      signup_type: params.signupType ?? "guest",
      guest_owner_id: null,
      added_by_user_id: params.addedByUserId,
      group_id: params.groupId,
      roster_id: params.rosterId ?? null,
    })
    .execute();
  return { id };
}

export interface SeedMatchParams {
  id?: string;
  locationId: string;
  groupId: string;
  createdByUserId: string;
  date?: string;
  time?: string;
  maxPlayers?: number;
}

// Counter to guarantee unique match dates across the test run — the schema
// enforces UNIQUE on `matches.date` and fixture callers rarely care about the
// specific calendar day.
let matchDateCounter = 0;

export async function seedMatch(db: Kysely<any>, params: SeedMatchParams): Promise<{ id: string }> {
  const id = params.id ?? `match_${nanoid(10)}`;
  const defaultDate = (() => {
    matchDateCounter += 1;
    const base = new Date("2026-06-01T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + matchDateCounter);
    return base.toISOString().slice(0, 10);
  })();
  await db
    .insertInto("matches")
    .values({
      id,
      location_id: params.locationId,
      court_id: null,
      date: params.date ?? defaultDate,
      time: params.time ?? "19:00",
      status: "upcoming",
      max_players: params.maxPlayers ?? 10,
      max_substitutes: 2,
      cost_per_player: null,
      same_day_cost: null,
      created_by_user_id: params.createdByUserId,
      reminder_sent: 0,
      group_id: params.groupId,
    })
    .execute();
  return { id };
}

export interface SeedLocationParams {
  id?: string;
  name?: string;
  groupId: string;
}

export async function seedLocation(
  db: Kysely<any>,
  params: SeedLocationParams,
): Promise<{ id: string }> {
  const id = params.id ?? `loc_${nanoid(10)}`;
  await db
    .insertInto("locations")
    .values({
      id,
      name: params.name ?? `Location ${id.slice(-4)}`,
      address: null,
      coordinates: null,
      court_count: 0,
      group_id: params.groupId,
    })
    .execute();
  return { id };
}
