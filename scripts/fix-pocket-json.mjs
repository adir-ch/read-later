#!/usr/bin/env node
/**
 * Repairs malformed Pocket export JSON where:
 * 1) "title": "prefix",Rest} , { "url" — rest not quoted (multiline ok)
 * 2) "title": "prefix",Rest" } , { "url" — rest ends with " before }
 * 3) "title": "prefix",Rest" newline } — rest ends with " before closing };
 */
import fs from 'fs'
import path from 'path'
import { jsonrepair } from 'jsonrepair'

function mergeTitle(prefix, rest) {
  const p = prefix.trim()
  const r = rest.trim().replace(/\s+/g, ' ')
  if (!p) return r
  if (!r) return p
  return `${p} — ${r}`
}

/** One known export: URL split across lines + HTML-ish junk inside the title. */
function fixCalcalist(s) {
  return s.replace(
    /"url":"www\.calcalist\.co\.il\/local\/articles\/0","tags":\["7340"\],"title":"L-3770128,\s*\r?\n\s*00\.html\?ref=ynet,tags="interviews",&quot;איך נראה יום מדהים בעבודה\?&quot; - השאלות ששואל מנכ&quot;ל קלטורה בראיונות"/g,
    '"url":"https://www.calcalist.co.il/local/articles/0,7340/L-3770128,00.html?ref=ynet","tags":["interviews"],"title":"איך נראה יום מדהים בעבודה? - השאלות ששואל מנכ\\"ל קלטורה בראיונות"',
  )
}

function repair(raw) {
  let s = fixCalcalist(raw)
  let iterations = 0
  const maxIter = 5000

  while (iterations < maxIter) {
    iterations++
    const before = s

    // Pattern A: rest ends with quote, then } , { "url" (e.g. "… Book", next object)
    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([^"]+?)"\s*\}\s*,\s*\{\s*"url"\s*:/g,
      (_, prefix, rest) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}},{"url":`,
    )

    // Pattern B: rest ends with } directly (no closing quote for spill) then next object
    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([\s\S]+?)\}\s*,\s*\{\s*"url"\s*:/g,
      (_, prefix, rest) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}},{"url":`,
    )

    // Pattern C: rest ends with quote, newline, then closing brace only (no next url on same line)
    s = s.replace(
      /"title"\s*:\s*"([^"]*)",\s*([^"]+?)"\s*\r?\n(\s*\},)/g,
      (_, prefix, rest, closing) => `"title": ${JSON.stringify(mergeTitle(prefix, rest))}\n${closing}`,
    )

    if (s === before) break
  }

  if (iterations >= maxIter) {
    console.warn('warning: stopped after max iterations')
  }
  return s
}

const inputPath = process.argv[2] || path.join(process.env.HOME, 'Desktop/pocket-data.json')
const outPath = process.argv[3] || inputPath.replace(/\.json$/i, '-fixed.json')

const raw = fs.readFileSync(inputPath, 'utf8')
let repaired = repair(raw)

try {
  JSON.parse(repaired)
} catch (e1) {
  try {
    repaired = jsonrepair(repaired)
    JSON.parse(repaired)
  } catch (e2) {
    console.error('Parse failed after repair:', e1.message)
    console.error('jsonrepair fallback:', e2.message)
    fs.writeFileSync(outPath + '.partial', repaired, 'utf8')
    console.error('Wrote partial output to', outPath + '.partial')
    process.exit(1)
  }
}

fs.writeFileSync(outPath, repaired, 'utf8')
console.log('OK:', outPath, `(${Buffer.byteLength(repaired, 'utf8')} bytes)`)
