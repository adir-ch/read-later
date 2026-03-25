#!/usr/bin/env node
/**
 * Imports Pocket-style JSON (array of { url, tags, title }) into ReadLater's SQLite DB.
 * Uses the same schema as src/main/db.ts (articles + tags + FTS triggers).
 *
 * Usage:
 *   node scripts/import-pocket.mjs [path/to/pocket-data-fixed.json]
 *   READLATER_DB=/path/to/readlater.db node scripts/import-pocket.mjs
 *
 * Env:
 *   READLATER_DB — SQLite path (default: ~/Library/Application Support/readlater/readlater.db on darwin)
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import Database from 'better-sqlite3'

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

const jsonPath =
  process.argv[2] || path.join(os.homedir(), 'Desktop/pocket-data-fixed.json')
const dbPath = defaultDbPath()

if (!fs.existsSync(jsonPath)) {
  console.error('Input JSON not found:', jsonPath)
  console.error('Fix pocket-data.json first: node scripts/fix-pocket-json.mjs')
  process.exit(1)
}

const raw = fs.readFileSync(jsonPath, 'utf8')
let items
try {
  items = JSON.parse(raw)
} catch (e) {
  console.error('Invalid JSON:', e.message)
  process.exit(1)
}

if (!Array.isArray(items)) {
  console.error('Expected a JSON array')
  process.exit(1)
}

const db = new Database(dbPath)
initDb(db)

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

const importOne = db.transaction((row) => {
  const urlRaw = row.url
  if (!urlRaw || !String(urlRaw).trim()) {
    skippedEmpty++
    return
  }
  const url = normalizeUrl(urlRaw)
  const title = row.title != null && String(row.title).trim() !== '' ? String(row.title) : null

  const ins = insertArticle.run(url, title)
  const idRow = selectIdByUrl.get(url)
  if (!idRow) return
  const id = idRow.id

  if (ins.changes === 0) duplicates++
  else inserted++

  const tagList = Array.isArray(row.tags) ? row.tags : []
  for (const t of tagList) {
    const tag = normalizeTag(t)
    if (!tag) continue
    const r = insertTag.run(id, tag)
    if (r.changes) tagsAdded++
  }
})

for (const row of items) {
  try {
    importOne(row)
  } catch (e) {
    console.error('Row error:', e.message, row?.url ?? row)
  }
}

db.close()

console.log('Database:', dbPath)
console.log('Source:', jsonPath)
console.log('Articles inserted (new URLs):', inserted)
console.log('Rows skipped (empty url):', skippedEmpty)
console.log('URLs already present (tags merged):', duplicates)
console.log('Tag rows added (new pairs):', tagsAdded)
