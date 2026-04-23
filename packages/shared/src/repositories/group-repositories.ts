// Turso/LibSQL implementations of the group-scoping repositories using Kysely.
// Added in Phase 0 of the group-oriented scoping refactor to scaffold the
// data access layer; wired into routes/services in Phases 2–4.
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md

import { nanoid } from "nanoid";

import { getDatabase } from "../database/connection";
import type {
  CreateGroupData,
  CreateGroupInviteData,
  CreateGroupRosterData,
  Group,
  GroupInvite,
  GroupMember,
  GroupRoster,
  GroupVisibility,
  MemberRole,
  UpdateGroupData,
  UpdateGroupRosterData,
} from "../domain/types";

function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "group"
  );
}

function rowToGroup(row: any): Group {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    visibility: row.visibility as GroupVisibility,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToMember(row: any): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role as MemberRole,
    joinedAt: new Date(row.joined_at),
  };
}

function rowToInvite(row: any): GroupInvite {
  return {
    id: row.id,
    groupId: row.group_id,
    token: row.token,
    createdByUserId: row.created_by_user_id,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    maxUses: row.max_uses ?? undefined,
    usesCount: Number(row.uses_count ?? 0),
    targetPhone: row.target_phone ?? undefined,
    targetUserId: row.target_user_id ?? undefined,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

function rowToRoster(row: any): GroupRoster {
  return {
    id: row.id,
    groupId: row.group_id,
    displayName: row.display_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    claimedByUserId: row.claimed_by_user_id ?? undefined,
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class TursoGroupRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateGroupData): Promise<Group> {
    const id = generateId("grp");
    const slug = data.slug ?? slugify(data.name);
    const row = await this.db
      .insertInto("groups")
      .values({
        id,
        name: data.name,
        slug,
        owner_user_id: data.ownerUserId,
        visibility: data.visibility ?? "private",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToGroup(row);
  }

  async findById(id: string): Promise<Group | null> {
    const row = await this.db
      .selectFrom("groups")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return row ? rowToGroup(row) : null;
  }

  async findBySlug(slug: string): Promise<Group | null> {
    const row = await this.db
      .selectFrom("groups")
      .selectAll()
      .where("slug", "=", slug)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    return row ? rowToGroup(row) : null;
  }

  async listByUserId(userId: string): Promise<Array<Group & { myRole: MemberRole; amIOwner: boolean }>> {
    const rows = await this.db
      .selectFrom("groups")
      .innerJoin("group_members", "group_members.group_id", "groups.id")
      .where("group_members.user_id", "=", userId)
      .where("groups.deleted_at", "is", null)
      .select([
        "groups.id",
        "groups.name",
        "groups.slug",
        "groups.owner_user_id",
        "groups.visibility",
        "groups.deleted_at",
        "groups.created_at",
        "groups.updated_at",
        "group_members.role as my_role",
        "group_members.joined_at",
      ])
      .orderBy("group_members.joined_at", "asc")
      .execute();

    return rows.map((row) => ({
      ...rowToGroup(row),
      myRole: row.my_role as MemberRole,
      amIOwner: row.owner_user_id === userId,
    }));
  }

  /**
   * Returns the caller's membership + ownership for a single group in one
   * round-trip. Hot path — called by groupContextMiddleware on every scoped
   * request. Returns null when the user isn't a member or the group is
   * soft-deleted.
   */
  async findMembership(
    groupId: string,
    userId: string,
  ): Promise<{ id: string; role: MemberRole; isOwner: boolean } | null> {
    const row = await this.db
      .selectFrom("groups")
      .innerJoin("group_members", "group_members.group_id", "groups.id")
      .where("groups.id", "=", groupId)
      .where("group_members.user_id", "=", userId)
      .where("groups.deleted_at", "is", null)
      .select([
        "groups.id as id",
        "groups.owner_user_id as owner_user_id",
        "group_members.role as role",
      ])
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      role: row.role as MemberRole,
      isOwner: row.owner_user_id === userId,
    };
  }

  /**
   * Oldest-joined membership for the user; auto-pick fallback when no header
   * is sent. Limits to 1 so we don't hydrate the full group list.
   */
  async findFirstMembership(
    userId: string,
  ): Promise<{ id: string; role: MemberRole; isOwner: boolean } | null> {
    const row = await this.db
      .selectFrom("groups")
      .innerJoin("group_members", "group_members.group_id", "groups.id")
      .where("group_members.user_id", "=", userId)
      .where("groups.deleted_at", "is", null)
      .select([
        "groups.id as id",
        "groups.owner_user_id as owner_user_id",
        "group_members.role as role",
      ])
      .orderBy("group_members.joined_at", "asc")
      .limit(1)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      role: row.role as MemberRole,
      isOwner: row.owner_user_id === userId,
    };
  }

  async update(id: string, data: UpdateGroupData): Promise<Group> {
    const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) values.name = data.name;
    if (data.slug !== undefined) values.slug = data.slug;
    if (data.visibility !== undefined) values.visibility = data.visibility;

    const row = await this.db
      .updateTable("groups")
      .set(values)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToGroup(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable("groups")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", id)
      .execute();
  }

  async transferOwnership(groupId: string, newOwnerUserId: string): Promise<void> {
    await this.db
      .updateTable("groups")
      .set({ owner_user_id: newOwnerUserId, updated_at: new Date().toISOString() })
      .where("id", "=", groupId)
      .execute();
  }
}

export class TursoGroupMembershipRepository {
  private get db() {
    return getDatabase();
  }

  async find(groupId: string, userId: string): Promise<GroupMember | null> {
    const row = await this.db
      .selectFrom("group_members")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return row ? rowToMember(row) : null;
  }

  /**
   * Returns the user_id of an existing group member whose phone or email
   * matches the given contact, or null. Used by roster create/quick-add
   * paths to refuse creating a ghost that collides with a real member —
   * organizers should invite that user, not ghost-ify them.
   */
  async findMemberByContact(
    groupId: string,
    contact: { phone?: string; email?: string },
  ): Promise<string | null> {
    if (!contact.phone && !contact.email) return null;
    const row = await this.db
      .selectFrom("user")
      .innerJoin("group_members", "group_members.user_id", "user.id")
      .select("user.id as id")
      .where("group_members.group_id", "=", groupId)
      .where((eb) => {
        const clauses = [];
        if (contact.phone)
          clauses.push(eb("user.phoneNumber", "=", contact.phone));
        if (contact.email) clauses.push(eb("user.email", "=", contact.email));
        return eb.or(clauses);
      })
      .limit(1)
      .executeTakeFirst();
    return row?.id ?? null;
  }

  async listByGroup(groupId: string): Promise<GroupMember[]> {
    const rows = await this.db
      .selectFrom("group_members")
      .selectAll()
      .where("group_id", "=", groupId)
      .orderBy("joined_at", "asc")
      .execute();
    return rows.map(rowToMember);
  }

  async add(params: {
    groupId: string;
    userId: string;
    role: MemberRole;
  }): Promise<GroupMember> {
    const id = generateId("gm");
    const row = await this.db
      .insertInto("group_members")
      .values({
        id,
        group_id: params.groupId,
        user_id: params.userId,
        role: params.role,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToMember(row);
  }

  /**
   * Idempotent membership insert. Uses `UNIQUE(group_id, user_id)` to drop
   * duplicates server-side instead of read-then-write, which would race
   * under concurrent accepts of the same invite by the same user. Returns
   * true iff a new row was created.
   */
  async tryAdd(params: {
    groupId: string;
    userId: string;
    role: MemberRole;
  }): Promise<boolean> {
    const id = generateId("gm");
    const result = await this.db
      .insertInto("group_members")
      .values({
        id,
        group_id: params.groupId,
        user_id: params.userId,
        role: params.role,
      })
      .onConflict((oc) => oc.columns(["group_id", "user_id"]).doNothing())
      .executeTakeFirst();
    return Number(result.numInsertedOrUpdatedRows ?? 0) > 0;
  }

  async updateRole(
    groupId: string,
    userId: string,
    role: MemberRole,
  ): Promise<void> {
    await this.db
      .updateTable("group_members")
      .set({ role })
      .where("group_id", "=", groupId)
      .where("user_id", "=", userId)
      .execute();
  }

  async remove(groupId: string, userId: string): Promise<void> {
    await this.db
      .deleteFrom("group_members")
      .where("group_id", "=", groupId)
      .where("user_id", "=", userId)
      .execute();
  }
}

export class TursoGroupInviteRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateGroupInviteData): Promise<GroupInvite> {
    const id = generateId("inv");
    const token = nanoid(24);
    const row = await this.db
      .insertInto("group_invites")
      .values({
        id,
        group_id: data.groupId,
        token,
        created_by_user_id: data.createdByUserId,
        expires_at: data.expiresAt ? data.expiresAt.toISOString() : null,
        max_uses: data.maxUses ?? null,
        uses_count: 0,
        target_phone: data.targetPhone ?? null,
        target_user_id: data.targetUserId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToInvite(row);
  }

  async findById(id: string): Promise<GroupInvite | null> {
    const row = await this.db
      .selectFrom("group_invites")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? rowToInvite(row) : null;
  }

  async findByToken(token: string): Promise<GroupInvite | null> {
    const row = await this.db
      .selectFrom("group_invites")
      .selectAll()
      .where("token", "=", token)
      .executeTakeFirst();
    return row ? rowToInvite(row) : null;
  }

  async listActiveByGroup(groupId: string): Promise<GroupInvite[]> {
    const rows = await this.db
      .selectFrom("group_invites")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("revoked_at", "is", null)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(rowToInvite);
  }

  async incrementUsesCount(id: string): Promise<void> {
    await this.db
      .updateTable("group_invites")
      .set((eb) => ({ uses_count: eb("uses_count", "+", 1) }))
      .where("id", "=", id)
      .execute();
  }

  /**
   * Atomic increment that only succeeds while `uses_count < max_uses` (or
   * max_uses is null). Returns true iff the use was consumed. Prevents two
   * concurrent accepters from both passing an optimistic check and pushing
   * `uses_count` above `max_uses`.
   */
  async tryConsumeUse(id: string): Promise<boolean> {
    const result = await this.db
      .updateTable("group_invites")
      .set((eb) => ({ uses_count: eb("uses_count", "+", 1) }))
      .where("id", "=", id)
      .where((eb) =>
        eb.or([
          eb("max_uses", "is", null),
          eb("uses_count", "<", eb.ref("max_uses")),
        ]),
      )
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .updateTable("group_invites")
      .set({ revoked_at: new Date().toISOString() })
      .where("id", "=", id)
      .execute();
  }
}

export class TursoGroupRosterRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateGroupRosterData): Promise<GroupRoster> {
    const id = generateId("rst");
    const row = await this.db
      .insertInto("group_roster")
      .values({
        id,
        group_id: data.groupId,
        display_name: data.displayName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        created_by_user_id: data.createdByUserId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToRoster(row);
  }

  async findById(id: string): Promise<GroupRoster | null> {
    const row = await this.db
      .selectFrom("group_roster")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? rowToRoster(row) : null;
  }

  async listByGroup(groupId: string): Promise<GroupRoster[]> {
    const rows = await this.db
      .selectFrom("group_roster")
      .selectAll()
      .where("group_id", "=", groupId)
      .orderBy("display_name", "asc")
      .execute();
    return rows.map(rowToRoster);
  }

  async findByGroupAndPhone(
    groupId: string,
    phone: string,
  ): Promise<GroupRoster[]> {
    const rows = await this.db
      .selectFrom("group_roster")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("phone", "=", phone)
      .execute();
    return rows.map(rowToRoster);
  }

  async findByGroupAndEmail(
    groupId: string,
    email: string,
  ): Promise<GroupRoster[]> {
    const rows = await this.db
      .selectFrom("group_roster")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("email", "=", email)
      .execute();
    return rows.map(rowToRoster);
  }

  async update(id: string, data: UpdateGroupRosterData): Promise<GroupRoster> {
    const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.displayName !== undefined) values.display_name = data.displayName;
    if (data.phone !== undefined) values.phone = data.phone ?? null;
    if (data.email !== undefined) values.email = data.email ?? null;
    if (data.claimedByUserId !== undefined)
      values.claimed_by_user_id = data.claimedByUserId ?? null;

    const row = await this.db
      .updateTable("group_roster")
      .set(values)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToRoster(row);
  }

  async delete(id: string): Promise<void> {
    await this.db
      .deleteFrom("group_roster")
      .where("id", "=", id)
      .execute();
  }

  /**
   * Atomic claim that only succeeds while `claimed_by_user_id IS NULL`.
   * Prevents a late accept from overwriting a claim that landed between the
   * reader's lookup and write. Returns true iff the row was claimed here.
   */
  async tryClaim(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .updateTable("group_roster")
      .set({
        claimed_by_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .where("claimed_by_user_id", "is", null)
      .executeTakeFirst();
    return Number(result.numUpdatedRows ?? 0) > 0;
  }
}

export class TursoGroupSettingsRepository {
  private get db() {
    return getDatabase();
  }

  async getAll(groupId: string): Promise<Record<string, string>> {
    const rows = await this.db
      .selectFrom("group_settings")
      .selectAll()
      .where("group_id", "=", groupId)
      .execute();
    const out: Record<string, string> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  async get(groupId: string, key: string): Promise<string | null> {
    const row = await this.db
      .selectFrom("group_settings")
      .select(["value"])
      .where("group_id", "=", groupId)
      .where("key", "=", key)
      .executeTakeFirst();
    return row?.value ?? null;
  }

  async set(groupId: string, key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insertInto("group_settings")
      .values({ group_id: groupId, key, value, updated_at: now })
      .onConflict((oc) =>
        oc.columns(["group_id", "key"]).doUpdateSet({ value, updated_at: now }),
      )
      .execute();
  }
}
