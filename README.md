# ReadLater

Local-first desktop app (Electron) for saving URLs and generating short summaries with **Anthropic Claude**. The UX targets **macOS** (menu bar tray); you can also run it on **Windows** and **Linux** from source. Data stays on your machine in SQLite; nothing is synced to a cloud service by the app itself.

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

- **Node.js** (LTS recommended) and **npm** (for development and building from source).
- **Electron** runs on **macOS, Windows, and Linux**. The UI is tuned for **macOS** (menu bar tray, dock behavior); on other OSes the same features run with the standard Electron window/tray behavior for that platform.
- Packaged installers: this repo’s **`npm run build`** currently produces a **macOS DMG** only (see [Building](#building)). Windows and Linux packages require adding `electron-builder` targets (for example `nsis` or `portable` on Windows, `AppImage` or `deb` on Linux).

---

## Running ReadLater

### Option A — Development (macOS, Windows, Linux)

From the project root:

```bash
npm install
npm run dev
```

This starts the app via **electron-vite** with hot reload. On first install, **`postinstall`** rebuilds **better-sqlite3** for Electron; if that fails, see [Native modules](#native-modules-better-sqlite3) below.

### Option B — Packaged app (macOS)

After [building](#building), open the **`.dmg`** from `dist/`, drag **ReadLater** into **Applications**, and launch it like any other app.

### Option C — Run the built app without a DMG (any OS)

After `npm run build` (or `electron-vite build`), you can run the output app bundle from `dist/` if your platform produced one. For day-to-day use on Windows/Linux, use **Option A** until you add installer targets.

---

## Where the database and API key file live

The app stores SQLite as **`readlater.db`** under Electron’s **`userData`** directory (same folder as the optional encrypted API key file **`.apikey`**).

The folder name comes from **`name`** in `package.json` (`readlater`), not the display name **ReadLater**.

| OS | Typical `userData` path | Database file |
|----|-------------------------|----------------|
| **macOS** | `~/Library/Application Support/readlater/` | `readlater.db` |
| **Windows** | `%APPDATA%\readlater\` (usually `C:\Users\<you>\AppData\Roaming\readlater\`) | `readlater.db` |
| **Linux** | `$XDG_CONFIG_HOME/readlater/` or `~/.config/readlater/` | `readlater.db` |

SQLite may also create **`readlater.db-wal`** and **`readlater.db-shm`** next to the database (WAL mode). Back up **`readlater.db`** (and WAL/SHM if present while the app is closed) to keep your library.

The **Pocket import** script defaults to macOS paths; on Windows/Linux set **`READLATER_DB`** explicitly, for example:

```bash
# Linux
READLATER_DB="$HOME/.config/readlater/readlater.db" node scripts/import-pocket.mjs --clean export.json
```

```powershell
# Windows (PowerShell)
$env:READLATER_DB="$env:APPDATA\readlater\readlater.db"; node scripts/import-pocket.mjs --clean export.json
```

---

## Configuring the LLM API key (article summaries)

Summaries use the **Anthropic** API (**Claude**; model id `claude-sonnet-4-20250514` in [`src/main/summariser.ts`](src/main/summariser.ts)). Without a key, titles still load from the page but summaries show a “API key not configured” style message.

### 1. Environment variable `ANTHROPIC_API_KEY` (works everywhere)

Set the variable **before** starting ReadLater (development or packaged if your launcher passes env vars).

**macOS / Linux (bash/zsh):**

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
npm run dev
```

**Windows (PowerShell):**

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
npm run dev
```

**Windows (Command Prompt):**

```cmd
set ANTHROPIC_API_KEY=sk-ant-api03-...
npm run dev
```

To persist for GUI apps on macOS, you can use a `launchd` plist, **Automator**, or a small wrapper script that exports the variable then opens the `.app`. On Windows, set a user environment variable under **System Properties → Environment Variables**, or use a shortcut that sets it before launch.

### 2. Encrypted key file (optional)

If the OS supports Electron **`safeStorage`**, the app can store the key in **`<userData>/.apikey`** (encrypted). The renderer exposes **`window.api.saveApiKey`** / **`getApiKeyStatus`** via IPC ([`src/main/index.ts`](src/main/index.ts)); there is no settings screen in the UI yet—callers would use the preload API from devtools or a future settings panel. On startup, if **`ANTHROPIC_API_KEY`** is not already set, a valid **`.apikey`** file is decrypted into memory.

If **`ANTHROPIC_API_KEY`** is set in the environment, it takes precedence over the file.

---

## Native modules (better-sqlite3)

**better-sqlite3** is a native addon: it must match **Electron’s** Node ABI for `npm run dev` and your **system Node** ABI if you run `scripts/import-pocket.mjs` with Node directly. After `npm install`, **`postinstall`** runs **`electron-rebuild`**. If CLI import fails with a version mismatch, run **`npm rebuild better-sqlite3`**, then **`npm run rebuild:native`** before **`npm run dev`** again.

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
| `npm run fix-pocket` | Repair malformed Pocket export → writes `*-fixed.json` (see script argv) |
| `npm run import-pocket` | Import Pocket JSON into SQLite (defaults to `~/Desktop/pocket-data.json`, repairs on load) |

See [Native modules (better-sqlite3)](#native-modules-better-sqlite3) if install or import fails with an ABI error.

## Building

```bash
npm run build
```

Outputs application bundles under `dist/` (electron-builder configuration is in `package.json`: app id `com.readlater.app`, product name **ReadLater**, mac target **dmg**).

The build copies `assets/` into the app as **extra resources** (e.g. `trayIconTemplate.png` for the menu bar icon). Ensure that folder exists with the expected icons when packaging.

## Data storage

- **Database file:** `readlater.db` (SQLite with WAL). Exact paths per OS are in [Where the database and API key file live](#where-the-database-and-api-key-file-live).
- **Schema:** Articles (URL, title, summary, favicon, cover image, status, timestamps), **tags** table, and FTS5 for search. All data stays **local** on your machine.

### Importing from Pocket

The importer accepts:

- **`{ "bookmarks": [ { "url", "tags", "title" }, ... ] }`** (normal Pocket JSON export) — parsed as-is, no title mangling.
- A **top-level array** of the same objects, or legacy broken exports (regex repair + `jsonrepair` fallback).

Use **`--clean`** (or `POCKET_IMPORT_CLEAN=1`) to **wipe all articles** (tags cascade) before importing.

**One-shot import (recommended):**

```bash
READLATER_DB="$HOME/Library/Application Support/readlater/readlater.db" \
  node scripts/import-pocket.mjs --clean /path/to/pocket-export.json
```

Or set **`POCKET_JSON`** instead of passing a path: `POCKET_JSON=/path/to/pocket-data.json node scripts/import-pocket.mjs`.

**Optional:** write repaired, pretty-printed JSON only (no DB writes):

```bash
npm run fix-pocket -- /path/to/pocket-data.json /path/to/pocket-data-fixed.json
```

Default input paths: **import** uses `~/Desktop/pocket-data.json` when no argv/`POCKET_JSON`; **fix-pocket** uses `~/Desktop/pocket-data.json` → `pocket-data-fixed.json`.

Default database on macOS: `~/Library/Application Support/readlater/readlater.db`. Override with **`READLATER_DB`**. Quit ReadLater before importing if you want to avoid concurrent writes.

Imports set `status` to `done` and leave `summary` empty. URLs without `http://` or `https://` get `https://`. **`INSERT OR IGNORE`** on articles: existing URLs are skipped for the row, but **tags are merged** (`INSERT OR IGNORE` on `(article_id, tag)`).

The repo includes **`tsx`** for running TypeScript tooling if you add `.ts` scripts later; import remains `scripts/import-pocket.mjs`.

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
