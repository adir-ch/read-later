import { useState, useEffect, useCallback } from 'react'
import type { Article } from '../../shared/types'

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [arts, tags] = await Promise.all([
        window.api.getArticles(),
        window.api.getAllTags(),
      ])
      setArticles(arts)
      setAllTags(tags)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshArticle = useCallback(async (id: number) => {
    try {
      const updated = await window.api.getArticle(id)
      if (!updated) return
      setArticles((prev) =>
        prev.some((a) => a.id === id)
          ? prev.map((a) => (a.id === id ? updated : a))
          : [updated, ...prev]
      )
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void refresh()
    window.api.onArticleUpdated((id) => {
      void refreshArticle(id)
    })
  }, [refresh, refreshArticle])

  return { articles, allTags, loading, refresh, refreshArticle }
}
