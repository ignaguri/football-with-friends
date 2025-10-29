// Helper functions to trigger notifications from various match actions
// Import these functions in your API routes or services

import { NotificationService } from "./notification-service";

const notificationService = new NotificationService();

/**
 * Trigger notifications when a new match is created
 */
export async function notifyNewMatch(matchId: string): Promise<void> {
  try {
    await notificationService.notifyNewMatch(matchId);
  } catch (error) {
    console.error("Error triggering new match notifications:", error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Schedule reminders when a new match is created or when a user signs up
 */
export async function scheduleMatchReminders(matchId: string): Promise<void> {
  try {
    await notificationService.scheduleMatchReminders(matchId);
  } catch (error) {
    console.error("Error scheduling match reminders:", error);
  }
}

/**
 * Notify when a match is updated
 */
export async function notifyMatchUpdate(
  matchId: string,
  changeType: "time" | "location" | "court" | "cost" | "general",
): Promise<void> {
  try {
    await notificationService.notifyMatchUpdate(matchId, changeType);
  } catch (error) {
    console.error("Error triggering match update notifications:", error);
  }
}

/**
 * Notify organizer when a player joins
 */
export async function notifyPlayerJoined(
  matchId: string,
  playerName: string,
): Promise<void> {
  try {
    await notificationService.notifyPlayerChange(matchId, playerName, "joined");
  } catch (error) {
    console.error("Error triggering player joined notification:", error);
  }
}

/**
 * Notify organizer when a player leaves
 */
export async function notifyPlayerLeft(
  matchId: string,
  playerName: string,
): Promise<void> {
  try {
    await notificationService.notifyPlayerChange(matchId, playerName, "left");
  } catch (error) {
    console.error("Error triggering player left notification:", error);
  }
}

/**
 * Notify all players when a match is cancelled
 */
export async function notifyMatchCancellation(
  matchId: string,
  reason?: string,
): Promise<void> {
  try {
    await notificationService.notifyMatchCancellation(matchId, reason);
  } catch (error) {
    console.error("Error triggering match cancellation notifications:", error);
  }
}

/**
 * Send a specific match reminder (called by queue processor)
 */
export async function sendMatchReminder(
  matchId: string,
  reminderType: "24h" | "2h" | "30m",
): Promise<void> {
  try {
    await notificationService.sendMatchReminder(matchId, reminderType);
  } catch (error) {
    console.error("Error sending match reminder:", error);
  }
}
