#!/usr/bin/env tsx
// Script to process scheduled notifications from the queue
// Run this as a cron job or background service

import type {
  NotificationRequest,
  NotificationType,
} from "../lib/notifications/types";

import { getDatabase } from "../lib/database/connection";
import { createNotificationProvider } from "../lib/notifications/provider-factory";

const db = getDatabase();
const provider = createNotificationProvider();

async function processNotificationQueue() {
  console.log(
    `[${new Date().toISOString()}] 🔄 Processing notification queue...`,
  );

  try {
    // Get notifications that are due to be sent
    const dueNotifications = await db
      .selectFrom("notification_queue")
      .selectAll()
      .where("sent_at", "is", null)
      .where("failed_at", "is", null)
      .where("scheduled_for", "<=", new Date().toISOString())
      .where((eb) => eb("retry_count", "<", eb.ref("max_retries")))
      .orderBy("priority", "desc")
      .orderBy("scheduled_for", "asc")
      .limit(100) // Process in batches
      .execute();

    if (dueNotifications.length === 0) {
      console.log("✅ No notifications due to be sent");
      return;
    }

    console.log(`📬 Found ${dueNotifications.length} notifications to send`);

    let successCount = 0;
    let failureCount = 0;

    // Process each notification
    for (const queuedNotification of dueNotifications) {
      try {
        const notificationRequest: NotificationRequest = {
          userId: queuedNotification.user_id,
          type: queuedNotification.notification_type as NotificationType,
          title: queuedNotification.title,
          body: queuedNotification.body,
          data: queuedNotification.data
            ? JSON.parse(queuedNotification.data)
            : undefined,
          image: queuedNotification.image_url || undefined,
          actions: queuedNotification.actions
            ? JSON.parse(queuedNotification.actions)
            : undefined,
          urgent: queuedNotification.priority === "high",
        };

        const result = await provider.send(notificationRequest);

        if (result.success) {
          // Mark as sent
          await db
            .updateTable("notification_queue")
            .set({
              sent_at: new Date().toISOString(),
            })
            .where("id", "=", queuedNotification.id)
            .execute();

          successCount++;
          console.log(
            `✅ Sent notification ${queuedNotification.id} to user ${queuedNotification.user_id}`,
          );
        } else {
          // Increment retry count
          const newRetryCount = queuedNotification.retry_count + 1;

          if (newRetryCount >= queuedNotification.max_retries) {
            // Max retries reached, mark as failed
            await db
              .updateTable("notification_queue")
              .set({
                failed_at: new Date().toISOString(),
                failure_reason: result.error || "Max retries exceeded",
                retry_count: newRetryCount,
              })
              .where("id", "=", queuedNotification.id)
              .execute();

            failureCount++;
            console.error(
              `❌ Failed notification ${queuedNotification.id} (max retries): ${result.error}`,
            );
          } else {
            // Schedule for retry
            await db
              .updateTable("notification_queue")
              .set({
                retry_count: newRetryCount,
                failure_reason: result.error || "Unknown error",
              })
              .where("id", "=", queuedNotification.id)
              .execute();

            console.warn(
              `⚠️  Retry ${newRetryCount}/${queuedNotification.max_retries} for notification ${queuedNotification.id}: ${result.error}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error processing notification ${queuedNotification.id}:`,
          error,
        );

        // Increment retry count
        const newRetryCount = queuedNotification.retry_count + 1;

        await db
          .updateTable("notification_queue")
          .set({
            retry_count: newRetryCount,
            failure_reason:
              error instanceof Error ? error.message : "Unknown error",
            ...(newRetryCount >= queuedNotification.max_retries && {
              failed_at: new Date().toISOString(),
            }),
          })
          .where("id", "=", queuedNotification.id)
          .execute();

        failureCount++;
      }
    }

    console.log(`\n📊 Processing complete:`);
    console.log(`   ✅ Sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📝 Total processed: ${dueNotifications.length}\n`);

    // Clean up old successfully sent notifications (older than 30 days)
    await cleanupOldNotifications();
  } catch (error) {
    console.error("❌ Error processing notification queue:", error);
    throw error;
  }
}

async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await db
      .deleteFrom("notification_queue")
      .where("sent_at", "is not", null)
      .where("sent_at", "<", thirtyDaysAgo.toISOString())
      .execute();

    if (result.length > 0) {
      console.log(
        `🧹 Cleaned up ${result.length} old notifications (>30 days)`,
      );
    }
  } catch (error) {
    console.error("⚠️  Error cleaning up old notifications:", error);
  }
}

async function getQueueStats() {
  const pending = await db
    .selectFrom("notification_queue")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("sent_at", "is", null)
    .where("failed_at", "is", null)
    .executeTakeFirst();

  const failed = await db
    .selectFrom("notification_queue")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("failed_at", "is not", null)
    .executeTakeFirst();

  const sent = await db
    .selectFrom("notification_queue")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("sent_at", "is not", null)
    .executeTakeFirst();

  return {
    pending: pending?.count || 0,
    failed: failed?.count || 0,
    sent: sent?.count || 0,
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "process";

  switch (command) {
    case "process":
      await processNotificationQueue();
      break;

    case "stats":
      const stats = await getQueueStats();
      console.log("\n📊 Notification Queue Statistics:");
      console.log(`   ⏳ Pending: ${stats.pending}`);
      console.log(`   ✅ Sent: ${stats.sent}`);
      console.log(`   ❌ Failed: ${stats.failed}`);
      console.log(
        `   📝 Total: ${stats.pending + stats.sent + stats.failed}\n`,
      );
      break;

    case "watch":
      console.log("👀 Starting notification queue processor in watch mode...");
      console.log("   Processing every 60 seconds. Press Ctrl+C to stop.\n");

      // Process immediately
      await processNotificationQueue();

      // Then process every 60 seconds
      setInterval(async () => {
        await processNotificationQueue();
      }, 60 * 1000);
      break;

    case "help":
      console.log("\n📚 Notification Queue Processor");
      console.log("\nUsage: pnpm push:process-queue [command]\n");
      console.log("Commands:");
      console.log("  process (default)  Process due notifications once");
      console.log("  stats              Show queue statistics");
      console.log("  watch              Run continuously (every 60s)");
      console.log("  help               Show this help message\n");
      console.log("Examples:");
      console.log("  pnpm push:process-queue");
      console.log("  pnpm push:process-queue stats");
      console.log("  pnpm push:process-queue watch\n");
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log("Run 'pnpm push:process-queue help' for usage information");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
