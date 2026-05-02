// Thin wrapper used by notify helpers + crons to persist inbox rows.
// Persistence is unconditional (independent of push opt-out): a user with push
// off should still see entries in their inbox. Failures are swallowed and
// logged so a DB hiccup never blocks the push send path.

import { getRepositoryFactory } from "@repo/shared/repositories";

import type {
  NotificationCategory,
  NotificationPayload,
  NotificationType,
} from "@repo/shared/domain";

export interface RecordForRecipientsInput {
  userIds: string[];
  groupId: string;
  type: NotificationType;
  category?: NotificationCategory;
  payload: NotificationPayload;
}

export async function recordForRecipients(input: RecordForRecipientsInput): Promise<void> {
  const { userIds, groupId, type, category, payload } = input;
  if (userIds.length === 0) return;

  try {
    const repo = getRepositoryFactory().notificationInbox;
    const rows = userIds.map((userId) => ({
      userId,
      groupId,
      type,
      category: category ?? null,
      title: payload.title ?? null,
      body: payload.body,
      data: payload.data,
    }));
    await repo.insertMany(rows);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "inbox.record_failed",
        type,
        groupId,
        recipients: userIds.length,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
