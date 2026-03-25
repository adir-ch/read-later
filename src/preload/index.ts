import { contextBridge, ipcRenderer } from 'electron'
import type { Article, SaveUrlResponse, TagExpr, WindowMode } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  saveUrl:        (url: string)                      => ipcRenderer.invoke('save-url', url)              as Promise<SaveUrlResponse>,
  getArticles:    ()                                 => ipcRenderer.invoke('get-articles')                as Promise<Article[]>,
  getArticle:     (id: number)                       => ipcRenderer.invoke('get-article', id)             as Promise<Article | null>,
  searchFts:      (query: string)                    => ipcRenderer.invoke('search-fts', query)           as Promise<Article[]>,
  searchTags:     (expr: TagExpr)                    => ipcRenderer.invoke('search-tags', expr)           as Promise<Article[]>,
  addTag:         (articleId: number, tag: string)   => ipcRenderer.invoke('add-tag', articleId, tag)     as Promise<{ ok: true } | { error: string }>,
  removeTag:      (articleId: number, tag: string)   => ipcRenderer.invoke('remove-tag', articleId, tag)  as Promise<{ ok: true }>,
  getAllTags:      ()                                 => ipcRenderer.invoke('get-all-tags')                as Promise<string[]>,
  deleteArticle:  (id: number)                       => ipcRenderer.invoke('delete-article', id)          as Promise<{ ok: true }>,
  restoreArticle: (article: Article)                 => ipcRenderer.invoke('restore-article', article)    as Promise<{ id: number }>,
  openUrl:        (url: string)                      => ipcRenderer.invoke('open-url', url)               as Promise<void>,
  hideWindow:     ()                                 => ipcRenderer.invoke('hide-window')                 as Promise<void>,
  quitApp:        ()                                 => ipcRenderer.invoke('quit-app')                    as Promise<void>,
  saveApiKey:     (key: string)                      => ipcRenderer.invoke('save-api-key', key)           as Promise<{ ok: true } | { error: string }>,
  getApiKeyStatus: ()                                => ipcRenderer.invoke('get-api-key-status')          as Promise<{ configured: boolean }>,
  getWindowMode:    ()                                => ipcRenderer.invoke('get-window-mode') as Promise<WindowMode>,
  onArticleUpdated: (cb: (id: number) => void)       => ipcRenderer.on('article-updated', (_, id) => cb(id as number)),
})
