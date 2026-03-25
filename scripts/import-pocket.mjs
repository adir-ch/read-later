#!/usr/bin/env node
/**
 * Imports Pocket-style JSON into ReadLater SQLite (same schema as src/main/db.ts).
 * Reads UTF-8 file → regex title repair → JSON.parse → optional jsonrepair fallback.
 *
 * Usage:
 *   node scripts/import-pocket.mjs [--clean] [path/to/export.json]
 *   POCKET_JSON=/path/to/export.json READLATER_DB=/path/to/readlater.db node scripts/import-pocket.mjs
 *
 * Flags:
 *   --clean  Delete all articles (and tags) before import. Env: POCKET_IMPORT_CLEAN=1
 *
 * JSON: top-level array of { url, tags, title } or `{ "bookmarks": [ ... ] }` (strict parse, no title mangling).
 *
 * Env:
 *   POCKET_JSON — input file (overrides argv path)
 *   READLATER_DB — SQLite path (default: ~/Library/Application Support/readlater/readlater.db on darwin)
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import Database from 'better-sqlite3'
import { loadPocketArrayFromRawText } from './pocket-json-repair.mjs'

function defaultDbPath() {
  if (process.env.READLATER_DB) return path.resolve(process.env.READLATER_DB)
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Application Support/readlater/readlater.db')
  }
  return path.join(os.homedir(), '.config/readlater/readlater.db')
}

function initDb(db) {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      url         TEXT    NOT NULL UNIQUE,
      title       TEXT,
      summary     TEXT,
      favicon     TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      status      TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS tags (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag         TEXT    NOT NULL,
      UNIQUE(article_id, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_tags_tag        ON tags(tag);
    CREATE INDEX IF NOT EXISTS idx_tags_article_id ON tags(article_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title, summary,
      content='articles', content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, summary) VALUES (new.id, new.title, new.summary);
    END;

    CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary) VALUES ('delete', old.id, old.title, old.summary);
      INSERT INTO articles_fts(rowid, title, summary) VALUES (new.id, new.title, new.summary);
    END;

    CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary) VALUES ('delete', old.id, old.title, old.summary);
    END;
  `)
  const cols = db.prepare('PRAGMA table_info(articles)').all()
  if (!cols.some((c) => c.name === 'cover_image')) {
    db.exec('ALTER TABLE articles ADD COLUMN cover_image TEXT')
  }
}

function normalizeUrl(url) {
  const t = String(url).trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function normalizeTag(tag) {
  return String(tag).trim()
}

const argvFiltered = process.argv.slice(2).filter((a) => a !== '--clean')
const clean =
  process.argv.includes('--clean') || process.env.POCKET_IMPORT_CLEAN === '1'

const jsonPath =
  process.env.POCKET_JSON ||
  argvFiltered[0] ||
  path.join(os.homedir(), 'Desktop/pocket-data.json')
const dbPath = defaultDbPath()

if (!fs.existsSync(jsonPath)) {
  console.error('Input JSON not found:', jsonPath)
  process.exit(1)
}

const raw = fs.readFileSync(jsonPath, 'utf8')
const loaded = loadPocketArrayFromRawText(raw)
if (!loaded.ok) {
  console.error('Could not parse Pocket JSON after repair:', loaded.parseError?.message ?? loaded.error?.message)
  if (loaded.partial) {
    const partialPath = jsonPath + '.repair-partial.txt'
    fs.writeFileSync(partialPath, loaded.partial, 'utf8')
    console.error('Wrote repaired text to', partialPath)
  }
  process.exit(1)
}

const items = loaded.data

const db = new Database(dbPath)
initDb(db)

if (clean) {
  db.exec('DELETE FROM articles')
  console.log('Cleared existing articles (tags cascade).')
}

const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles (url, title, summary, favicon, cover_image, status)
  VALUES (?, ?, NULL, NULL, NULL, 'done')
`)
const selectIdByUrl = db.prepare('SELECT id FROM articles WHERE url = ?')
const insertTag = db.prepare('INSERT OR IGNORE INTO tags (article_id, tag) VALUES (?, ?)')

let inserted = 0
let skippedEmpty = 0
let duplicates = 0
let tagsAdded = 0
let rowErrors = 0

const importAll = db.transaction(() => {
  for (const row of items) {
    try {
      const urlRaw = row.url
      if (!urlRaw || !String(urlRaw).trim()) {
        skippedEmpty++
        continue
      }
      const url = normalizeUrl(urlRaw)
      const title = row.title != null && String(row.title).trim() !== '' ? String(row.title) : null

      const ins = insertArticle.run(url, title)
      const idRow = selectIdByUrl.get(url)
      if (!idRow) continue
      const id = idRow.id

      if (ins.changes === 0) duplicates++
      else inserted++

      const tagList = [...new Set((Array.isArray(row.tags) ? row.tags : []).map(normalizeTag).filter(Boolean))]
      for (const tag of tagList) {
        const r = insertTag.run(id, tag)
        if (r.changes) tagsAdded++
      }
    } catch (e) {
      rowErrors++
      console.error('Row error:', e.message, row?.url ?? row)
    }
  }
})

importAll()

db.close()

console.log('Database:', dbPath)
console.log('Source:', jsonPath)
console.log('Articles inserted (new URLs):', inserted)
console.log('Rows skipped (empty url):', skippedEmpty)
console.log('URLs already present (tags merged):', duplicates)
console.log('Tag rows added (new pairs):', tagsAdded)
if (rowErrors) console.log('Row errors:', rowErrors)
