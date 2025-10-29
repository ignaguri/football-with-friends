// Notification system types and interfaces

export enum NotificationType {
  MATCH_REMINDER = "match_reminder",
  MATCH_UPDATE = "match_update",
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  MATCH_FULL = "match_full",
  SPOT_AVAILABLE = "spot_available",
  NEW_MATCH = "new_match",
  MATCH_CANCELLED = "match_cancelled",
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  url?: string;
}

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  urgent?: boolean;
  image?: string;
  actions?: NotificationAction[];
  tag?: string;
  silent?: boolean;
  vibrate?: number[];
}

export interface ScheduledNotificationRequest extends NotificationRequest {
  scheduledFor: Date;
  timezone?: string;
  maxRetries?: number;
  priority?: "low" | "normal" | "high";
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredTo?: number;
}

export interface NotificationStatus {
  id: string;
  status: "pending" | "sent" | "delivered" | "failed" | "clicked" | "dismissed";
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount?: number;
}

export interface NotificationPreferences {
  matchReminders: boolean;
  matchUpdates: boolean;
  playerChanges: boolean;
  newMatches: boolean;
  matchCancelled: boolean;
  reminderTimes: number[]; // hours before match
  quietHoursStart: number; // 0-23 hour format
  quietHoursEnd: number; // 0-23 hour format
  timezone: string;
  locationRadiusKm: number;
  preferredLocations?: string[];
}

export interface PushSubscriptionData {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  browserInfo?: {
    name: string;
    version: string;
    os: string;
  };
}

// Abstract notification provider interface
export interface NotificationProvider {
  /**
   * Send immediate notification to user
   */
  send(notification: NotificationRequest): Promise<NotificationResult>;

  /**
   * Schedule notification for future delivery
   */
  scheduleNotification(
    notification: ScheduledNotificationRequest,
  ): Promise<string>;

  /**
   * Cancel a scheduled notification
   */
  cancelNotification(notificationId: string): Promise<void>;

  /**
   * Get delivery status of a notification
   */
  getDeliveryStatus(notificationId: string): Promise<NotificationStatus>;

  /**
   * Send notification to multiple users
   */
  sendBulk(notifications: NotificationRequest[]): Promise<NotificationResult[]>;
}

// Provider configuration interfaces
export interface WebPushConfig {
  vapidKeys: {
    publicKey: string;
    privateKey: string;
    subject?: string;
  };
}

export interface NovuConfig {
  apiKey: string;
  applicationId: string;
  baseUrl?: string;
}

export type NotificationProviderConfig = WebPushConfig | NovuConfig;

// Business logic types for match notifications
export interface MatchNotificationContext {
  matchId: string;
  match: {
    date: string;
    time: string;
    location: string;
    court?: string;
    maxPlayers: number;
    currentPlayers: number;
  };
  organizer: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ReminderSchedule {
  matchId: string;
  reminders: {
    type: "24h" | "2h" | "30m";
    scheduledFor: Date;
  }[];
}
