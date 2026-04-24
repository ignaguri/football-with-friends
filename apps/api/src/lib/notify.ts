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

async function getUserIdsWithPushTokens(excludeId?: string): Promise<string[]> {
  const db = getDatabase();
  let query = db
    .selectFrom("push_tokens")
    .select("user_id")
    .where("active", "=", 1)
    .distinct();

  if (excludeId) {
    query = query.where("user_id", "!=", excludeId);
  }

  const rows = await query.execute();
  return rows.map((r) => r.user_id);
}

async function getAdminUserIds(): Promise<string[]> {
  const db = getDatabase();
  const admins = await db.selectFrom("user").select("id").where("role", "=", "admin").execute();
  return admins.map((a) => a.id);
}

export async function notifyMatchCreated(match: Match, excludeUserId: string): Promise<void> {
  await safeNotify("match created", async () => {
    const [userIds, info] = await Promise.all([
      getUserIdsWithPushTokens(excludeUserId),
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

async function findUserIdByPhone(phone: string): Promise<string | null> {
  const row = await getDatabase()
    .selectFrom("user")
    .select("id")
    .where("phoneNumber", "=", phone)
    .executeTakeFirst();
  return row?.id ?? null;
}

// Skips if the target phone is already a member of the group — a push saying
// "you were invited" would be confusing when they're already in.
export async function notifyGroupInviteTarget(params: {
  targetPhone: string;
  groupId: string;
  groupName: string;
  inviterName: string;
  token: string;
}): Promise<void> {
  await safeNotify("group invite target", async () => {
    const userId = await findUserIdByPhone(params.targetPhone);
    if (!userId) return;
    const existing = await getRepositoryFactory().groupMembers.find(
      params.groupId,
      userId,
    );
    if (existing) return;
    await getNotificationService().sendToUser(
      userId,
      NotificationTemplates.groupInvite({
        groupName: params.groupName,
        inviterName: params.inviterName,
        token: params.token,
      }),
    );
  });
}
