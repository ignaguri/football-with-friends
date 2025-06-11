import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { addOrUpdatePlayerRow } from "@/lib/google-sheets";

export async function POST(
  req: Request,
  context: { params: { matchId: string } },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { matchId } = await context.params;
  const sheetName = decodeURIComponent(matchId);
  const { playerName, playerEmail, paid } = await req.json();
  if (!playerName && !playerEmail) {
    return new Response("Missing fields", { status: 400 });
  }
  if (typeof paid !== "boolean") {
    return new Response("Missing fields", { status: 400 });
  }
  try {
    await addOrUpdatePlayerRow(sheetName, {
      name: playerName,
      email: playerEmail,
      paid,
    });
    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Match not found", { status: 404 });
  }
}
