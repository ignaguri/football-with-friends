import type { Context } from "hono";
import { Hono } from "hono";
import { nanoid } from "nanoid";

import {
  REACTION_EMOJIS,
  type MatchMedia,
  type MatchMediaFeedGroup,
  type MatchMediaReactionSummary,
  type ReactionEmoji,
} from "@repo/shared/domain";
import { getRepositoryFactory } from "@repo/shared/repositories";

import {
  type AppVariables,
  rateLimitMiddleware,
  requireUser,
} from "../middleware/security";
import {
  groupContextMiddleware,
  requireCurrentGroup,
} from "../middleware/group-context";
import { assertInCurrentGroup } from "../middleware/authz";
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
  Variables: AppVariables;
};

const app = new Hono<AppEnv>();

app.use("*", groupContextMiddleware);

// Match-media rows don't carry their own `group_id` column; the scoping
// anchor is the parent match. Any matchId-parameterized endpoint routes
// through this helper so cross-group matchIds 404 instead of leaking media.
async function assertMatchInCurrentGroup(
  c: Context,
  matchId: string,
): Promise<Response | null> {
  const match = await getRepositoryFactory().matches.findById(matchId);
  return assertInCurrentGroup(c, match, "Match not found");
}

const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const PHOTO_MIMES = ["image/webp", "image/jpeg", "image/png"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const CAPTION_MAX_LEN = 280;

const repos = () => getRepositoryFactory();

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

// --- Global feed ---------------------------------------------------------
// NOTE: static-path routes (`/feed`, `/file/:key`) MUST come before the
// parameterized `/:matchId` route so Hono doesn't match e.g. "feed" as a
// matchId.

app.get("/feed", async (c) => {
  const user = requireUser(c);
  const current = requireCurrentGroup(c);
  const cursor = c.req.query("cursor") ?? null;
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? "5"), 1), 20);
  const itemsPerMatch = 6;

  const { groups, nextCursor } = await repos().matchMedia.feed({
    groupId: current.id,
    cursor,
    matchesPerPage: limit,
    itemsPerMatch,
  });

  // Batch-hydrate all mediaIds across all groups in a single query (avoids N+1).
  const allMediaIds = groups.flatMap((g) => g.mediaIds);
  const hydrated = await repos().matchMedia.listByIds(allMediaIds, user.id);
  const byId = new Map(hydrated.map((r) => [r.id, r] as const));

  const groupResults: MatchMediaFeedGroup[] = groups.map((g) => ({
    matchId: g.matchId,
    matchDate: g.matchDate,
    fieldName: g.fieldName,
    totalCount: g.totalCount,
    items: g.mediaIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .map<MatchMedia>((r) => {
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
      }),
  }));

  return c.json({ groups: groupResults, nextCursor });
});

// --- Serve file ----------------------------------------------------------

app.get("/file/:key{.+}", async (c) => {
  requireUser(c);
  const key = decodeURIComponent(c.req.param("key"));
  const bucket = c.env?.MATCH_MEDIA;
  if (!bucket) return c.json({ error: "Storage not configured" }, 500);

  const object = await getFromR2(bucket, key);
  if (!object) return c.json({ error: "Not found" }, 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
      ETag: object.etag,
    },
  });
});

// --- Upload ---------------------------------------------------------------

// Rate limit uploads to curb abuse (keyed by IP, matching the project's
// existing auth/phone-auth rate-limit usage in worker.ts).
app.use("/:matchId", async (c, next) => {
  if (c.req.method !== "POST") return next();
  return rateLimitMiddleware("match-media-upload")(c, next);
});

app.post("/:matchId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");

  const match = await repos().matches.findById(matchId);
  const mismatched = assertInCurrentGroup(c, match, "Match not found");
  if (mismatched) return mismatched;

  const participantIds = await repos().signups.getSignedUpUserIds(matchId);
  const isParticipant = participantIds.includes(user.id);
  const isAdmin = user.role === "superadmin";
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
    await repos().matchMedia.create({
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
  const notFound = await assertMatchInCurrentGroup(c, matchId);
  if (notFound) return notFound;

  const rows = await repos().matchMedia.listByMatch(matchId, user.id);
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
  const notFound = await assertMatchInCurrentGroup(c, matchId);
  if (notFound) return notFound;
  const count = await repos().matchMedia.countByMatch(matchId);
  return c.json({ count });
});

// --- Delete --------------------------------------------------------------

app.delete("/:matchId/:mediaId", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const mediaId = c.req.param("mediaId");
  const notFound = await assertMatchInCurrentGroup(c, matchId);
  if (notFound) return notFound;

  const media = await repos().matchMedia.findById(mediaId);
  if (!media || media.matchId !== matchId) {
    return c.json({ error: "Media not found" }, 404);
  }

  const isOwner = media.uploaderUserId === user.id;
  const isAdmin = user.role === "superadmin";
  if (!isOwner && !isAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const bucket = c.env?.MATCH_MEDIA;
  if (!bucket) return c.json({ error: "Storage not configured" }, 500);

  await deleteFromR2(bucket, media.r2Key).catch(() => {});
  if (media.kind === "video") {
    await deleteFromR2(bucket, generateMatchMediaPosterKey(matchId, mediaId)).catch(() => {});
  }
  await repos().matchMedia.deleteById(mediaId);

  return c.body(null, 204);
});

// --- Reactions -----------------------------------------------------------

app.post("/:matchId/:mediaId/reactions", async (c) => {
  const user = requireUser(c);
  const matchId = c.req.param("matchId");
  const mediaId = c.req.param("mediaId");
  const notFound = await assertMatchInCurrentGroup(c, matchId);
  if (notFound) return notFound;

  const payload = await c.req.json<{ emoji?: string }>().catch(() => ({ emoji: undefined }));
  const emoji = payload.emoji as ReactionEmoji | undefined;
  if (!emoji || !(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return c.json({ error: "Invalid emoji" }, 400);
  }

  const media = await repos().matchMedia.findById(mediaId);
  if (!media || media.matchId !== matchId) {
    return c.json({ error: "Media not found" }, 404);
  }

  const result = await repos().matchMedia.toggleReaction(mediaId, user.id, emoji);
  return c.json(result);
});

export default app;
