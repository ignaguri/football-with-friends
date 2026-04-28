import { getRepositoryFactory } from "@repo/shared/repositories";

const RETENTION_DAYS = 10;

/**
 * Delete inbox rows older than RETENTION_DAYS to keep the notifications
 * table small. The cron triggers run every 30 minutes; this job is cheap and
 * idempotent (a single DELETE on a created_at index).
 */
export async function pruneInboxNotifications() {
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const deleted =
      await getRepositoryFactory().notificationInbox.deleteOlderThan(cutoff);

    console.log(
      JSON.stringify({
        event: "inbox.pruned",
        cutoff,
        deleted,
        retentionDays: RETENTION_DAYS,
      }),
    );

    return { deleted, cutoff };
  } catch (error) {
    console.error("[CRON] Error pruning inbox notifications:", error);
    throw error;
  }
}
