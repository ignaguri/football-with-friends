import { auth } from "@/lib/auth";
import { addOrUpdatePlayerRow, getSheetNameById } from "@/lib/google-sheets";
import { headers } from "next/headers";

export async function POST(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { matchId } = await context.params;
  const sheetName = await getSheetNameById(matchId);
  if (!sheetName) {
    return new Response("Sheet not found", { status: 404 });
  }
  const body = await req.json();
  if (body.isGuest) {
    const { ownerName, ownerEmail, guestName, status } = body;
    if (!ownerName || !ownerEmail || typeof status !== "string") {
      return new Response("Missing fields", { status: 400 });
    }
    // Compose guest display name
    const name = guestName
      ? `${guestName} (Guest of ${ownerName})`
      : `Guest of ${ownerName}`;
    // Generate unique guest email
    const playerEmail = `guest-${Math.random().toString(36).slice(2, 10)}`;
    await addOrUpdatePlayerRow(sheetName, {
      name,
      email: playerEmail,
      status,
      isGuest: true,
      ownerEmail,
      guestName,
      ownerName,
    });
    return new Response("OK", { status: 200 });
  }
  // Normal user signup
  const { playerName, playerEmail, status } = body;
  if (!playerName && !playerEmail) {
    return new Response("Missing fields", { status: 400 });
  }
  if (typeof status !== "string") {
    return new Response("Missing fields", { status: 400 });
  }
  try {
    await addOrUpdatePlayerRow(sheetName, {
      name: playerName,
      email: playerEmail,
      status,
    });
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("Error adding player", e);
    return new Response("Match not found", { status: 404 });
  }
}
