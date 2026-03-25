import type { Article, SaveUrlResponse, TagExpr, WindowMode } from '../shared/types'

interface WindowApi {
  saveUrl:         (url: string)                    => Promise<SaveUrlResponse>
  getArticles:     ()                               => Promise<Article[]>
  getArticle:      (id: number)                     => Promise<Article | null>
  searchFts:       (query: string)                  => Promise<Article[]>
  searchTags:      (expr: TagExpr)                  => Promise<Article[]>
  addTag:          (articleId: number, tag: string) => Promise<{ ok: true } | { error: string }>
  removeTag:       (articleId: number, tag: string) => Promise<{ ok: true }>
  getAllTags:       ()                               => Promise<string[]>
  deleteArticle:   (id: number)                     => Promise<{ ok: true }>
  restoreArticle:  (article: Article)               => Promise<{ id: number }>
  openUrl:         (url: string)                    => Promise<void>
  hideWindow:      ()                               => Promise<void>
  quitApp:         ()                               => Promise<void>
  saveApiKey:      (key: string)                    => Promise<{ ok: true } | { error: string }>
  getApiKeyStatus: ()                               => Promise<{ configured: boolean }>
  getWindowMode:   ()                               => Promise<WindowMode>
  onArticleUpdated: (cb: (id: number) => void)      => void
}

declare global {
  interface Window {
    api: WindowApi
  }
}

export {}
