// Notification service for sending push notifications via Expo Push API

import type {
  ExpoPushMessage,
  ExpoPushTicket,
  NotificationPayload,
  PushTokenInfo,
} from "../domain/types";
import type { PushTokenRepository } from "../repositories/interfaces";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_LIMIT = 100;

export class NotificationService {
  constructor(
    private readonly pushTokenRepository: PushTokenRepository,
    private readonly accessToken?: string,
  ) {}

  async registerToken(data: {
    userId: string;
    token: string;
    platform: "ios" | "android";
    deviceId?: string;
  }): Promise<PushTokenInfo> {
    return this.pushTokenRepository.upsert(data);
  }

  async unregisterToken(token: string): Promise<void> {
    return this.pushTokenRepository.deactivateToken(token);
  }

  async unregisterAllForUser(userId: string): Promise<void> {
    return this.pushTokenRepository.deactivateByUserId(userId);
  }

  async sendToUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<ExpoPushTicket[]> {
    const tokens = await this.pushTokenRepository.findActiveByUserId(userId);
    if (tokens.length === 0) return [];

    return this.sendToTokens(tokens, payload);
  }

  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<ExpoPushTicket[]> {
    if (userIds.length === 0) return [];

    const tokens = await this.pushTokenRepository.findActiveByUserIds(userIds);
    if (tokens.length === 0) return [];

    return this.sendToTokens(tokens, payload);
  }

  private async sendToTokens(
    tokens: PushTokenInfo[],
    payload: NotificationPayload,
  ): Promise<ExpoPushTicket[]> {
    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default",
      priority: "high",
    }));

    return this.sendPushNotifications(messages);
  }

  private async sendPushNotifications(
    messages: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]> {
    const allTickets: ExpoPushTicket[] = [];

    // Chunk into batches of EXPO_BATCH_LIMIT
    for (let i = 0; i < messages.length; i += EXPO_BATCH_LIMIT) {
      const chunk = messages.slice(i, i + EXPO_BATCH_LIMIT);

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (this.accessToken) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      }

      try {
        const response = await fetch(EXPO_PUSH_API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          console.error(
            `Expo Push API error: ${response.status} ${response.statusText}`,
          );
          continue;
        }

        const result = (await response.json()) as {
          data: ExpoPushTicket[];
        };

        // Handle invalid tokens
        for (let j = 0; j < result.data.length; j++) {
          const ticket = result.data[j]!;
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            // Deactivate the invalid token
            const invalidToken = chunk[j]!.to;
            console.log(
              `Deactivating invalid push token: ${invalidToken.substring(0, 20)}...`,
            );
            await this.pushTokenRepository.deactivateToken(invalidToken);
          }
        }

        allTickets.push(...result.data);
      } catch (error) {
        console.error("Failed to send push notifications:", error);
      }
    }

    return allTickets;
  }
}
