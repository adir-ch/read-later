/**
 * Repairs malformed Pocket-style JSON exports (broken title strings, glued objects).
 * mergeTitle: prefix from first quoted segment + human title spill (see plan).
 *
 * Valid exports may be:
 * - a JSON array of { url, tags, title }
 * - { "bookmarks": [ ... ] } (e.g. Pocket JSON export)
 */
import { jsonrepair } from 'jsonrepair'

export function mergeTitle(prefix, rest) {
  const p = prefix.trim()
  const r = rest.trim().replace(/\s+/g, ' ')
  if (!p) return r
  if (!r) return p
  return `${p} — ${r}`
}

/** One known export: URL split across lines + HTML-ish junk inside the title. */
export function fixCalcalist(s) {
  return s.replace(
    /"url":"www\.calcalist\.co\.il\/local\/articles\/0","tags":\["7340"\],"title":"L-3770128,\s*\r?\n\s*00\.html\?ref=ynet,tags="interviews",&quot;איך נראה יום מדהים בעבודה\?&quot; - השאלות ששואל מנכ&quot;ל קלטורה בראיונות"/g,
    '"url":"https://www.calcalist.co.il/local/articles/0,7340/L-3770128,00.html?ref=ynet","tags":["interviews"],"title":"איך נראה יום מדהים בעבודה? - השאלות ששואל מנכ\\"ל קלטורה בראיונות"',
  )
}

/** Regex repair pass (iterate until stable). */
export function repairPocketJson(raw) {
  let s = fixCalcalist(raw)
  let iterations = 0
  const maxIter = 5000

  while (iterations < maxIter) {
    iterations++
    const before = s

    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([^"]+?)"\s*\}\s*,\s*\{\s*"url"\s*:/g,
      (_, prefix, rest) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}},{"url":`,
    )

    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([\s\S]+?)\}\s*,\s*\{\s*"url"\s*:/g,
      (_, prefix, rest) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}},{"url":`,
    )

    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([^"]+?)"\s*\r?\n(\s*\},)/g,
      (_, prefix, rest, closing) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}\n${closing}`,
    )

    if (s === before) break
  }

  if (iterations >= maxIter) {
    console.warn('warning: pocket-json-repair stopped after max iterations')
  }
  return s
}

/**
 * repair → JSON.parse; on failure jsonrepair → JSON.parse.
 * Returns { ok: true, data } or { ok: false, error, partial }
 */
function normalizeParsedTopLevel(data) {
  if (Array.isArray(data)) return { ok: true, data }
  if (data && typeof data === 'object' && Array.isArray(data.bookmarks)) {
    return { ok: true, data: data.bookmarks }
  }
  return { ok: false, error: new Error('Expected a JSON array or { bookmarks: [...] }') }
}

export function parsePocketExport(repairedText) {
  try {
    const data = JSON.parse(repairedText)
    const norm = normalizeParsedTopLevel(data)
    if (!norm.ok) return norm
    return { ok: true, data: norm.data }
  } catch (e1) {
    try {
      const fixed = jsonrepair(repairedText)
      const data = JSON.parse(fixed)
      const norm = normalizeParsedTopLevel(data)
      if (!norm.ok) return { ...norm, parseError: e1 }
      return { ok: true, data: norm.data }
    } catch (e2) {
      return { ok: false, error: e2, partial: repairedText, parseError: e1 }
    }
  }
}

/**
 * Try strict JSON first (no regex repair). Handles top-level array or `{ bookmarks: [...] }`.
 */
export function tryParsePocketBookmarksStrict(raw) {
  try {
    const data = JSON.parse(raw)
    if (Array.isArray(data)) {
      return { ok: true, data }
    }
    if (data && typeof data === 'object' && Array.isArray(data.bookmarks)) {
      return { ok: true, data: data.bookmarks }
    }
    return {
      ok: false,
      error: new Error('Expected a JSON array or an object with a "bookmarks" array'),
    }
  } catch (e) {
    return { ok: false, error: e }
  }
}

/** Read UTF-8: strict parse first; on failure, regex repair → parse → jsonrepair fallback. */
export function loadPocketArrayFromRawText(raw) {
  const strict = tryParsePocketBookmarksStrict(raw)
  if (strict.ok) return strict

  const repaired = repairPocketJson(raw)
  return parsePocketExport(repaired)
}
