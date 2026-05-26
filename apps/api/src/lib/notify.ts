import { getServiceFactory } from "@repo/shared/services";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getDatabase } from "@repo/shared/database";
import { NotificationTemplates } from "@repo/shared/services";
import type { Match } from "@repo/shared/domain";
import type { NotificationMatchInfo } from "@repo/shared/domain";
import { NOTIFICATION_TYPES } from "@repo/shared/domain";

import { recordForRecipients } from "./notification-inbox";

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
  let query = db.selectFrom("push_tokens").select("user_id").where("active", "=", 1).distinct();

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

// Intersect a recipient list with the active members of a group. Used to
// avoid recording inbox rows for users who don't belong to the match's group
// (the existing push helpers fan out across all users with push tokens).
async function getGroupMemberIds(groupId: string): Promise<Set<string>> {
  const members = await getRepositoryFactory().groupMembers.listByGroup(groupId);
  return new Set(members.map((m) => m.userId));
}

function intersect(userIds: string[], allowed: Set<string>): string[] {
  return userIds.filter((id) => allowed.has(id));
}

export async function notifyMatchCreated(match: Match, excludeUserId: string): Promise<void> {
  await safeNotify("match created", async () => {
    const [userIds, info, memberSet] = await Promise.all([
      getUserIdsWithPushTokens(excludeUserId),
      toMatchInfo(match),
      getGroupMemberIds(match.groupId),
    ]);
    const recipients = intersect(userIds, memberSet);
    if (recipients.length === 0) return;
    const payload = NotificationTemplates.matchCreated(info);
    await recordForRecipients({
      userIds: recipients,
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.MATCH_CREATED,
      category: "new_match",
      payload,
    });
    await getNotificationService().sendToUsers(recipients, payload, {
      category: "new_match",
    });
  });
}

export async function notifyMatchUpdated(match: Match, changes: string): Promise<void> {
  await safeNotify("match updated", async () => {
    const [userIds, info] = await Promise.all([
      getRepositoryFactory().signups.getSignedUpUserIds(match.id),
      toMatchInfo(match),
    ]);
    if (userIds.length === 0) return;
    const payload = NotificationTemplates.matchUpdated(info, changes);
    await recordForRecipients({
      userIds,
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.MATCH_UPDATED,
      payload,
    });
    await getNotificationService().sendToUsers(userIds, payload);
  });
}

export async function notifyMatchCancelled(match: Match): Promise<void> {
  await safeNotify("match cancelled", async () => {
    const [userIds, info] = await Promise.all([
      getRepositoryFactory().signups.getSignedUpUserIds(match.id),
      toMatchInfo(match),
    ]);
    if (userIds.length === 0) return;
    const payload = NotificationTemplates.matchCancelled(info);
    await recordForRecipients({
      userIds,
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.MATCH_CANCELLED,
      payload,
    });
    await getNotificationService().sendToUsers(userIds, payload);
  });
}

export async function notifyPlayerConfirmed(match: Match, userId: string): Promise<void> {
  await safeNotify("player confirmed", async () => {
    const info = await toMatchInfo(match);
    const payload = NotificationTemplates.playerConfirmed(info);
    await recordForRecipients({
      userIds: [userId],
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.PLAYER_CONFIRMED,
      payload,
    });
    await getNotificationService().sendToUser(userId, payload);
  });
}

export async function notifySubstitutePromoted(match: Match, userId: string): Promise<void> {
  await safeNotify("substitute promoted", async () => {
    const info = await toMatchInfo(match);
    const payload = NotificationTemplates.substitutePromoted(info);
    await recordForRecipients({
      userIds: [userId],
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.SUBSTITUTE_PROMOTED,
      category: "promo_to_confirmed",
      payload,
    });
    await getNotificationService().sendToUser(userId, payload, {
      category: "promo_to_confirmed",
    });
  });
}

export async function notifyPlayerCancelled(match: Match, playerName: string): Promise<void> {
  await safeNotify("player cancelled", async () => {
    const [adminIds, info, memberSet] = await Promise.all([
      getAdminUserIds(),
      toMatchInfo(match),
      getGroupMemberIds(match.groupId),
    ]);
    const recipients = intersect(adminIds, memberSet);
    if (recipients.length === 0) return;
    const payload = NotificationTemplates.playerCancelled(info, playerName);
    await recordForRecipients({
      userIds: recipients,
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.PLAYER_CANCELLED,
      payload,
    });
    await getNotificationService().sendToUsers(recipients, payload);
  });
}

export async function notifyRemovedFromMatch(match: Match, userId: string): Promise<void> {
  await safeNotify("removed from match", async () => {
    const info = await toMatchInfo(match);
    const payload = NotificationTemplates.removedFromMatch(info);
    await recordForRecipients({
      userIds: [userId],
      groupId: match.groupId,
      type: NOTIFICATION_TYPES.REMOVED_FROM_MATCH,
      payload,
    });
    await getNotificationService().sendToUser(userId, payload);
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
//
// Group invites are intentionally NOT persisted to the inbox. The dedicated
// invite-acceptance UI surfaces them, and the target may not yet be a
// platform user when the invite is sent.
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
    const existing = await getRepositoryFactory().groupMembers.find(params.groupId, userId);
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

// Self-serve group-creation request lifecycle. Two of the three are push-only:
// a creation request has no group, and the persistent inbox is group-scoped
// (groupId NOT NULL). Only the approval (group now exists) records an inbox row.

export async function notifyAdminOfGroupRequest(params: {
  requesterName: string;
  groupName: string;
}): Promise<void> {
  await safeNotify("group request submitted", async () => {
    const adminIds = await getAdminUserIds();
    if (adminIds.length === 0) return;
    const payload = NotificationTemplates.groupRequestSubmitted({
      requesterName: params.requesterName,
      groupName: params.groupName,
    });
    await getNotificationService().sendToUsers(adminIds, payload);
  });
}

export async function notifyRequesterApproved(params: {
  userId: string;
  group: { id: string; name: string };
}): Promise<void> {
  await safeNotify("group request approved", async () => {
    const payload = NotificationTemplates.groupRequestApproved({
      groupName: params.group.name,
      groupId: params.group.id,
    });
    await recordForRecipients({
      userIds: [params.userId],
      groupId: params.group.id,
      type: NOTIFICATION_TYPES.GROUP_REQUEST_DECISION,
      payload,
    });
    await getNotificationService().sendToUser(params.userId, payload);
  });
}

export async function notifyRequesterRejected(params: {
  userId: string;
  reason: string;
}): Promise<void> {
  await safeNotify("group request rejected", async () => {
    const payload = NotificationTemplates.groupRequestRejected({ reason: params.reason });
    await getNotificationService().sendToUser(params.userId, payload);
  });
}

// Group join-request lifecycle. The group exists, so organizer + approval
// notifications record group-scoped inbox rows. Rejection is push-only — the
// requester is not (yet) a member, so an inbox row would imply membership.

export async function notifyOrganizersOfJoinRequest(
  group: { id: string; name: string },
  requesterName: string,
): Promise<void> {
  await safeNotify("join request submitted", async () => {
    const members = await getRepositoryFactory().groupMembers.listByGroup(group.id);
    const organizerIds = members.filter((m) => m.role === "organizer").map((m) => m.userId);
    if (organizerIds.length === 0) return;
    const payload = NotificationTemplates.joinRequestSubmitted({
      groupId: group.id,
      groupName: group.name,
      requesterName,
    });
    await recordForRecipients({
      userIds: organizerIds,
      groupId: group.id,
      type: NOTIFICATION_TYPES.JOIN_REQUEST_SUBMITTED,
      payload,
    });
    await getNotificationService().sendToUsers(organizerIds, payload);
  });
}

export async function notifyJoinApproved(
  userId: string,
  group: { id: string; name: string },
): Promise<void> {
  await safeNotify("join request approved", async () => {
    const payload = NotificationTemplates.joinRequestApproved({
      groupName: group.name,
      groupId: group.id,
    });
    await recordForRecipients({
      userIds: [userId],
      groupId: group.id,
      type: NOTIFICATION_TYPES.JOIN_REQUEST_DECISION,
      payload,
    });
    await getNotificationService().sendToUser(userId, payload);
  });
}

export async function notifyJoinRejected(
  userId: string,
  group: { name: string },
  reason: string,
): Promise<void> {
  await safeNotify("join request rejected", async () => {
    const payload = NotificationTemplates.joinRequestRejected({ groupName: group.name, reason });
    await getNotificationService().sendToUser(userId, payload);
  });
}
