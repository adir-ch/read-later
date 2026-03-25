#!/usr/bin/env node
/**
 * CLI: repair malformed Pocket JSON and write a valid JSON file.
 * Core logic lives in pocket-json-repair.mjs (shared with import-pocket.mjs).
 */
import fs from 'fs'
import path from 'path'
import { repairPocketJson, parsePocketExport } from './pocket-json-repair.mjs'

const inputPath = process.argv[2] || path.join(process.env.HOME, 'Desktop/pocket-data.json')
const outPath = process.argv[3] || inputPath.replace(/\.json$/i, '-fixed.json')

const raw = fs.readFileSync(inputPath, 'utf8')
const repaired = repairPocketJson(raw)

const parsed = parsePocketExport(repaired)
if (!parsed.ok) {
  console.error('Parse failed after repair:', parsed.parseError?.message ?? parsed.error?.message)
  console.error('jsonrepair fallback:', parsed.error?.message)
  fs.writeFileSync(outPath + '.partial', repaired, 'utf8')
  console.error('Wrote partial output to', outPath + '.partial')
  process.exit(1)
}

fs.writeFileSync(outPath, JSON.stringify(parsed.data, null, 2), 'utf8')
console.log('OK:', outPath, `(${Buffer.byteLength(fs.readFileSync(outPath), 'utf8')} bytes)`)
