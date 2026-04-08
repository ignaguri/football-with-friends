/**
 * Fire-and-forget notification helpers for route handlers.
 * Each function catches its own errors so it never breaks the main request.
 */
import { getServiceFactory } from "@repo/shared/services";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getDatabase } from "@repo/shared/database";
import { NotificationTemplates } from "@repo/shared/services";
import type { Match } from "@repo/shared/domain";

const getNotificationService = () => getServiceFactory().notificationService;
const getSignupRepo = () => getRepositoryFactory().signups;

interface MatchInfo {
  id: string;
  date: string;
  time: string;
  locationName?: string;
}

async function getMatchInfo(match: Match): Promise<MatchInfo> {
  let locationName: string | undefined;
  try {
    const location = await getRepositoryFactory().locations.findById(match.locationId);
    locationName = location?.name;
  } catch {
    // Best-effort
  }
  return { id: match.id, date: match.date, time: match.time, locationName };
}

/** Notify all users (except excludeUserId) about a new match */
export async function notifyMatchCreated(match: Match, excludeUserId: string): Promise<void> {
  try {
    const db = getDatabase();
    const users = await db.selectFrom("user").select("id").execute();
    const userIds = users.map((u) => u.id).filter((id) => id !== excludeUserId);
    if (userIds.length === 0) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchCreated(info));
  } catch (error) {
    console.error("[NOTIFY] Failed to send match created notifications:", error);
  }
}

/** Notify signed-up players about match updates */
export async function notifyMatchUpdated(match: Match, changes: string): Promise<void> {
  try {
    const userIds = await getSignupRepo().getSignedUpUserIds(match.id);
    if (userIds.length === 0) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchUpdated(info, changes));
  } catch (error) {
    console.error("[NOTIFY] Failed to send match updated notifications:", error);
  }
}

/** Notify signed-up players about match cancellation */
export async function notifyMatchCancelled(match: Match): Promise<void> {
  try {
    const userIds = await getSignupRepo().getSignedUpUserIds(match.id);
    if (userIds.length === 0) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchCancelled(info));
  } catch (error) {
    console.error("[NOTIFY] Failed to send match cancelled notifications:", error);
  }
}

/** Notify a player that they've been confirmed (marked as PAID) */
export async function notifyPlayerConfirmed(matchId: string, userId: string): Promise<void> {
  try {
    const match = await getRepositoryFactory().matches.findById(matchId);
    if (!match) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.playerConfirmed(info));
  } catch (error) {
    console.error("[NOTIFY] Failed to send player confirmed notification:", error);
  }
}

/** Notify a substitute that they've been promoted */
export async function notifySubstitutePromoted(matchId: string, userId: string): Promise<void> {
  try {
    const match = await getRepositoryFactory().matches.findById(matchId);
    if (!match) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.substitutePromoted(info));
  } catch (error) {
    console.error("[NOTIFY] Failed to send substitute promoted notification:", error);
  }
}

/** Notify admins that a player cancelled */
export async function notifyPlayerCancelled(matchId: string, playerName: string): Promise<void> {
  try {
    const db = getDatabase();
    const admins = await db.selectFrom("user").select("id").where("role", "=", "admin").execute();
    const adminIds = admins.map((a) => a.id);
    if (adminIds.length === 0) return;

    const match = await getRepositoryFactory().matches.findById(matchId);
    if (!match) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUsers(adminIds, NotificationTemplates.playerCancelled(info, playerName));
  } catch (error) {
    console.error("[NOTIFY] Failed to send player cancelled notification:", error);
  }
}

/** Notify a player that they've been removed from a match by admin */
export async function notifyRemovedFromMatch(matchId: string, userId: string): Promise<void> {
  try {
    const match = await getRepositoryFactory().matches.findById(matchId);
    if (!match) return;

    const info = await getMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.removedFromMatch(info));
  } catch (error) {
    console.error("[NOTIFY] Failed to send removed from match notification:", error);
  }
}
