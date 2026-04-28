// Turso/LibSQL implementation of the notification inbox repository.
// Persists every user-facing notification we send (except group invites,
// which already have a dedicated UX) so users can see history later — even
// on web, where push delivery is unsupported.

import { nanoid } from "nanoid";

import type {
  InboxNotification,
  NotificationCategory,
  NotificationPayload,
  NotificationType,
} from "../domain/types";

import { getDatabase } from "../database/connection";

export interface NewInboxNotification {
  userId: string;
  groupId: string;
  type: NotificationType;
  category?: NotificationCategory | null;
  title?: string | null;
  body: string;
  data: NotificationPayload["data"];
}

export interface ListInboxOptions {
  limit?: number;
  // Opaque cursor of the form `${created_at}|${id}`. The id tiebreaker is
  // load-bearing: chunked inserts share a single `created_at`, so without it
  // a page boundary that lands inside a chunk drops or duplicates rows.
  before?: string;
}

export interface ListInboxResult {
  items: InboxNotification[];
  hasMore: boolean;
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const CURSOR_SEP = "|";

function generateId(): string {
  return nanoid();
}

function parseCursor(
  cursor: string,
): { createdAt: string; id: string } | null {
  const sep = cursor.indexOf(CURSOR_SEP);
  if (sep <= 0 || sep === cursor.length - 1) return null;
  return {
    createdAt: cursor.slice(0, sep),
    id: cursor.slice(sep + 1),
  };
}

function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}${CURSOR_SEP}${id}`;
}

function rowToInbox(row: {
  id: string;
  user_id: string;
  group_id: string;
  type: string;
  category: string | null;
  title: string | null;
  body: string;
  data_json: string;
  read_at: string | null;
  created_at: string;
}): InboxNotification {
  let parsed: NotificationPayload["data"] = undefined;
  try {
    parsed = row.data_json ? JSON.parse(row.data_json) : undefined;
  } catch {
    parsed = undefined;
  }
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    type: row.type as NotificationType,
    category: (row.category as NotificationCategory | null) ?? null,
    title: row.title,
    body: row.body,
    data: parsed,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export class TursoNotificationInboxRepository {
  private get db() {
    return getDatabase();
  }

  async insertMany(rows: NewInboxNotification[]): Promise<void> {
    if (rows.length === 0) return;
    // Single timestamp shared by every row in this call is intentional:
    // a fan-out is conceptually one event, and the (created_at, id) cursor
    // tiebreaks within the slice. Don't recompute per-chunk.
    const now = new Date().toISOString();

    // Chunk to stay within SQLite parameter limits (~999 binds; 10 cols/row).
    const chunkSize = 90;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map((r) => ({
        id: generateId(),
        user_id: r.userId,
        group_id: r.groupId,
        type: r.type,
        category: r.category ?? null,
        title: r.title ?? null,
        body: r.body,
        data_json: JSON.stringify(r.data ?? {}),
        read_at: null,
        created_at: now,
      }));
      await this.db.insertInto("notifications").values(chunk).execute();
    }
  }

  async listByUserAndGroup(
    userId: string,
    groupId: string,
    opts: ListInboxOptions = {},
  ): Promise<ListInboxResult> {
    const requested = opts.limit ?? DEFAULT_LIMIT;
    const limit = Math.min(Math.max(requested, 1), MAX_LIMIT);

    let query = this.db
      .selectFrom("notifications")
      .selectAll()
      .where("user_id", "=", userId)
      .where("group_id", "=", groupId)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .limit(limit + 1);

    if (opts.before) {
      const cursor = parseCursor(opts.before);
      if (cursor) {
        query = query.where((eb) =>
          eb.or([
            eb("created_at", "<", cursor.createdAt),
            eb.and([
              eb("created_at", "=", cursor.createdAt),
              eb("id", "<", cursor.id),
            ]),
          ]),
        );
      }
    }

    const rows = await query.execute();
    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const last = trimmed[trimmed.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(last.created_at as string, last.id as string)
        : null;

    return {
      items: trimmed.map(rowToInbox),
      hasMore,
      nextCursor,
    };
  }

  async unreadCount(userId: string, groupId: string): Promise<number> {
    const row = await this.db
      .selectFrom("notifications")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("user_id", "=", userId)
      .where("group_id", "=", groupId)
      .where("read_at", "is", null)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .updateTable("notifications")
      .set({ read_at: now })
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .where("read_at", "is", null)
      .execute();
    return Number(result[0]?.numUpdatedRows ?? 0) > 0;
  }

  async markAllRead(userId: string, groupId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .updateTable("notifications")
      .set({ read_at: now })
      .where("user_id", "=", userId)
      .where("group_id", "=", groupId)
      .where("read_at", "is", null)
      .execute();
    return Number(result[0]?.numUpdatedRows ?? 0);
  }

  async deleteOlderThan(cutoffISO: string): Promise<number> {
    const result = await this.db
      .deleteFrom("notifications")
      .where("created_at", "<", cutoffISO)
      .execute();
    return Number(result[0]?.numDeletedRows ?? 0);
  }
}
