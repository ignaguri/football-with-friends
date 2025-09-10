import { auth } from "@/lib/auth";
import { getServiceFactory } from "@/lib/services/factory";
import { headers } from "next/headers";
import { z } from "zod";

import type { User } from "@/lib/domain/types";

const updateSignupSchema = z.object({
  status: z.enum(["PAID", "PENDING", "CANCELLED"]),
});

// PATCH /api/matches/[matchId]/signup/[signupId]: Update signup status
export async function PATCH(
  req: Request,
  context: { params: Promise<{ matchId: string; signupId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { matchId, signupId } = await context.params;
    const body = await req.json();

    const parsed = updateSignupSchema.safeParse(body);
    if (!parsed.success) {
      return new Response("Invalid status", { status: 400 });
    }

    const { status } = parsed.data;
    const { matchService } = getServiceFactory();

    await matchService.updateSignup(signupId, { status }, user);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error updating signup:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return new Response("Signup not found", { status: 404 });
      }
      if (error.message.includes("Not authorized")) {
        return new Response("Not authorized", { status: 403 });
      }
    }

    return new Response("Internal server error", { status: 500 });
  }
}
