// Migration: add-push-notifications

import { sql } from "kysely";

import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  console.log("🚀 Running up migration: add-push-notifications");

  // Create push_subscriptions table
  await db.schema
    .createTable("push_subscriptions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("endpoint", "text", (col) => col.notNull().unique())
    .addColumn("p256dh_key", "text", (col) => col.notNull())
    .addColumn("auth_key", "text", (col) => col.notNull())
    .addColumn("user_agent", "text")
    .addColumn("browser_info", "text")
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("last_used", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("active", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("vapid_subject", "text")
    .execute();

  // Create indexes for push_subscriptions
  await db.schema
    .createIndex("idx_push_subscriptions_user_id")
    .on("push_subscriptions")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_push_subscriptions_active")
    .on("push_subscriptions")
    .columns(["active", "user_id"])
    .execute();

  // Create notification_preferences table
  await db.schema
    .createTable("notification_preferences")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().unique())
    .addColumn("match_reminders", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .addColumn("match_updates", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .addColumn("player_changes", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("new_matches", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("match_cancelled", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .addColumn("reminder_times", "text", (col) =>
      col.defaultTo('["24", "2", "0.5"]').notNull(),
    )
    .addColumn("quiet_hours_start", "integer", (col) =>
      col.defaultTo(22).notNull(),
    )
    .addColumn("quiet_hours_end", "integer", (col) =>
      col.defaultTo(8).notNull(),
    )
    .addColumn("timezone", "text", (col) =>
      col.defaultTo("Europe/Berlin").notNull(),
    )
    .addColumn("location_radius_km", "integer", (col) =>
      col.defaultTo(10).notNull(),
    )
    .addColumn("preferred_locations", "text")
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create notification_queue table
  await db.schema
    .createTable("notification_queue")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("match_id", "text")
    .addColumn("notification_type", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("image_url", "text")
    .addColumn("actions", "text")
    .addColumn("data", "text")
    .addColumn("scheduled_for", "text", (col) => col.notNull())
    .addColumn("sent_at", "text")
    .addColumn("failed_at", "text")
    .addColumn("failure_reason", "text")
    .addColumn("retry_count", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("max_retries", "integer", (col) => col.defaultTo(3).notNull())
    .addColumn("priority", "text", (col) => col.defaultTo("normal").notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create indexes for notification_queue
  await db.schema
    .createIndex("idx_notification_queue_scheduled")
    .on("notification_queue")
    .columns(["scheduled_for", "sent_at"])
    .execute();

  await db.schema
    .createIndex("idx_notification_queue_user_id")
    .on("notification_queue")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_notification_queue_match_id")
    .on("notification_queue")
    .column("match_id")
    .execute();

  // Create notification_history table
  await db.schema
    .createTable("notification_history")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("match_id", "text")
    .addColumn("notification_type", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("sent_at", "text", (col) => col.notNull())
    .addColumn("clicked_at", "text")
    .addColumn("dismissed_at", "text")
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create indexes for notification_history
  await db.schema
    .createIndex("idx_notification_history_user_id")
    .on("notification_history")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_notification_history_sent_at")
    .on("notification_history")
    .column("sent_at")
    .execute();

  console.log("✅ Push notification tables created successfully");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  console.log("↩️ Running down migration: add-push-notifications");

  // Drop indexes first
  await db.schema.dropIndex("idx_notification_history_sent_at").execute();
  await db.schema.dropIndex("idx_notification_history_user_id").execute();
  await db.schema.dropIndex("idx_notification_queue_match_id").execute();
  await db.schema.dropIndex("idx_notification_queue_user_id").execute();
  await db.schema.dropIndex("idx_notification_queue_scheduled").execute();
  await db.schema.dropIndex("idx_push_subscriptions_active").execute();
  await db.schema.dropIndex("idx_push_subscriptions_user_id").execute();

  // Drop tables
  await db.schema.dropTable("notification_history").execute();
  await db.schema.dropTable("notification_queue").execute();
  await db.schema.dropTable("notification_preferences").execute();
  await db.schema.dropTable("push_subscriptions").execute();

  console.log("↩️ Push notification tables removed successfully");
};
