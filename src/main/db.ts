import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Article, TagExpr } from '../shared/types'

let db: Database.Database

export function initDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'readlater.db')
  db = new Database(dbPath)
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

  const cols = db.prepare('PRAGMA table_info(articles)').all() as { name: string }[]
  if (!cols.some((c) => c.name === 'cover_image')) {
    db.exec('ALTER TABLE articles ADD COLUMN cover_image TEXT')
  }
}

function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row['id'] as number,
    url: row['url'] as string,
    title: (row['title'] as string | null) ?? null,
    summary: (row['summary'] as string | null) ?? null,
    favicon: (row['favicon'] as string | null) ?? null,
    cover_image: (row['cover_image'] as string | null) ?? null,
    created_at: row['created_at'] as string,
    status: row['status'] as Article['status'],
    tags: row['tags'] ? String(row['tags']).split(',').filter(Boolean) : [],
  }
}

const BASE_SELECT = `
  SELECT a.*, GROUP_CONCAT(t.tag) AS tags
  FROM articles a
  LEFT JOIN tags t ON t.article_id = a.id
`

export function getAllArticles(): Article[] {
  const rows = db.prepare(`${BASE_SELECT} GROUP BY a.id ORDER BY a.created_at DESC`).all() as Record<string, unknown>[]
  return rows.map(rowToArticle)
}

export function getArticleById(id: number): Article | null {
  const row = db.prepare(`${BASE_SELECT} WHERE a.id = ? GROUP BY a.id`).get(id) as Record<string, unknown> | undefined
  return row ? rowToArticle(row) : null
}

export function insertArticle(url: string): number {
  const result = db.prepare(`INSERT INTO articles (url, status) VALUES (?, 'pending')`).run(url)
  return result.lastInsertRowid as number
}

export function updateArticle(id: number, data: {
  title: string | null
  summary: string | null
  favicon: string | null
  cover_image: string | null
  status: Article['status']
}): void {
  db.prepare(`UPDATE articles SET title = ?, summary = ?, favicon = ?, cover_image = ?, status = ? WHERE id = ?`)
    .run(data.title, data.summary, data.favicon, data.cover_image, data.status, id)
}

export function deleteArticle(id: number): void {
  db.prepare('DELETE FROM articles WHERE id = ?').run(id)
}

export function restoreArticle(article: Article): number {
  const result = db.prepare(`
    INSERT INTO articles (url, title, summary, favicon, cover_image, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO NOTHING
  `).run(article.url, article.title, article.summary, article.favicon, article.cover_image, article.created_at, article.status)

  if (result.lastInsertRowid) {
    const newId = result.lastInsertRowid as number
    for (const tag of article.tags) {
      addTagToArticle(newId, tag)
    }
    return newId
  }

  const existing = db.prepare('SELECT id FROM articles WHERE url = ?').get(article.url) as { id: number } | undefined
  return existing?.id ?? 0
}

export function searchFts(query: string): Article[] {
  const rows = db.prepare(`
    ${BASE_SELECT}
    INNER JOIN articles_fts ON articles_fts.rowid = a.id
    WHERE articles_fts MATCH ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all(query) as Record<string, unknown>[]
  return rows.map(rowToArticle)
}

function tagExprToSql(expr: TagExpr, params: string[]): string {
  switch (expr.type) {
    case 'tag': {
      params.push(expr.value)
      return `EXISTS (SELECT 1 FROM tags WHERE article_id = a.id AND tag = ?)`
    }
    case 'not': {
      const inner = tagExprToSql(expr.operand, params)
      return `NOT (${inner})`
    }
    case 'and': {
      const left = tagExprToSql(expr.left, params)
      const right = tagExprToSql(expr.right, params)
      return `(${left} AND ${right})`
    }
    case 'or': {
      const left = tagExprToSql(expr.left, params)
      const right = tagExprToSql(expr.right, params)
      return `(${left} OR ${right})`
    }
  }
}

export function searchByTags(expr: TagExpr): Article[] {
  const params: string[] = []
  const condition = tagExprToSql(expr, params)
  const rows = db.prepare(`
    ${BASE_SELECT}
    WHERE ${condition}
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all(...params) as Record<string, unknown>[]
  return rows.map(rowToArticle)
}

export function getAllTags(): string[] {
  const rows = db.prepare('SELECT DISTINCT tag FROM tags ORDER BY tag').all() as { tag: string }[]
  return rows.map((r) => r.tag)
}

export function addTagToArticle(articleId: number, tag: string): void {
  db.prepare('INSERT OR IGNORE INTO tags (article_id, tag) VALUES (?, ?)').run(articleId, tag)
}

export function removeTagFromArticle(articleId: number, tag: string): void {
  db.prepare('DELETE FROM tags WHERE article_id = ? AND tag = ?').run(articleId, tag)
}

export function urlExists(url: string): boolean {
  const row = db.prepare('SELECT 1 FROM articles WHERE url = ?').get(url)
  return row !== undefined
}
