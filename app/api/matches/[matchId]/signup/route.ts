import { auth } from "@/lib/auth";
import { getServiceFactory } from "@/lib/services/factory";
import { headers } from "next/headers";

import type { User, CreateGuestSignupData } from "@/lib/domain/types";

export async function POST(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;
    
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { matchId } = await context.params;
    const body = await req.json();
    const { matchService } = getServiceFactory();

    if (body.isGuest) {
      // Guest signup
      const { ownerName, ownerEmail, guestName, status } = body;
      
      if (!ownerName || !ownerEmail || typeof status !== "string") {
        return new Response("Missing fields", { status: 400 });
      }

      const guestData: CreateGuestSignupData = {
        matchId,
        guestName,
        ownerUserId: user.id,
        ownerName,
        ownerEmail,
        status: status as any,
      };

      await matchService.addGuestPlayer(guestData, user);
      return new Response("OK", { status: 200 });
    } else {
      // Regular user signup
      const { playerName, playerEmail, status } = body;
      
      const playerData = {
        playerName: playerName || user.name,
        playerEmail: playerEmail || user.email,
        status,
      };

      await matchService.signUpUser(matchId, user, playerData);
      return new Response("OK", { status: 200 });
    }
  } catch (error) {
    console.error("Error processing signup:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return new Response("Match not found", { status: 404 });
      }
      if (error.message.includes('already signed up')) {
        return new Response("Already signed up", { status: 409 });
      }
      if (error.message.includes('full')) {
        return new Response("Match is full", { status: 409 });
      }
      if (error.message.includes('must be signed up')) {
        return new Response("Must be signed up to add guests", { status: 400 });
      }
      if (error.message.includes('Missing fields') || error.message.includes('required')) {
        return new Response("Missing fields", { status: 400 });
      }
    }
    
    return new Response("Internal server error", { status: 500 });
  }
}
