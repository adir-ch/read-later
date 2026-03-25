import { useMemo } from 'react'
import type { TagExpr } from '../../shared/types'

/**
 * Parses tag search strings like "#react -#jquery | #vue" into a TagExpr AST.
 * Grammar (simplified, left-to-right):
 *   expr   := term (('|') term)*
 *   term   := factor factor*                  (space = AND)
 *   factor := '-' '#' tag | '#' tag | '(' expr ')'
 */
function parseTagExpr(input: string): TagExpr | null {
  // Tokenise: split on spaces/pipes but preserve structure
  const tokens = input
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .replace(/\|/g, ' | ')
    .split(/\s+/)
    .filter(Boolean)

  let pos = 0

  function peek(): string | undefined { return tokens[pos] }
  function consume(): string { return tokens[pos++] ?? '' }

  function parseExpr(): TagExpr | null {
    let left = parseTerm()
    while (peek() === '|') {
      consume() // '|'
      const right = parseTerm()
      if (!left || !right) return left ?? right
      left = { type: 'or', left, right }
    }
    return left
  }

  function parseTerm(): TagExpr | null {
    let left = parseFactor()
    while (peek() && peek() !== '|' && peek() !== ')') {
      const right = parseFactor()
      if (!right) break
      if (!left) { left = right; continue }
      left = { type: 'and', left, right }
    }
    return left
  }

  function parseFactor(): TagExpr | null {
    const tok = peek()
    if (!tok) return null

    if (tok === '(') {
      consume()
      const inner = parseExpr()
      if (peek() === ')') consume()
      return inner
    }

    if (tok.startsWith('-#')) {
      consume()
      const tag = tok.slice(2).toLowerCase().replace(/[^a-z0-9-]/g, '-')
      if (!tag) return null
      return { type: 'not', operand: { type: 'tag', value: tag } }
    }

    if (tok.startsWith('#')) {
      consume()
      const tag = tok.slice(1).toLowerCase().replace(/[^a-z0-9-]/g, '-')
      if (!tag) return null
      return { type: 'tag', value: tag }
    }

    consume() // skip unknown token
    return null
  }

  return parseExpr()
}

export function useTagParser(query: string): { isTagQuery: boolean; expr: TagExpr | null } {
  return useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed.startsWith('#')) return { isTagQuery: false, expr: null }
    const expr = parseTagExpr(trimmed)
    return { isTagQuery: true, expr }
  }, [query])
}
