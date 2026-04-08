import { getServiceFactory } from "@repo/shared/services";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getDatabase } from "@repo/shared/database";
import { NotificationTemplates } from "@repo/shared/services";
import type { Match } from "@repo/shared/domain";
import type { NotificationMatchInfo } from "@repo/shared/domain";

const getNotificationService = () => getServiceFactory().notificationService;

async function safeNotify(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[NOTIFY] ${name}:`, error);
  }
}

async function toMatchInfo(match: Match): Promise<NotificationMatchInfo> {
  let locationName: string | undefined;
  try {
    const location = await getRepositoryFactory().locations.findById(match.locationId);
    locationName = location?.name;
  } catch {
    // Best-effort — notification still sends without location name
  }
  return { id: match.id, date: match.date, time: match.time, locationName };
}

async function getAllUserIds(excludeId?: string): Promise<string[]> {
  const db = getDatabase();
  const users = await db.selectFrom("user").select("id").execute();
  return users.map((u) => u.id).filter((id) => id !== excludeId);
}

async function getAdminUserIds(): Promise<string[]> {
  const db = getDatabase();
  const admins = await db.selectFrom("user").select("id").where("role", "=", "admin").execute();
  return admins.map((a) => a.id);
}

export async function notifyMatchCreated(match: Match, excludeUserId: string): Promise<void> {
  await safeNotify("match created", async () => {
    const [userIds, info] = await Promise.all([
      getAllUserIds(excludeUserId),
      toMatchInfo(match),
    ]);
    if (userIds.length === 0) return;
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchCreated(info));
  });
}

export async function notifyMatchUpdated(match: Match, changes: string): Promise<void> {
  await safeNotify("match updated", async () => {
    const [userIds, info] = await Promise.all([
      getRepositoryFactory().signups.getSignedUpUserIds(match.id),
      toMatchInfo(match),
    ]);
    if (userIds.length === 0) return;
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchUpdated(info, changes));
  });
}

export async function notifyMatchCancelled(match: Match): Promise<void> {
  await safeNotify("match cancelled", async () => {
    const [userIds, info] = await Promise.all([
      getRepositoryFactory().signups.getSignedUpUserIds(match.id),
      toMatchInfo(match),
    ]);
    if (userIds.length === 0) return;
    await getNotificationService().sendToUsers(userIds, NotificationTemplates.matchCancelled(info));
  });
}

export async function notifyPlayerConfirmed(match: Match, userId: string): Promise<void> {
  await safeNotify("player confirmed", async () => {
    const info = await toMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.playerConfirmed(info));
  });
}

export async function notifySubstitutePromoted(match: Match, userId: string): Promise<void> {
  await safeNotify("substitute promoted", async () => {
    const info = await toMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.substitutePromoted(info));
  });
}

export async function notifyPlayerCancelled(match: Match, playerName: string): Promise<void> {
  await safeNotify("player cancelled", async () => {
    const [adminIds, info] = await Promise.all([
      getAdminUserIds(),
      toMatchInfo(match),
    ]);
    if (adminIds.length === 0) return;
    await getNotificationService().sendToUsers(adminIds, NotificationTemplates.playerCancelled(info, playerName));
  });
}

export async function notifyRemovedFromMatch(match: Match, userId: string): Promise<void> {
  await safeNotify("removed from match", async () => {
    const info = await toMatchInfo(match);
    await getNotificationService().sendToUser(userId, NotificationTemplates.removedFromMatch(info));
  });
}
