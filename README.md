# ReadLater

Local-first **macOS** menu bar app for saving URLs and generating short summaries with **Anthropic Claude**. Data stays on your machine in SQLite; nothing is synced to a cloud service by the app itself.

## Features

- **Tray popover** — Click the tray icon to open a compact window; it hides when focus leaves (unless DevTools is open).
- **Desktop window** — Double-click the tray icon to open a larger, resizable window with standard window chrome (traffic lights). Close with **⌘W** or the window controls.
- **Save URLs** — Paste `http://` or `https://` links; duplicates are rejected.
- **AI summaries** — Fetches the page HTML, strips text, and asks Claude for a 2–4 sentence summary (with a sensible fallback if the key is missing).
- **Metadata** — Page title, favicon URL, and a cover image when available (Open Graph / Twitter meta or first suitable `<img>`).
- **Search** — Full-text search over title and summary (SQLite FTS5).
- **Tags** — Add/remove tags per article; filter from the tag strip or use **tag search mode** in the search box (see below).
- **Dark / light theme** — Toggle in the header; preference is stored in `localStorage`.
- **Undo delete** — After removing an article, restore it from the toast before it dismisses.

## Requirements

- **macOS** (the build is configured for Mac only; tray and window behavior target macOS).
- **Node.js** (LTS recommended) and **npm**.
- An **[Anthropic API key](https://console.anthropic.com/)** if you want AI-generated summaries (optional; titles and error messages still update without it).

## Anthropic API key

Summaries use the Claude API (`claude-sonnet-4-20250514` in code). Configure the key in either way:

1. **Environment variable** — Set `ANTHROPIC_API_KEY` before starting the app (useful in development).
2. **Encrypted storage** — The main process can persist the key with Electron `safeStorage` under the app user data directory (see IPC `save-api-key` in the codebase). If you add a settings UI later, it would call the same bridge as `window.api.saveApiKey`.

On launch, a key file in user data is decrypted into `process.env.ANTHROPIC_API_KEY` when encryption is available.

## Development

```bash
npm install
npm run dev
```

This runs **electron-vite** in development mode (Vite for the renderer, bundled main/preload).

Other scripts:

| Script        | Description                                      |
|---------------|--------------------------------------------------|
| `npm run dev` | Development with hot reload                      |
| `npm run build` | Production build + **electron-builder** macOS DMG |
| `npm run typecheck` | Typecheck main and renderer TypeScript projects |
| `npm run preview` | Preview production build locally                  |
| `npm run import-pocket` | Import Pocket JSON (defaults to `~/Desktop/pocket-data-fixed.json`) |

Native modules (**better-sqlite3**) are compiled for Electron; if install fails, follow Electron’s docs for rebuilding native addons (`@electron/rebuild` is a dev dependency). For CLI import under system Node, you may need `npm rebuild better-sqlite3`.

## Building

```bash
npm run build
```

Outputs application bundles under `dist/` (electron-builder configuration is in `package.json`: app id `com.readlater.app`, product name **ReadLater**, mac target **dmg**).

The build copies `assets/` into the app as **extra resources** (e.g. `trayIconTemplate.png` for the menu bar icon). Ensure that folder exists with the expected icons when packaging.

## Data storage

- **Database:** `readlater.db` in Electron’s **userData** directory (SQLite with WAL mode).
- **Schema:** Articles (URL, title, summary, favicon, cover image, status, timestamps) and a separate **tags** table; FTS5 virtual table for search.

Your articles and tags remain local to your Mac user account.

### Importing from Pocket

1. Repair a broken Pocket JSON export: `node scripts/fix-pocket-json.mjs /path/to/pocket-data.json /path/to/pocket-data-fixed.json`
2. Import into the app database (quit ReadLater first): `node scripts/import-pocket.mjs /path/to/pocket-data-fixed.json`

Default database path on macOS: `~/Library/Application Support/readlater/readlater.db`. Override with `READLATER_DB=/path/to/readlater.db`.

Imports set `status` to `done` and leave `summary` empty. URLs without `http://` or `https://` get `https://`. Re-running the import skips existing URLs but **merges** any new tags.

**Native module ABI:** After `npm install`, `postinstall` runs `electron-rebuild` so `better-sqlite3` matches **Electron** (needed for `npm run dev`). If you run CLI scripts with **system Node** (e.g. `import-pocket.mjs`) and see an ABI mismatch, run `npm rebuild better-sqlite3`. Before `npm run dev` again, run `npm run rebuild:native` (or `npm install`) so the addon matches Electron again.

## Search and tags

- **Plain text** in the search field runs FTS over title and summary.
- **Tag mode** starts when the query begins with `#`. Examples:
  - `#react #ts` — articles that have both tags (AND)
  - `#react | #vue` — either tag (OR)
  - `#react -#jquery` — react but not jquery (NOT)
  - Parentheses group expressions.

The tag strip toggles additional tag filters that combine with your search query as implemented in the UI.

## Tech stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) + [Vite](https://vitejs.dev/)
- [React 18](https://react.dev/) (renderer)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + SQLite FTS5
- [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)
- TypeScript

## License

Apache License 2.0 — see [LICENSE](LICENSE).
