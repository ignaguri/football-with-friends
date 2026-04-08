import type { NotificationPayload } from "../domain/types";

interface MatchInfo {
  id: string;
  date: string;
  time: string;
  locationName?: string;
}

function matchScreen(matchId: string): string {
  return `/(tabs)/matches/${matchId}`;
}

export const NotificationTemplates = {
  matchCreated(match: MatchInfo): NotificationPayload {
    const location = match.locationName ? ` at ${match.locationName}` : "";
    return {
      title: "New Match!",
      body: `Match on ${match.date} at ${match.time}${location}. Sign up now!`,
      data: { type: "match_created", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchUpdated(match: MatchInfo, changes: string): NotificationPayload {
    return {
      title: "Match Updated",
      body: `The match on ${match.date} has been updated: ${changes}`,
      data: { type: "match_updated", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchCancelled(match: MatchInfo): NotificationPayload {
    return {
      title: "Match Cancelled",
      body: `The match on ${match.date} at ${match.time} has been cancelled.`,
      data: { type: "match_cancelled", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  playerConfirmed(match: MatchInfo): NotificationPayload {
    return {
      title: "You're Confirmed!",
      body: `Your spot for the match on ${match.date} is confirmed. See you there!`,
      data: { type: "player_confirmed", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  substitutePromoted(match: MatchInfo): NotificationPayload {
    return {
      title: "You're In!",
      body: `A spot opened up for the match on ${match.date}. You've been moved off the waitlist!`,
      data: { type: "substitute_promoted", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  playerCancelled(match: MatchInfo, playerName: string): NotificationPayload {
    return {
      title: "Player Cancelled",
      body: `${playerName} cancelled their spot for the match on ${match.date}.`,
      data: { type: "player_cancelled", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  removedFromMatch(match: MatchInfo): NotificationPayload {
    return {
      title: "Removed from Match",
      body: `You have been removed from the match on ${match.date}.`,
      data: { type: "removed_from_match", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  matchReminder(match: MatchInfo): NotificationPayload {
    const location = match.locationName ? ` at ${match.locationName}` : "";
    return {
      title: "Match Tomorrow!",
      body: `Don't forget — match tomorrow at ${match.time}${location}.`,
      data: { type: "match_reminder", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  paymentReminder(match: MatchInfo, amount?: string): NotificationPayload {
    const cost = amount ? ` (${amount})` : "";
    return {
      title: "Payment Pending",
      body: `Your payment${cost} for the match on ${match.date} is still pending.`,
      data: { type: "payment_reminder", matchId: match.id, screen: matchScreen(match.id) },
    };
  },

  votingOpen(match: MatchInfo): NotificationPayload {
    return {
      title: "Time to Vote!",
      body: `The match on ${match.date} is complete. Cast your votes!`,
      data: {
        type: "voting_open",
        matchId: match.id,
        screen: `/stats-voting?matchId=${match.id}`,
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
      data: { type: "engagement_reminder", screen: "/(tabs)" },
    };
  },
};
