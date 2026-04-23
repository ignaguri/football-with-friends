import type { NotificationPayload, NotificationMatchInfo } from "../domain/types";
import { NOTIFICATION_TYPES } from "../domain/types";

function matchScreen(matchId: string): string {
  return `/(tabs)/matches/${matchId}`;
}

export const NotificationTemplates = {
  matchCreated(match: NotificationMatchInfo): NotificationPayload {
    const location = match.locationName ? ` at ${match.locationName}` : "";
    return {
      title: "New Match!",
      body: `Match on ${match.date} at ${match.time}${location}. Sign up now!`,
      data: { type: NOTIFICATION_TYPES.MATCH_CREATED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchUpdated(match: NotificationMatchInfo, changes: string): NotificationPayload {
    return {
      title: "Match Updated",
      body: `The match on ${match.date} has been updated: ${changes}`,
      data: { type: NOTIFICATION_TYPES.MATCH_UPDATED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchCancelled(match: NotificationMatchInfo): NotificationPayload {
    return {
      title: "Match Cancelled",
      body: `The match on ${match.date} at ${match.time} has been cancelled.`,
      data: { type: NOTIFICATION_TYPES.MATCH_CANCELLED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  playerConfirmed(match: NotificationMatchInfo): NotificationPayload {
    return {
      title: "You're Confirmed!",
      body: `Your spot for the match on ${match.date} is confirmed. See you there!`,
      data: { type: NOTIFICATION_TYPES.PLAYER_CONFIRMED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  substitutePromoted(match: NotificationMatchInfo): NotificationPayload {
    return {
      title: "You're In!",
      body: `A spot opened up for the match on ${match.date}. You've been moved off the waitlist!`,
      data: { type: NOTIFICATION_TYPES.SUBSTITUTE_PROMOTED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  playerCancelled(match: NotificationMatchInfo, playerName: string): NotificationPayload {
    return {
      title: "Player Cancelled",
      body: `${playerName} cancelled their spot for the match on ${match.date}.`,
      data: { type: NOTIFICATION_TYPES.PLAYER_CANCELLED, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  removedFromMatch(match: NotificationMatchInfo): NotificationPayload {
    return {
      title: "Removed from Match",
      body: `You have been removed from the match on ${match.date}.`,
      data: { type: NOTIFICATION_TYPES.REMOVED_FROM_MATCH, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchReminder(match: NotificationMatchInfo): NotificationPayload {
    const location = match.locationName ? ` at ${match.locationName}` : "";
    return {
      title: "Match Tomorrow!",
      body: `Don't forget — match tomorrow at ${match.time}${location}.`,
      data: { type: NOTIFICATION_TYPES.MATCH_REMINDER, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  paymentReminder(match: NotificationMatchInfo, amount?: string): NotificationPayload {
    const cost = amount ? ` (${amount})` : "";
    return {
      title: "Payment Pending",
      body: `Your payment${cost} for the match on ${match.date} is still pending.`,
      data: { type: NOTIFICATION_TYPES.PAYMENT_REMINDER, matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  votingOpen(match: NotificationMatchInfo): NotificationPayload {
    return {
      title: "Time to Vote!",
      body: `The match on ${match.date} is complete. Cast your votes!`,
      data: {
        type: NOTIFICATION_TYPES.VOTING_OPEN,
        matchId: match.id,
        screen: `/stats-voting?matchId=${match.id}`,
      },
    };
  },

  groupInvite(params: {
    groupName: string;
    inviterName: string;
    token: string;
  }): NotificationPayload {
    return {
      title: "You're invited!",
      body: `${params.inviterName} invited you to join ${params.groupName}.`,
      data: {
        type: NOTIFICATION_TYPES.GROUP_INVITE,
        token: params.token,
        screen: `/join/${params.token}`,
      },
    };
  },

  engagementReminder(variant: number): NotificationPayload {
    const messages = [
      { title: "Don't Miss Out!", body: "Check out upcoming matches and join your friends!" },
      { title: "Your Friends Are Playing!", body: "See what matches are coming up this week." },
      { title: "Ready to Play?", body: "Open the app to see the latest match details." },
    ];
    const msg = messages[variant % messages.length]!;
    return {
      title: msg.title,
      body: msg.body,
      data: { type: NOTIFICATION_TYPES.ENGAGEMENT_REMINDER, screen: "/(tabs)" },
    };
  },
};
