// Mock window.api for browser preview (not used in Electron)
import type { Article } from '../shared/types'

const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    url: 'https://github.com/anthropics/anthropic-sdk-python',
    title: 'Anthropic Python SDK',
    summary: 'The official Python library for the Anthropic API. Provides convenient access to the Anthropic REST API, with first-class TypeScript support and automatic pagination.',
    favicon: 'https://github.com/favicon.ico',
    cover_image: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'done',
    tags: ['python', 'ai', 'sdk'],
  },
  {
    id: 2,
    url: 'https://react.dev/reference/react/memo',
    title: 'memo – React',
    summary: 'React.memo lets you skip re-rendering a component when its props are unchanged. Wrap a component in memo to get a memoized version that skips re-rendering.',
    favicon: 'https://react.dev/favicon.ico',
    cover_image: 'https://react.dev/images/og-reference.png',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    status: 'done',
    tags: ['react', 'performance'],
  },
  {
    id: 3,
    url: 'https://www.sqlite.org/fts5.html',
    title: 'FTS5 Full-Text Search Extension',
    summary: 'FTS5 is an SQLite virtual table module that provides full-text search functionality to database applications.',
    favicon: '',
    cover_image: null,
    created_at: new Date().toISOString(),
    status: 'pending',
    tags: ['sqlite', 'search'],
  },
]

let articles = [...MOCK_ARTICLES]
let nextId = 4

if (typeof window !== 'undefined' && !window.api) {
  // @ts-ignore
  window.api = {
    saveUrl: async (url: string) => {
      const exists = articles.some(a => a.url === url)
      if (exists) return { error: 'URL already saved' }
      const a: Article = { id: nextId++, url, title: null, summary: null, favicon: null, cover_image: null, created_at: new Date().toISOString(), status: 'pending', tags: [] }
      articles = [a, ...articles]
      setTimeout(() => {
        articles = articles.map(x => x.id === a.id ? { ...x, title: 'Example Article', summary: 'This is a mock summary generated for preview purposes.', status: 'done' } : x)
        window.dispatchEvent(new CustomEvent('__article_updated', { detail: a.id }))
      }, 2000)
      return { id: a.id, status: 'pending' }
    },
    getArticles: async () => [...articles],
    getArticle: async (id: number) => articles.find(a => a.id === id) ?? null,
    searchFts: async (q: string) => articles.filter(a => (a.title ?? '').toLowerCase().includes(q.toLowerCase()) || (a.summary ?? '').toLowerCase().includes(q.toLowerCase())),
    searchTags: async () => [],
    addTag: async (id: number, tag: string) => { articles = articles.map(a => a.id === id ? { ...a, tags: [...a.tags, tag] } : a); return { ok: true } },
    removeTag: async (id: number, tag: string) => { articles = articles.map(a => a.id === id ? { ...a, tags: a.tags.filter(t => t !== tag) } : a); return { ok: true } },
    getAllTags: async () => [...new Set(articles.flatMap(a => a.tags))],
    deleteArticle: async (id: number) => { articles = articles.filter(a => a.id !== id); return { ok: true } },
    restoreArticle: async (article: Article) => { articles = [article, ...articles]; return { id: article.id } },
    openUrl: async (url: string) => { window.open(url, '_blank') },
    hideWindow: async () => {},
    saveApiKey: async () => ({ ok: true }),
    getApiKeyStatus: async () => ({ configured: false }),
    getWindowMode: async () => 'tray' as const,
    onArticleUpdated: (cb: (id: number) => void) => {
      window.addEventListener('__article_updated', (e) => cb((e as CustomEvent<number>).detail))
    },
  }
}
