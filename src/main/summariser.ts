import Anthropic from '@anthropic-ai/sdk'
import { updateArticle } from './db'

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
})

function extractTitle(html: string): string {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html)
  return match?.[1]?.trim() ?? 'Untitled'
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

function getFaviconUrl(url: string): string {
  try {
    const { origin } = new URL(url)
    return `${origin}/favicon.ico`
  } catch {
    return ''
  }
}

function resolveImageUrl(pageUrl: string, raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()
  if (t.startsWith('data:')) return null
  try {
    const href = new URL(t, pageUrl).href
    if (!/^https?:\/\//i.test(href)) return null
    return href
  } catch {
    return null
  }
}

/** Prefer og:image / twitter:image, else first <img src> with an http(s) URL. */
function extractFirstStoryImage(html: string, pageUrl: string): string | null {
  const metaContent = (prop: string, by: 'property' | 'name'): string | null => {
    const attr = by === 'property' ? 'property' : 'name'
    const a = new RegExp(`<meta[^>]+${attr}=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html)
    const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${prop}["']`, 'i').exec(html)
    return a?.[1] ?? b?.[1] ?? null
  }

  for (const prop of ['og:image', 'og:image:url']) {
    const raw = metaContent(prop, 'property')
    const u = resolveImageUrl(pageUrl, raw ?? undefined)
    if (u) return u
  }
  for (const name of ['twitter:image', 'twitter:image:src']) {
    const raw = metaContent(name, 'name')
    const u = resolveImageUrl(pageUrl, raw ?? undefined)
    if (u) return u
  }

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(html)) !== null) {
    const u = resolveImageUrl(pageUrl, m[1])
    if (u) return u
  }
  return null
}

export async function summariseUrl(id: number, url: string, sendUpdate: (id: number) => void): Promise<void> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let html = ''
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReadLater/1.0)' },
      })
      html = await res.text()
    } finally {
      clearTimeout(timeout)
    }

    const title = extractTitle(html)
    const content = stripHtml(html)
    const favicon = getFaviconUrl(url)
    const coverImage = extractFirstStoryImage(html, url)

    let summary = 'Could not generate summary: API key not configured.'

    if (process.env['ANTHROPIC_API_KEY']) {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Summarize in 2–4 sentences. If not an article (e.g. a homepage or app), describe what the page is about.\n\nURL: ${url}\nTitle: ${title}\nContent: ${content}`,
          },
        ],
      })

      const block = message.content[0]
      summary = block?.type === 'text' ? block.text : 'Summary unavailable.'
    }

    updateArticle(id, { title, summary, favicon, cover_image: coverImage, status: 'done' })
    sendUpdate(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    updateArticle(id, {
      title: null,
      summary: `Error: ${message}`,
      favicon: null,
      cover_image: null,
      status: 'error',
    })
    sendUpdate(id)
  }
}
