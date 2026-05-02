import { getRepositoryFactory } from "@repo/shared/repositories";

const RETENTION_DAYS = 10;
// The Workers cron fires every 30 min, but pruning a 10-day window doesn't
// need that cadence. Run once per day in the 03:00 UTC half-hour slot — the
// every-30-min scheduler would otherwise issue 48 redundant DELETEs.
// `force` skips this gate (used by the manual trigger endpoint).
const DAILY_RUN_HOUR_UTC = 3;

export interface PruneResult {
  deleted: number;
  cutoff: string;
  skipped?: false;
}
export interface PruneSkipped {
  skipped: true;
  reason: "outside-daily-window";
}

/**
 * Delete inbox rows older than RETENTION_DAYS to keep the notifications
 * table small.
 */
export async function pruneInboxNotifications(
  opts: { force?: boolean } = {},
): Promise<PruneResult | PruneSkipped> {
  if (!opts.force) {
    const now = new Date();
    if (now.getUTCHours() !== DAILY_RUN_HOUR_UTC || now.getUTCMinutes() >= 30) {
      return { skipped: true, reason: "outside-daily-window" };
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const deleted = await getRepositoryFactory().notificationInbox.deleteOlderThan(cutoff);

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
