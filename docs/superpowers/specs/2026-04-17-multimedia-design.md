# Multimedia Feature — Design & Implementation Plan

> This document doubles as the design spec and the implementation plan.
> After approval, it should be mirrored to `docs/superpowers/specs/2026-04-17-multimedia-design.md` and committed as part of the first implementation step.

## Context

The Social tab of the Expo app shows a disabled "Multimedia" card marked "Coming soon" / "Próximamente". The goal is to ship the feature so match participants can share photos and short videos of their games, and the whole group can browse them.

Why now: the surrounding infrastructure is already 80% in place — R2 storage, `expo-image-picker` uploads, BetterAuth session context, rate-limit middleware, timezone-aware date utilities. The remaining work is a focused vertical slice: one new DB module, two new screens, one new R2 bucket, and the usual wiring.

Intended outcome: a live, usable multimedia feature with per-match galleries and a grouped global feed in the Social tab, with photos, short videos, captions, and emoji reactions.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Scope | Per-match gallery **+** global feed (grouped by match) |
| Content types | Photos + short videos (no server-side transcoding) |
| Upload permissions | Match participants only (admins always allowed) |
| View permissions | Any logged-in user |
| Social depth (v1) | Caption (≤280 chars) + emoji reactions |
| Reaction emojis | ❤️ 🔥 ⚽ 😂 🍺 |
| Delete rights | Uploader + admins |
| File size caps | Photo ≤ 10 MB · Video ≤ 50 MB |
| Match-detail entry | "View Gallery" card → dedicated gallery screen |
| Global feed layout | Grouped by match (sections with thumbnail preview + "+N more") |
| Upload architecture | Proxy through the Worker (mirrors the profile-picture flow) |
| Image compression | Client-side via `expo-image-manipulator` — resize to 1920px max, output **WebP q0.82** |
| Video compression | None; enforce caps + use picker's medium quality + 30s max duration |
| Video poster frames | Client-side via `expo-video-thumbnails`; stored as sibling `.poster.jpg` in R2 |

## Architecture

### Storage — new R2 bucket `MATCH_MEDIA`

- Binding: `MATCH_MEDIA` (separate from `PROFILE_PICTURES` for operational clarity)
- Production bucket: `football-match-media`
- Staging bucket: `football-match-media-staging`
- Key convention:
  - Main asset: `matches/{matchId}/{mediaId}.{ext}` (ext from mime — `webp` for photos, `mp4`/`mov` for videos)
  - Poster frame: `matches/{matchId}/{mediaId}.poster.jpg`
- Serve with `Cache-Control: public, max-age=31536000` (1 year), matching the profile-picture handler.

### DB — new migration `migrations/YYYYMMDDHHmmss-add-match-media.ts`

```ts
// match_media
id                 text primary key           // UUID v4
match_id           text not null references match(id) on delete cascade
uploader_user_id   text not null references user(id) on delete cascade
kind               text not null              // 'photo' | 'video'
mime_type          text not null
size_bytes         integer not null
caption            text null                  // ≤280 chars
r2_key             text not null              // main asset key (poster is key + '.poster.jpg')
created_at         datetime not null default current_timestamp
// indexes: (match_id, created_at desc), (uploader_user_id)

// match_media_reaction
media_id           text not null references match_media(id) on delete cascade
user_id            text not null references user(id) on delete cascade
emoji              text not null
created_at         datetime not null default current_timestamp
primary key (media_id, user_id, emoji)
```

### Shared types (`packages/shared/src/domain/types.ts`)

```ts
export const MEDIA_KINDS = ["photo", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const REACTION_EMOJIS = ["❤️", "🔥", "⚽", "😂", "🍺"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type MatchMedia = {
  id: string;
  matchId: string;
  uploaderUserId: string;
  uploaderName: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  url: string;                 // computed: /api/matches/{matchId}/media/{key}
  posterUrl: string | null;    // computed for videos only
  createdAt: Date;
  reactions: Array<{ emoji: ReactionEmoji; count: number; didReact: boolean }>;
};
```

### Repository (`packages/shared/src/repositories/turso-repositories.ts`)

Add `TursoMatchMediaRepository` with methods:
- `create(row)` / `findById(id)` / `deleteById(id)`
- `listByMatch(matchId)` — joins reactions aggregated by emoji
- `feed({ cursor, limit })` — pages of match groups ordered by most-recent-upload
- `toggleReaction(mediaId, userId, emoji)` — insert or delete row
- `countByMatch(matchId)` — used by the match detail "Gallery" card

Reuse existing cheap query `TursoSignupRepository.getSignedUpUserIds(matchId)` from `packages/shared/src/repositories/turso-repositories.ts:958` for the participant check.

### API surface — follows the existing `profile.ts` split

**Hono raw routes** (multipart + binary) — add `apps/api/src/routes/match-media.ts`, mount on main app:
- `POST /api/matches/:matchId/media` — upload photo or video (+ optional poster)
- `GET /api/matches/:matchId/media/:key{.+}` — stream R2 object with 1-year cache
- `DELETE /api/matches/:matchId/media/:mediaId` — uploader or admin

**oRPC procedures** — add `apps/api/src/procedures/match-media.ts`, register on the main oRPC router:
- `matchMedia.listByMatch({ matchId })` → `MatchMedia[]`
- `matchMedia.feed({ cursor?, limit? })` → paged groups `{ matchId, matchDate, fieldName, items: MatchMedia[] }`
- `matchMedia.toggleReaction({ mediaId, emoji })` → idempotent
- `matchMedia.countByMatch({ matchId })` → number (used for the match-detail card badge)

All procedures use `authedProcedure` from `apps/api/src/procedures/base.ts`. The upload route does its own participant check inline; uses `rateLimitMiddleware()` from `apps/api/src/middleware/security.ts` at **20 uploads / user / hour**.

### Server-side upload validation order

1. `requireUser(c)` — 401 if no session.
2. `matchRepository.findById(matchId)` — 404 if missing.
3. Participant check — `getSignedUpUserIds(matchId).includes(user.id) || user.role === "admin"` → else 403.
4. `c.req.parseBody()` → require `file`, `kind`; allow optional `caption`, `poster`.
5. Kind/mime check — photo: `image/webp`, `image/jpeg`, or `image/png` (client targets WebP but server accepts the pre-compression types as a safety net if client compression fails); video: `video/mp4` or `video/quicktime`.
6. Size check — photo ≤ 10 MB; video ≤ 50 MB.
7. Caption — trim, reject if `> 280` chars.
8. R2 writes first (asset + optional poster), then DB insert inside try/catch; on DB failure, best-effort delete of R2 objects.
9. Respond `201` with full `MatchMedia` DTO.

## Navigation & screens

### Route changes (Expo Router)

Convert the current flat match-detail file into a folder to enable sub-routes:
- `apps/mobile-web/app/(tabs)/matches/[matchId].tsx` → move to `apps/mobile-web/app/(tabs)/matches/[matchId]/index.tsx` (no behavior change).
- New: `apps/mobile-web/app/(tabs)/matches/[matchId]/gallery.tsx`.
- New: `apps/mobile-web/app/(tabs)/social/multimedia/index.tsx`.

### Screens

**Per-match gallery — `matches/[matchId]/gallery.tsx`**
- Header: match date + field (from existing match detail query).
- Top bar: "Upload" button (hidden if not participant & not admin).
- 3-column grid on mobile, 4 on web (`md+`). Square crops via `expo-image`'s `contentFit="cover"`.
- Video tiles: poster image + centered play-icon overlay + small duration badge if available.
- Tap tile → opens lightbox modal.
- Empty state: icon + `t("multimedia.emptyMatch")` + Upload CTA when allowed.
- Data: `useQuery(["matchMedia", matchId])` via `matchMedia.listByMatch`.
- Pull-to-refresh via `RefreshControl`.

**Global feed — `social/multimedia/index.tsx`**
- Title: `t("multimedia.title")`.
- Vertical `FlatList` of match sections; each section:
  - Row header: `APR 20 · FIELD X` + chevron; tapping navigates to the per-match gallery.
  - 3-column thumbnail preview of up to 6 most recent items for that match.
  - Overflow tile shows `+N` if more exist.
- `useInfiniteQuery` on `matchMedia.feed`, page size 5 match groups.
- Empty state: `t("multimedia.emptyFeed")`.

**Lightbox viewer (modal inside the gallery screen)**
- Full-bleed `expo-image` (photos) or `expo-av` `Video` (videos).
- Swipe left/right to navigate items within the same match (keyboard arrows on web).
- Caption below (if present).
- ReactionBar with 5 emojis + counts; tap toggles own reaction with optimistic update.
- Uploader name + relative timestamp.
- Overflow menu with **Delete** (uploader or admin); confirmation dialog.

**Upload flow**
- Action sheet: Camera · Photo Library · Video Library · Cancel.
- On pick:
  - Photo → `ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1920 } }], { compress: 0.82, format: SaveFormat.WEBP })`.
  - Video → `VideoThumbnails.getThumbnailAsync(uri, { time: 1000 })` for poster; validate 50 MB cap.
- Preview modal: thumbnail + optional caption input (≤280 chars) + "Post" button with inline progress.
- Submit as `FormData` (`file`, `kind`, `caption?`, `poster?`) with `credentials: "include"`.
- On success: invalidate `matchMedia.listByMatch` and `matchMedia.feed`; close modal.

**Match detail (`matches/[matchId]/index.tsx`)**
- Add a new section between the payment card and the bottom action buttons:
  - `📷 Gallery · N items ›` → route to `matches/[matchId]/gallery.tsx`.
  - If `N === 0` and viewer is a participant: copy becomes `📷 Add the first photo →`.
- Fetch count via `matchMedia.countByMatch({ matchId })`.

**Social hub (`social/index.tsx`)**
- Remove `opacity={0.6}` from the existing Multimedia card.
- Wrap in `<Pressable onPress={() => router.push("/(tabs)/social/multimedia")}>` (mirrors the pattern of the stats card just above).

### New shared UI components — `packages/ui/src/components/`
- `MediaGrid` — 3/4-column grid, `items[]` + `onItemPress`; handles photo/video tile rendering.
- `MediaLightbox` — modal viewer, swipe nav, ReactionBar, overflow menu.
- `ReactionBar` — 5-emoji toggle row with counts and own-reaction highlight.

## Dependencies to add

- `expo-image-manipulator` (`apps/mobile-web`) — WebP photo compression.
- `expo-video-thumbnails` (`apps/mobile-web`) — video poster frame generation.
- `expo-av` is likely already installed; confirm during implementation.

## i18n — new `multimedia.*` keys

Add to both `locales/en/common.json` and `locales/es/common.json`:

```jsonc
"multimedia": {
  "title": "Multimedia" / "Multimedia",
  "upload": "Upload" / "Subir",
  "uploading": "Uploading… {{percent}}%" / "Subiendo… {{percent}}%",
  "captionPlaceholder": "Add a caption (optional)" / "Agregá un comentario (opcional)",
  "post": "Post" / "Publicar",
  "cancel": "Cancel" / "Cancelar",
  "emptyMatch": "No photos yet. Be the first to share!" / "Todavía no hay fotos. ¡Sé el primero!",
  "emptyFeed": "No multimedia yet. Upload from a match to get started." / "Aún no hay multimedia. Subí algo desde un partido.",
  "viewGallery": "View gallery" / "Ver galería",
  "galleryCount_one": "{{count}} item" / "{{count}} elemento",
  "galleryCount_other": "{{count}} items" / "{{count}} elementos",
  "addFirstPhoto": "Add the first photo →" / "Subí la primera foto →",
  "delete": "Delete" / "Eliminar",
  "deleteConfirm": "Delete this photo/video?" / "¿Eliminar este archivo?",
  "permissionOnlyParticipants": "Only match participants can upload" / "Solo los jugadores del partido pueden subir",
  "errors": {
    "fileTooLarge": "File too large (max {{max}})" / "Archivo muy grande (máx {{max}})",
    "invalidType": "Unsupported file type" / "Tipo de archivo no soportado",
    "uploadFailed": "Upload failed — please try again" / "Error al subir — intentá de nuevo"
  }
}
```

Update existing key `social.multimediaCardDesc`:
- EN: `"Photos and videos from our matches"` (was `"Coming soon"`)
- ES: `"Fotos y videos de nuestros partidos"` (was `"Próximamente"`)

## Critical files to create / modify

### Create
- `migrations/YYYYMMDDHHmmss-add-match-media.ts`
- `apps/api/src/routes/match-media.ts`
- `apps/api/src/procedures/match-media.ts`
- `apps/mobile-web/app/(tabs)/matches/[matchId]/gallery.tsx`
- `apps/mobile-web/app/(tabs)/social/multimedia/index.tsx`
- `packages/ui/src/components/MediaGrid.tsx`
- `packages/ui/src/components/MediaLightbox.tsx`
- `packages/ui/src/components/ReactionBar.tsx`

### Modify
- `apps/api/wrangler.toml` — add `MATCH_MEDIA` bucket binding under `[default]` and `[env.preview]`.
- `apps/api/src/index.ts` (or wherever routes/procedures are registered) — mount new route + oRPC procedures.
- `apps/api/src/lib/r2.ts` — add a generic `generateMatchMediaKey(matchId, mediaId, ext)` helper (keep the existing profile helper).
- `packages/shared/src/database/schema.ts` — add Kysely types for the two new tables.
- `packages/shared/src/repositories/turso-repositories.ts` — add `TursoMatchMediaRepository`.
- `packages/shared/src/domain/types.ts` — add `MEDIA_KINDS`, `MediaKind`, `REACTION_EMOJIS`, `ReactionEmoji`, `MatchMedia`.
- `packages/api-client/src/...` — expose the new oRPC procedures + TanStack Query hooks.
- `apps/mobile-web/app/(tabs)/matches/[matchId].tsx` → move to `apps/mobile-web/app/(tabs)/matches/[matchId]/index.tsx`; add the `GalleryCard` section.
- `apps/mobile-web/app/(tabs)/social/index.tsx` — un-disable the Multimedia card, wrap in `Pressable` linking to `/(tabs)/social/multimedia`.
- `locales/en/common.json` and `locales/es/common.json` — new `multimedia.*` namespace; update `social.multimediaCardDesc`.
- `apps/mobile-web/package.json` — add `expo-image-manipulator`, `expo-video-thumbnails` (and confirm `expo-av`).

## Existing utilities to reuse (do not re-implement)

- R2 helpers: `uploadToR2`, `deleteFromR2`, `getFromR2` in `apps/api/src/lib/r2.ts`
- Auth/session: `requireUser`, `rateLimitMiddleware`, `SessionUser`, `sessionUserToUser` in `apps/api/src/middleware/security.ts`
- oRPC base: `authedProcedure`, `adminProcedure` in `apps/api/src/procedures/base.ts`
- Participant lookup: `TursoSignupRepository.getSignedUpUserIds(matchId)` in `packages/shared/src/repositories/turso-repositories.ts:958`
- Date formatting: `formatDisplayDate`, `formatDisplayDateTime` from `@repo/shared/utils/timezone`
- UI primitives: `Container`, `Card`, `Text`, `YStack`, `XStack` from `@repo/ui`; `expo-image` and `expo-av` already in use
- Upload client pattern: `apps/mobile-web/app/(tabs)/profile/index.tsx:236-301` (FormData + fetch with `credentials: "include"`)

## Rollout order

1. **Create staging R2 bucket** `football-match-media-staging` in the Cloudflare dashboard.
2. **Run staging migration** — apply new migration against the staging Turso DB via `pnpm migrate-remote:up` (with staging env).
3. **Add `MATCH_MEDIA` binding** in `wrangler.toml`; deploy API to staging (`pnpm --filter api cf:deploy:preview`).
4. **Verify** with the manual test plan on staging (see below).
5. **Create production R2 bucket** `football-match-media`.
6. **Run production migration** — `pnpm migrate-remote:up` against production.
7. **Deploy production API** (`pnpm --filter api cf:deploy`).
8. **Mobile-web** auto-deploys via Vercel from `main` branch.

## Verification

### Automated
Backend integration tests (in the existing `apps/api/src/routes/**/__tests__/` style, hitting real Turso per the project's no-mocks rule):

- `POST /api/matches/:matchId/media` — 401 unauth, 403 non-participant, 404 bad match, 400 oversize, 400 bad mime, 201 success (asserts R2 + DB row).
- `DELETE /api/matches/:matchId/media/:mediaId` — 403 non-owner non-admin, 204 owner, 204 admin (asserts R2 + DB row gone, cascade removes reactions).
- `matchMedia.listByMatch` — correct per-emoji aggregation; `didReact` reflects caller.
- `matchMedia.toggleReaction` — idempotent toggle; rejects emojis outside allowlist; 404 on missing media.
- `matchMedia.feed` — groups by match; cursor pagination yields correct next page.

### Manual end-to-end test plan
Run through this on staging before production deploy, and again after production deploy.

1. Log in as participant → upload a photo → appears in per-match gallery → appears in global feed grouped under the right match.
2. Upload a video → poster shows on the grid tile → video plays in lightbox.
3. Log in as non-participant → Upload button is hidden → direct `POST` to the API returns 403.
4. React with 🍺 → count increments, pill fills. Tap again → decrements and un-fills.
5. Delete own upload → gone from gallery + feed; R2 object and reaction rows gone.
6. As admin, delete another user's upload → same.
7. Upload a >10 MB photo (bypass compression) → rejected client-side and server-side with `multimedia.errors.fileTooLarge`.
8. Upload a >50 MB video → rejected client-side and server-side.
9. Switch locale EN ↔ ES → all new strings swap; count pluralization works.
10. Social tab → Multimedia card is enabled, navigates to the global feed.
11. Match detail "Gallery" card shows correct count; "Add the first photo →" appears when empty.
12. Pull-to-refresh works on both gallery and feed.

### Tooling for verification
- Run `pnpm typecheck` and `pnpm lint` at the repo root.
- `pnpm --filter api test` for backend integration tests.
- Chrome DevTools MCP to exercise the web build (gallery grid rendering, lightbox keyboard nav).
- iOS Simulator MCP to exercise the native build (camera roll picker, video playback).

## Explicitly out of scope for v1

- Threaded comments under media.
- Server-side image/video transcoding.
- Public share links (no-login access).
- Tagging players in photos.
- In-app download / share sheet (user can long-press on web or use OS share on native as a workaround).
- AVIF output.
- Caption editing after upload (can be added in v1.1 — backend procedure `matchMedia.updateCaption` is listed above but the UI is deferred).

## Open follow-ups (post-ship, not blocking)

- Add `.superpowers/` to `.gitignore`.
- Decide whether to persist uploads through brief offline periods (retry queue).
- Observability: add a Cloudflare Workers log line on upload success/failure with match/user IDs for debugging early issues.
