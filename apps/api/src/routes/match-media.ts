import { Hono } from "hono";
import { nanoid } from "nanoid";

import {
  REACTION_EMOJIS,
  type MatchMedia,
  type MatchMediaFeedGroup,
  type MatchMediaReactionSummary,
  type ReactionEmoji,
} from "@repo/shared/domain";
import {
  TursoMatchMediaRepository,
  TursoMatchRepository,
  TursoSignupRepository,
} from "@repo/shared/repositories";

import { requireUser } from "../middleware/security";
import {
  deleteFromR2,
  extFromMediaMime,
  generateMatchMediaKey,
  generateMatchMediaPosterKey,
  getFromR2,
  uploadToR2,
  type R2Bucket,
} from "../lib/r2";

type AppEnv = {
  Bindings: {
    MATCH_MEDIA: R2Bucket;
  };
};

const app = new Hono<AppEnv>();

const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const PHOTO_MIMES = ["image/webp", "image/jpeg", "image/png"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const CAPTION_MAX_LEN = 280;

const mediaRepo = new TursoMatchMediaRepository();
const matchRepo = new TursoMatchRepository();
const signupRepo = new TursoSignupRepository();

function buildMediaUrl(
  c: any,
  key: string
): string {
  const baseUrl = c.req.url.split("/api/")[0];
  return `${baseUrl}/api/match-media/file/${encodeURIComponent(key)}`;
}

function reactionsFromCounts(
  counts: Record<string, number>,
  own: Set<string>
): MatchMediaReactionSummary[] {
  return REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: counts[emoji] ?? 0,
    didReact: own.has(emoji),
  }));
}

// --- Upload ---------------------------------------------------------------

app.post("/:matchId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");

  const match = await matchRepo.findById(matchId);
  if (!match) return c.json({ error: "Match not found" }, 404);

  const participantIds = await signupRepo.getSignedUpUserIds(matchId);
  const isParticipant = participantIds.includes(user.id);
  const isAdmin = user.role === "admin";
  if (!isParticipant && !isAdmin) {
    return c.json({ error: "Only match participants can upload" }, 403);
  }

  const body = await c.req.parseBody();
  const file = body.file as File | undefined;
  const kind = body.kind as string | undefined;
  const caption = typeof body.caption === "string" ? body.caption.trim() : null;
  const poster = body.poster as File | undefined;

  if (!file || !kind) return c.json({ error: "Missing file or kind" }, 400);
  if (kind !== "photo" && kind !== "video") {
    return c.json({ error: "Invalid kind" }, 400);
  }

  const allowedMimes = kind === "photo" ? PHOTO_MIMES : VIDEO_MIMES;
  if (!allowedMimes.includes(file.type)) {
    return c.json({ error: "Unsupported file type" }, 400);
  }

  const maxBytes = kind === "photo" ? PHOTO_MAX_BYTES : VIDEO_MAX_BYTES;
  if (file.size > maxBytes) {
    return c.json({ error: "File too large" }, 400);
  }

  if (caption && caption.length > CAPTION_MAX_LEN) {
    return c.json({ error: "Caption too long" }, 400);
  }

  const ext = extFromMediaMime(file.type);
  if (!ext) return c.json({ error: "Unsupported file type" }, 400);

  const bucket = c.env?.MATCH_MEDIA;
  if (!bucket) return c.json({ error: "Storage not configured" }, 500);

  const mediaId = nanoid();
  const r2Key = generateMatchMediaKey(matchId, mediaId, ext);

  // Upload main asset + optional poster first; roll back on DB failure.
  const arrayBuffer = await file.arrayBuffer();
  await uploadToR2(bucket, r2Key, arrayBuffer, file.type);

  let posterKey: string | null = null;
  if (kind === "video" && poster && poster.type === "image/jpeg") {
    posterKey = generateMatchMediaPosterKey(matchId, mediaId);
    const posterBuf = await poster.arrayBuffer();
    await uploadToR2(bucket, posterKey, posterBuf, "image/jpeg");
  }

  try {
    await mediaRepo.create({
      id: mediaId,
      matchId,
      uploaderUserId: user.id,
      kind,
      mimeType: file.type,
      sizeBytes: file.size,
      caption: caption && caption.length > 0 ? caption : null,
      r2Key,
    });
  } catch (err) {
    // Best-effort cleanup of R2 objects.
    await deleteFromR2(bucket, r2Key).catch(() => {});
    if (posterKey) await deleteFromR2(bucket, posterKey).catch(() => {});
    console.error("match-media DB insert failed:", err);
    return c.json({ error: "Failed to save media" }, 500);
  }

  const dto: MatchMedia = {
    id: mediaId,
    matchId,
    uploaderUserId: user.id,
    uploaderName: user.name ?? "",
    kind,
    mimeType: file.type,
    sizeBytes: file.size,
    caption: caption && caption.length > 0 ? caption : null,
    url: buildMediaUrl(c, r2Key),
    posterUrl: posterKey ? buildMediaUrl(c, posterKey) : null,
    createdAt: new Date().toISOString(),
    reactions: REACTION_EMOJIS.map((e) => ({ emoji: e, count: 0, didReact: false })),
  };

  return c.json(dto, 201);
});

// --- List ----------------------------------------------------------------

app.get("/:matchId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");

  const rows = await mediaRepo.listByMatch(matchId, user.id);
  const items: MatchMedia[] = rows.map((r) => {
    const posterKey = r.kind === "video"
      ? generateMatchMediaPosterKey(r.matchId, r.id)
      : null;
    return {
      id: r.id,
      matchId: r.matchId,
      uploaderUserId: r.uploaderUserId,
      uploaderName: r.uploaderName,
      kind: r.kind,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      caption: r.caption,
      url: buildMediaUrl(c, r.r2Key),
      posterUrl: posterKey ? buildMediaUrl(c, posterKey) : null,
      createdAt: r.createdAt.toISOString(),
      reactions: reactionsFromCounts(r.reactionCounts, r.ownReactions),
    };
  });

  return c.json({ items });
});

// --- Count ---------------------------------------------------------------

app.get("/:matchId/count", async (c) => {
  requireUser(c);
  const matchId = c.req.param("matchId");
  const count = await mediaRepo.countByMatch(matchId);
  return c.json({ count });
});

// --- Delete --------------------------------------------------------------

app.delete("/:matchId/:mediaId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const mediaId = c.req.param("mediaId");

  const media = await mediaRepo.findById(mediaId);
  if (!media || media.matchId !== matchId) {
    return c.json({ error: "Media not found" }, 404);
  }

  const isOwner = media.uploaderUserId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const bucket = c.env?.MATCH_MEDIA;
  if (!bucket) return c.json({ error: "Storage not configured" }, 500);

  await deleteFromR2(bucket, media.r2Key).catch(() => {});
  if (media.kind === "video") {
    await deleteFromR2(bucket, generateMatchMediaPosterKey(matchId, mediaId)).catch(() => {});
  }
  await mediaRepo.deleteById(mediaId);

  return c.body(null, 204);
});

// --- Reactions -----------------------------------------------------------

app.post("/:matchId/:mediaId/reactions", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const mediaId = c.req.param("mediaId");

  const payload = await c.req.json<{ emoji?: string }>().catch(() => ({ emoji: undefined }));
  const emoji = payload.emoji as ReactionEmoji | undefined;
  if (!emoji || !(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return c.json({ error: "Invalid emoji" }, 400);
  }

  const media = await mediaRepo.findById(mediaId);
  if (!media || media.matchId !== matchId) {
    return c.json({ error: "Media not found" }, 404);
  }

  const result = await mediaRepo.toggleReaction(mediaId, user.id, emoji);
  return c.json(result);
});

export default app;
