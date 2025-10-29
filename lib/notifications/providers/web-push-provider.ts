// Web Push provider implementation using the web-push library

import { getDatabase } from "@/lib/database/connection";
import { nanoid } from "nanoid";
import webpush from "web-push";

import type {
  NotificationProvider,
  NotificationRequest,
  ScheduledNotificationRequest,
  NotificationResult,
  NotificationStatus,
  WebPushConfig,
  PushSubscriptionData,
} from "../types";

export class WebPushProvider implements NotificationProvider {
  private db = getDatabase();

  constructor(private config: WebPushConfig) {
    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      config.vapidKeys.subject || "mailto:admin@football-with-friends.com",
      config.vapidKeys.publicKey,
      config.vapidKeys.privateKey,
    );
  }

  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      // Get user's push subscriptions
      const subscriptions = await this.getUserSubscriptions(
        notification.userId,
      );

      if (subscriptions.length === 0) {
        return {
          success: false,
          error: "No push subscriptions found for user",
          deliveredTo: 0,
        };
      }

      // Prepare notification payload
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        image: notification.image,
        actions: notification.actions,
        data: {
          type: notification.type,
          url: this.generateNotificationUrl(notification),
          ...notification.data,
        },
        tag: notification.tag,
        requireInteraction: notification.urgent || false,
        silent: notification.silent || false,
        vibrate: notification.vibrate || [200, 100, 200],
        timestamp: Date.now(),
      });

      // Send to all user's subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(async (subscription) => {
          try {
            const pushSubscription = {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            };

            await webpush.sendNotification(pushSubscription, payload);

            // Update last_used timestamp
            await this.updateSubscriptionUsage(subscription.endpoint);

            return { success: true };
          } catch (error) {
            console.error("Failed to send to subscription:", error);

            // Handle invalid subscriptions
            if (error instanceof Error && error.message.includes("410")) {
              await this.removeInvalidSubscription(subscription.endpoint);
            }

            throw error;
          }
        }),
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const messageId = nanoid();

      // Store in notification history
      await this.storeNotificationHistory({
        id: messageId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        sentAt: new Date(),
      });

      return {
        success: successCount > 0,
        messageId,
        deliveredTo: successCount,
        error:
          successCount === 0
            ? "Failed to deliver to all subscriptions"
            : undefined,
      };
    } catch (error) {
      console.error("WebPush send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        deliveredTo: 0,
      };
    }
  }

  async scheduleNotification(
    notification: ScheduledNotificationRequest,
  ): Promise<string> {
    const queueId = nanoid();

    // Store in notification queue
    await this.db
      .insertInto("notification_queue")
      .values({
        id: queueId,
        user_id: notification.userId,
        match_id: notification.data?.matchId as string,
        notification_type: notification.type,
        title: notification.title,
        body: notification.body,
        image_url: notification.image || null,
        actions: notification.actions
          ? JSON.stringify(notification.actions)
          : null,
        data: notification.data ? JSON.stringify(notification.data) : null,
        scheduled_for: notification.scheduledFor.toISOString(),
        retry_count: 0,
        max_retries: notification.maxRetries || 3,
        priority: notification.priority || "normal",
        created_at: new Date().toISOString(),
      })
      .execute();

    return queueId;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await this.db
      .updateTable("notification_queue")
      .set({
        failed_at: new Date().toISOString(),
        failure_reason: "Cancelled by user",
      })
      .where("id", "=", notificationId)
      .where("sent_at", "is", null)
      .execute();
  }

  async getDeliveryStatus(notificationId: string): Promise<NotificationStatus> {
    const queueItem = await this.db
      .selectFrom("notification_queue")
      .select(["id", "sent_at", "failed_at", "failure_reason", "retry_count"])
      .where("id", "=", notificationId)
      .executeTakeFirst();

    if (!queueItem) {
      throw new Error("Notification not found");
    }

    let status: NotificationStatus["status"] = "pending";
    if (queueItem.sent_at) {
      status = "sent";
    } else if (queueItem.failed_at) {
      status = "failed";
    }

    return {
      id: queueItem.id,
      status,
      sentAt: queueItem.sent_at ? new Date(queueItem.sent_at) : undefined,
      failureReason: queueItem.failure_reason || undefined,
      retryCount: queueItem.retry_count || 0,
    };
  }

  async sendBulk(
    notifications: NotificationRequest[],
  ): Promise<NotificationResult[]> {
    const results = await Promise.all(
      notifications.map((notification) => this.send(notification)),
    );
    return results;
  }

  // Private helper methods
  private async getUserSubscriptions(
    userId: string,
  ): Promise<PushSubscriptionData[]> {
    const subscriptions = await this.db
      .selectFrom("push_subscriptions")
      .select(["endpoint", "p256dh_key", "auth_key"])
      .where("user_id", "=", userId)
      .where("active", "=", true)
      .execute();

    return subscriptions.map((sub) => ({
      userId,
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh_key,
        auth: sub.auth_key,
      },
    }));
  }

  private generateNotificationUrl(notification: NotificationRequest): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://football-with-friends.vercel.app";

    switch (notification.type) {
      case "match_reminder":
      case "match_update":
      case "match_cancelled":
        return `${baseUrl}/matches/${notification.data?.matchId}`;
      case "player_joined":
      case "player_left":
        return `${baseUrl}/organizer/matches/${notification.data?.matchId}`;
      case "new_match":
        return `${baseUrl}/matches`;
      default:
        return baseUrl;
    }
  }

  private async updateSubscriptionUsage(endpoint: string): Promise<void> {
    await this.db
      .updateTable("push_subscriptions")
      .set({ last_used: new Date().toISOString() })
      .where("endpoint", "=", endpoint)
      .execute();
  }

  private async removeInvalidSubscription(endpoint: string): Promise<void> {
    await this.db
      .updateTable("push_subscriptions")
      .set({ active: false })
      .where("endpoint", "=", endpoint)
      .execute();
  }

  private async storeNotificationHistory(data: {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    sentAt: Date;
  }): Promise<void> {
    await this.db
      .insertInto("notification_history")
      .values({
        id: data.id,
        user_id: data.userId,
        match_id: null, // Will be populated from notification data if needed
        notification_type: data.type,
        title: data.title,
        body: data.body,
        sent_at: data.sentAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .execute();
  }
}
