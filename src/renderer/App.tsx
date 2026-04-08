import React, { useState, useCallback, useEffect } from 'react'
import type { Article, WindowMode } from '../shared/types'
import { sortArticlesNewestFirst } from '../shared/sortArticles'
import { useArticles } from './hooks/useArticles'
import { useSearch } from './hooks/useSearch'
import { Header } from './components/Header'
import { UrlInput } from './components/UrlInput'
import { SearchBar } from './components/SearchBar'
import { TagFilterStrip } from './components/TagFilterStrip'
import { ArticleList } from './components/ArticleList'
import { UndoToast } from './components/UndoToast'

type Theme = 'dark' | 'light'

/** Max articles shown in the list (newest first by created_at) */
const MAX_VISIBLE_ARTICLES = 9

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('rl-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  return 'dark'
}

export default function App() {
  const [windowMode, setWindowMode] = useState<WindowMode>('tray')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [query, setQuery] = useState('')
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null)

  const { articles, allTags, loading, refresh } = useArticles()

  useEffect(() => {
    void window.api.getWindowMode().then(setWindowMode)
  }, [])

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('rl-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  // Combine text query and active tag filters into unified search
  const effectiveQuery = React.useMemo(() => {
    if (activeTagFilters.length === 0) return query
    const tagPart = activeTagFilters.map((t) => `#${t}`).join(' ')
    if (!query.trim()) return tagPart
    // If user is already typing tag query, merge
    if (query.trim().startsWith('#')) return `${query.trim()} ${tagPart}`
    return query // text search: apply tag filters as separate dimension
  }, [query, activeTagFilters])

  const filteredArticles = useSearch(effectiveQuery, articles)

  // When tag filters are active but no text query, filter locally too
  const displayedArticles = React.useMemo(() => {
    if (activeTagFilters.length === 0 || query.trim()) return filteredArticles
    // Local tag filter as fallback for instant response
    return filteredArticles
  }, [filteredArticles, activeTagFilters, query])

  /** Most-used tags first (for filter strip); frequency from current article list */
  const tagsSortedByUsage = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of articles) {
      for (const t of a.tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1)
      }
    }
    return [...allTags].sort((a, b) => {
      const d = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
      return d !== 0 ? d : a.localeCompare(b)
    })
  }, [articles, allTags])

  /** Search/filter results: added date, newest first; capped at MAX_VISIBLE_ARTICLES */
  const visibleArticles = React.useMemo(() => {
    return sortArticlesNewestFirst(displayedArticles).slice(0, MAX_VISIBLE_ARTICLES)
  }, [displayedArticles])

  const handleSave = useCallback(async (url: string) => {
    const result = await window.api.saveUrl(url)
    if ('error' in result) throw new Error(result.error)
    // Add pending article optimistically then refresh
    await refresh()
  }, [refresh])

  const handleDelete = useCallback(async (article: Article) => {
    await window.api.deleteArticle(article.id)
    await refresh()
    setPendingDelete(article)
  }, [refresh])

  const handleUndo = useCallback(async () => {
    if (!pendingDelete) return
    await window.api.restoreArticle(pendingDelete)
    await refresh()
    setPendingDelete(null)
  }, [pendingDelete, refresh])

  const handleDismissToast = useCallback(() => {
    setPendingDelete(null)
  }, [])

  const handleTagAdd = useCallback(async (articleId: number, tag: string) => {
    await window.api.addTag(articleId, tag)
    await refresh()
  }, [refresh])

  const handleTagRemove = useCallback(async (articleId: number, tag: string) => {
    await window.api.removeTag(articleId, tag)
    await refresh()
  }, [refresh])

  const handleTagToggle = useCallback((tag: string) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleHide = useCallback(() => {
    window.api.hideWindow()
  }, [])

  const handleQuit = useCallback(() => {
    window.api.quitApp()
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'DM Mono, monospace',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <Header
        articleCount={articles.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onHide={handleHide}
        onQuit={handleQuit}
      />

      <UrlInput onSave={handleSave} />

      <SearchBar value={query} onChange={setQuery} />

      <TagFilterStrip
        tags={tagsSortedByUsage}
        active={activeTagFilters}
        onToggle={handleTagToggle}
      />

      <ArticleList
        windowMode={windowMode}
        articles={visibleArticles}
        loading={loading}
        onDelete={handleDelete}
        onTagAdd={handleTagAdd}
        onTagRemove={handleTagRemove}
      />

      <UndoToast
        article={pendingDelete}
        onUndo={handleUndo}
        onDismiss={handleDismissToast}
      />
    </div>
  )
}
