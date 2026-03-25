import { app, BrowserWindow, ipcMain, Tray, shell, nativeImage, safeStorage, screen } from 'electron'
import path from 'path'
import {
  initDb,
  getAllArticles,
  getArticleById,
  insertArticle,
  deleteArticle,
  restoreArticle,
  searchFts,
  searchByTags,
  getAllTags,
  addTagToArticle,
  removeTagFromArticle,
  urlExists,
} from './db'
import { summariseUrl } from './summariser'
import type { TagExpr, WindowMode } from '../shared/types'

let tray: Tray | null = null
let win: BrowserWindow | null = null
let desktopWin: BrowserWindow | null = null

const isDev = !app.isPackaged

function getIconPath(name: string): string {
  if (isDev) {
    return path.join(__dirname, '../../assets', name)
  }
  return path.join(process.resourcesPath, 'assets', name)
}

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: 420,
    height: 640,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0e0e10',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  w.setContentProtection(false)

  if (isDev) {
    w.loadURL('http://localhost:5173')
  } else {
    w.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  w.on('blur', () => {
    if (!w.webContents.isDevToolsOpened()) {
      w.hide()
    }
  })

  return w
}

function positionWindow(w: BrowserWindow): void {
  if (!tray) return
  const { x, y, width, height } = tray.getBounds()
  const size = w.getSize()
  const winW = size[0] ?? 420
  const winH = size[1] ?? 640
  const { workArea } = screen.getDisplayMatching(tray.getBounds())

  let winX = Math.round(x + width / 2 - winW / 2)
  let winY = y > workArea.y + workArea.height / 2 ? y - winH - 4 : y + height + 4

  winX = Math.max(workArea.x, Math.min(winX, workArea.x + workArea.width - winW))
  w.setPosition(winX, winY)
}

function createDesktopWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 620,
    minHeight: 500,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 17 },
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    backgroundColor: '#0e0e10',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (isDev) {
    w.loadURL('http://localhost:5173')
  } else {
    w.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  w.once('ready-to-show', () => {
    app.dock?.show()
    w.show()
    w.focus()
  })

  w.on('closed', () => {
    desktopWin = null
    app.dock?.hide()
  })

  // Cmd+W closes the desktop window
  w.webContents.on('before-input-event', (_event, input) => {
    if (input.meta && input.key === 'w') {
      w.close()
    }
  })

  return w
}

function sendArticleUpdated(id: number): void {
  win?.webContents.send('article-updated', id)
  desktopWin?.webContents.send('article-updated', id)
}

app.whenReady().then(() => {
  // Load API key from keychain if available
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const fs = require('fs') as typeof import('fs')
      const keyPath = path.join(app.getPath('userData'), '.apikey')
      if (fs.existsSync(keyPath)) {
        const encrypted = fs.readFileSync(keyPath)
        const decrypted = safeStorage.decryptString(encrypted)
        if (decrypted && !process.env['ANTHROPIC_API_KEY']) {
          process.env['ANTHROPIC_API_KEY'] = decrypted
        }
      }
    } catch {
      // silently ignore
    }
  }

  initDb()

  app.dock?.hide()

  // Try to load tray icon, fallback to empty image
  let trayIcon: Electron.NativeImage
  try {
    trayIcon = nativeImage.createFromPath(getIconPath('trayIconTemplate.png'))
    if (trayIcon.isEmpty()) throw new Error('empty')
    // Non-template: solid white "R" on transparent (template would force system tint)
    trayIcon.setTemplateImage(false)
  } catch {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('ReadLater')

  win = createWindow()

  tray.on('click', () => {
    if (!win) return
    if (win.isVisible()) {
      win.hide()
    } else {
      positionWindow(win)
      win.show()
      win.focus()
    }
  })

  tray.on('double-click', () => {
    if (desktopWin && !desktopWin.isDestroyed()) {
      if (desktopWin.isMinimized()) desktopWin.restore()
      desktopWin.show()
      desktopWin.focus()
    } else {
      desktopWin = createDesktopWindow()
    }
  })

  // IPC Handlers
  ipcMain.handle('save-url', async (_e, url: string) => {
    try {
      new URL(url)
    } catch {
      return { error: 'Invalid URL' }
    }

    if (!/^https?:\/\//i.test(url)) {
      return { error: 'URL must start with http:// or https://' }
    }

    if (urlExists(url)) {
      return { error: 'URL already saved' }
    }

    const id = insertArticle(url)
    // Background fetch — non-blocking
    summariseUrl(id, url, sendArticleUpdated).catch(() => {})
    return { id, status: 'pending' }
  })

  ipcMain.handle('get-articles', () => getAllArticles())

  ipcMain.handle('get-article', (_e, id: number) => getArticleById(id))

  ipcMain.handle('search-fts', (_e, query: string) => {
    try {
      return searchFts(query)
    } catch {
      return []
    }
  })

  ipcMain.handle('search-tags', (_e, expr: TagExpr) => searchByTags(expr))

  ipcMain.handle('add-tag', (_e, articleId: number, tag: string) => {
    try {
      addTagToArticle(articleId, tag)
      return { ok: true }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unknown error' }
    }
  })

  ipcMain.handle('remove-tag', (_e, articleId: number, tag: string) => {
    removeTagFromArticle(articleId, tag)
    return { ok: true }
  })

  ipcMain.handle('get-all-tags', () => getAllTags())

  ipcMain.handle('delete-article', (_e, id: number) => {
    deleteArticle(id)
    return { ok: true }
  })

  ipcMain.handle('restore-article', (_e, article) => {
    const id = restoreArticle(article)
    return { id }
  })

  ipcMain.handle('open-url', (_e, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('hide-window', () => {
    win?.hide()
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  ipcMain.handle('save-api-key', (_e, key: string) => {
    if (!safeStorage.isEncryptionAvailable()) return { error: 'Encryption not available' }
    try {
      const fs = require('fs') as typeof import('fs')
      const encrypted = safeStorage.encryptString(key)
      const keyPath = path.join(app.getPath('userData'), '.apikey')
      fs.writeFileSync(keyPath, encrypted)
      process.env['ANTHROPIC_API_KEY'] = key
      return { ok: true }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Failed to save key' }
    }
  })

  ipcMain.handle('get-api-key-status', () => {
    return { configured: Boolean(process.env['ANTHROPIC_API_KEY']) }
  })

  ipcMain.handle('get-window-mode', (e): WindowMode => {
    const bw = BrowserWindow.fromWebContents(e.sender)
    if (bw && desktopWin && !desktopWin.isDestroyed() && bw.id === desktopWin.id) {
      return 'desktop'
    }
    return 'tray'
  })
})

app.on('window-all-closed', () => {
  // Keep running as tray app — do not quit
})
