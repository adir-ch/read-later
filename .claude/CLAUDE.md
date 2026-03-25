# ReadLater — Claude Code Instructions

## Project Overview

Local-first macOS tray app (Electron + React + TypeScript) that saves URLs, generates AI summaries via the Claude API, and provides full-text + boolean tag search. All data lives in a local SQLite database. No cloud, no accounts, no telemetry.

---

## Commands

```bash
npm run dev          # start Electron + Vite dev server with HMR
npm run build        # tsc check + Vite build + electron-builder → .dmg
npm run typecheck    # tsc --noEmit on both main and renderer tsconfigs
```

> Always run `npm run typecheck` before considering any task complete.

---

## Architecture

```
src/
  shared/      # ← shared types only, no Node or DOM imports
  main/        # ← Electron main process (Node.js, CommonJS)
  preload/     # ← contextBridge only, no business logic
  renderer/    # ← React app (ESNext, DOM)
```

Two separate TypeScript compilation targets:
- `tsconfig.main.json` — targets Node/CommonJS for `src/main/` and `src/preload/`
- `tsconfig.renderer.json` — targets ESNext/DOM for `src/renderer/`

**The renderer has zero Node.js access.** Everything goes through `window.api` (defined in `src/preload/index.ts`).

---

## Key Files

| File | Purpose |
|---|---|
| `src/shared/types.ts` | All shared interfaces: `Article`, `TagExpr`, `SaveUrlResponse`, etc. |
| `src/main/index.ts` | Tray lifecycle, window management, all `ipcMain.handle` registrations |
| `src/main/db.ts` | SQLite setup, all query functions, FTS5 table + triggers |
| `src/main/summariser.ts` | HTTP fetch + Claude API call (background, non-blocking) |
| `src/preload/index.ts` | Typed `contextBridge.exposeInMainWorld('api', ...)` |
| `src/renderer/App.tsx` | Root component, all top-level state |
| `src/renderer/hooks/useTagParser.ts` | Parses `#tag -#other` string → `TagExpr` AST |

---

## Database

SQLite via `better-sqlite3`. DB path: `app.getPath('userData')/readlater.db`.

Three objects: `articles` table, `tags` table, `articles_fts` FTS5 virtual table.

- **Never** store full article HTML/body — only `url`, `title`, `summary`, `favicon`, `status`, `created_at`
- Tags live in a **separate `tags` table** (not a JSON column) — this is required for efficient boolean tag queries
- FTS5 is kept in sync via INSERT/UPDATE/DELETE triggers on `articles` — do not manually write to `articles_fts`
- All DB calls are **synchronous** (`better-sqlite3` is sync-only) — keep them in the main process

---

## IPC Rules

- Every channel has a corresponding type in `src/shared/types.ts`
- `ipcMain.handle` returns plain serialisable objects — never return class instances or Buffers
- The renderer calls `window.api.*` — never call `ipcRenderer` directly in components
- Push events (main → renderer): only `article-updated (id: number)` exists; register listener in `App.tsx` via `window.api.onArticleUpdated`

---

## TypeScript Rules

- **Strict mode** everywhere — `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- **Zero `any`** in production code — use `unknown` + type guards if you must
- **Zero `@ts-ignore`** — fix the type, don't suppress it
- All types shared between main and renderer come from `src/shared/types.ts` — never duplicate them
- `window.api` shape is declared in `src/renderer/env.d.ts`

---

## React Rules

- `<ArticleCard>` must be wrapped in `React.memo` — the list can have 1,000+ items
- Pass callbacks via `useCallback` to avoid breaking memoisation
- No external state library — `useState` / `useReducer` in `App.tsx` is sufficient for v1
- Search is debounced 200 ms in `useSearch.ts` — do not call IPC on every keystroke
- The `useTagParser` hook parses the search string client-side into a `TagExpr` AST before sending to IPC

---

## Tag Boolean Search

Search strings starting with `#` are tag queries. Supported syntax:

```
#react                      AND (single tag)
#react #typescript          AND (both required)
#react | #vue               OR
#react -#jquery             NOT
#(react | vue) #typescript  grouped OR within AND
```

Flow: raw string → `useTagParser` → `TagExpr` AST → `window.api.searchTags(expr)` → IPC → `db.ts` compiles AST to SQL using `EXISTS` / `NOT EXISTS` subqueries.

---

## Summariser

`src/main/summariser.ts` is called in the background after a URL is saved. It must:

1. Fetch the page HTML (10 s timeout, `User-Agent: Mozilla/5.0 (compatible; ReadLater/1.0)`)
2. Extract `<title>` tag
3. Strip all HTML tags, truncate to 8,000 chars
4. Call Claude API — model `claude-sonnet-4-20250514`, max 300 tokens
5. Update the `articles` row (`title`, `summary`, `favicon`, `status = 'done'`)
6. Send `article-updated` IPC push to renderer
7. On **any** error: set `status = 'error'`, still send `article-updated` — never leave status as `pending`

Claude API prompt:
```
Summarize in 2–4 sentences. If not an article (e.g. a homepage or app), describe what the page is about.

URL: <url>
Title: <title>
Content: <stripped text>
```

---

## Security

- `nodeIntegration: false`, `contextIsolation: true` — never change these
- No `eval()` anywhere
- CSP header set on the window: `default-src 'self'; script-src 'self'`
- API key read from `ANTHROPIC_API_KEY` env var or `safeStorage` keychain — never hardcoded, never stored in SQLite

---

## Style / UI

- Design tokens in `src/renderer/styles/tokens.css` — always use CSS variables, never hardcode hex values in components
- Dark theme only (`--bg: #0e0e10`)
- Accent colour: `--accent: #c8f566` (yellow-green) — used for focus rings, primary buttons, logo
- Fonts: Fraunces (display) + DM Mono (UI) — loaded from Google Fonts in `index.html`
- No UI component library — vanilla CSS modules + CSS variables only

---

## What NOT to Do

- Do not store full article HTML or body text in the database
- Do not call `ipcRenderer` directly from React components — use `window.api`
- Do not write to `articles_fts` directly — triggers handle it
- Do not add cloud sync, analytics, or any outbound network call beyond Claude API + favicon fetch
- Do not add an external state management library (Redux, Zustand, etc.) in v1
- Do not use `any` or `@ts-ignore`
- Do not store the Anthropic API key in SQLite