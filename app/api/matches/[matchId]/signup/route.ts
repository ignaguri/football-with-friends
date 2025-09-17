import { auth } from "@/lib/auth";
import { getServiceFactory } from "@/lib/services/factory";
import {
  captureMessage,
  captureException,
  setContext,
} from "@/lib/utils/sentry";
import { headers } from "next/headers";

import type {
  User,
  CreateGuestSignupData,
  PlayerStatus,
} from "@/lib/domain/types";

export async function POST(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    if (!user) {
      captureMessage("Unauthorized signup attempt", {
        level: "warning",
      });
      return new Response("Unauthorized", { status: 401 });
    }

    const { matchId } = await context.params;
    const body = await req.json();
    const { matchService } = getServiceFactory();

    // Add Sentry context for debugging
    setContext("signup_request", {
      matchId,
      userId: user.id,
      userEmail: user.email,
      isGuest: body.isGuest,
      hasGuestName: !!body.guestName,
    });

    if (body.isGuest) {
      // Guest signup
      const { ownerName, ownerEmail, guestName, status } = body;

      if (!ownerName || !ownerEmail || typeof status !== "string") {
        captureMessage("Guest signup missing required fields", {
          level: "error",
          extra: {
            hasOwnerName: !!ownerName,
            hasOwnerEmail: !!ownerEmail,
            statusType: typeof status,
            guestName,
          },
        });
        return new Response("Missing fields", { status: 400 });
      }

      const guestData: CreateGuestSignupData = {
        matchId,
        guestName,
        ownerUserId: user.id,
        ownerName,
        ownerEmail,
        status: status as PlayerStatus,
      };

      try {
        await matchService.addGuestPlayer(matchId, guestData, user);

        captureMessage("Guest successfully added to match", {
          level: "info",
          extra: {
            matchId,
            guestName,
            ownerEmail,
            ownerName,
          },
        });

        return new Response("OK", { status: 200 });
      } catch (guestError) {
        captureException(guestError, {
          tags: {
            operation: "add_guest_player",
            matchId,
          },
          extra: {
            guestName,
            ownerEmail,
            ownerName,
            userId: user.id,
          },
        });

        // Error logged to Sentry above
        return new Response(
          guestError instanceof Error
            ? guestError.message
            : "Failed to add guest",
          { status: 400 },
        );
      }
    } else {
      // Regular user signup
      const { playerName, playerEmail, status } = body;

      const playerData = {
        playerName: playerName || user.name,
        playerEmail: playerEmail || user.email,
        status: status as PlayerStatus,
      };

      try {
        await matchService.signUpUser(matchId, user, playerData);

        captureMessage("User successfully signed up for match", {
          level: "info",
          extra: {
            matchId,
            playerEmail: playerData.playerEmail,
            playerName: playerData.playerName,
          },
        });

        return new Response("OK", { status: 200 });
      } catch (signupError) {
        captureException(signupError, {
          tags: {
            operation: "signup_user",
            matchId,
          },
          extra: {
            playerEmail: playerData.playerEmail,
            playerName: playerData.playerName,
            userId: user.id,
          },
        });

        // Error logged to Sentry above
        return new Response(
          signupError instanceof Error
            ? signupError.message
            : "Failed to sign up",
          { status: 400 },
        );
      }
    }
  } catch (error) {
    captureException(error, {
      tags: {
        operation: "signup_api",
      },
    });

    // Error logged to Sentry above

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return new Response("Match not found", { status: 404 });
      }
      if (error.message.includes("already signed up")) {
        return new Response("Already signed up", { status: 409 });
      }
      if (error.message.includes("full")) {
        return new Response("Match is full", { status: 409 });
      }
      if (error.message.includes("must be signed up")) {
        return new Response("Must be signed up to add guests", { status: 400 });
      }
      if (
        error.message.includes("Missing fields") ||
        error.message.includes("required")
      ) {
        return new Response("Missing fields", { status: 400 });
      }
    }

    return new Response("Internal server error", { status: 500 });
  }
}
