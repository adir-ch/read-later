import type { Article } from './types'

/** Added date descending (newest first); tie-break by id so order is stable. */
export function sortArticlesNewestFirst(articles: readonly Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    if (tb !== ta) return tb - ta
    return b.id - a.id
  })
}
