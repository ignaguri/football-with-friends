# Archived docs

Historical planning and migration documents. **They do not describe the current codebase** and are kept only for context on how the project got here. Do not treat anything in this folder as current architecture. For that, read the root [`CLAUDE.md`](../../CLAUDE.md) and the live docs in [`docs/`](../).

Two big shifts already happened and are baked into these files:

- **Google Sheets → Turso/LibSQL** for storage. Sheets is gone (`STORAGE_PROVIDER` accepts only `turso | local-db`).
- **Next.js web-only → universal Expo app** with a standalone Hono API. The API uses **Hono RPC**, not oRPC (oRPC was planned but never wired, and has since been removed).

| File | What it was | Why it's archived |
|---|---|---|
| `implementation-plan.md` | Original web app spec | Built around Google Sheets as the source of truth |
| `storage-migration-plan.md` | Sheets → Turso migration plan | Migration complete |
| `universal-app-migration-plan.md` | Next.js → Expo migration plan | Migration complete; also prescribes the removed oRPC layer |
| `mvp-tasks.md` | MVP checklist | Sheets-era; most items shipped |
| `App_revamp_plan_WIP.md` | Rough revamp scratch note | Superseded; several items already shipped |
