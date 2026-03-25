import { useState, useEffect, useRef } from 'react'
import type { Article } from '../../shared/types'
import { useTagParser } from './useTagParser'

export function useSearch(query: string, allArticles: Article[]): Article[] {
  const [results, setResults] = useState<Article[]>(allArticles)
  const { isTagQuery, expr } = useTagParser(query)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()

    if (!trimmed) {
      setResults(allArticles)
      return
    }

    timerRef.current = setTimeout(async () => {
      try {
        if (isTagQuery && expr) {
          const res = await window.api.searchTags(expr)
          setResults(res)
        } else {
          const res = await window.api.searchFts(trimmed)
          setResults(res)
        }
      } catch {
        setResults([])
      }
    }, 200)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, allArticles, isTagQuery, expr])

  return results
}
