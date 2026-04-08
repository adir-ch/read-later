import React, { useState, useCallback, useEffect } from 'react'
import { Globe, ExternalLink, Trash2, AlertCircle } from 'lucide-react'
import type { Article } from '../../shared/types'
import { TagPills } from './TagPills'

export type ArticleCardLayout = 'tray' | 'desktop'

interface ArticleCardProps {
  layout: ArticleCardLayout
  article: Article
  onDelete: (article: Article) => void
  onTagAdd: (articleId: number, tag: string) => void
  onTagRemove: (articleId: number, tag: string) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export const ArticleCard: React.FC<ArticleCardProps> = React.memo(({ layout, article, onDelete, onTagAdd, onTagRemove }) => {
  const [expanded, setExpanded] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  const [coverError, setCoverError] = useState(false)
  const [deleteHover, setDeleteHover] = useState(false)
  const [cardHover, setCardHover] = useState(false)

  useEffect(() => {
    setCoverError(false)
  }, [article.id, article.cover_image])

  const handleTagAdd = useCallback((tag: string) => onTagAdd(article.id, tag), [article.id, onTagAdd])
  const handleTagRemove = useCallback((tag: string) => onTagRemove(article.id, tag), [article.id, onTagRemove])

  const isPending = article.status === 'pending'
  const isError = article.status === 'error'
  const isDesktop = layout === 'desktop'
  const showCover = isDesktop && Boolean(article.cover_image) && !coverError

  const shellStyle: React.CSSProperties = isDesktop
    ? {
        padding: showCover ? 0 : '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: cardHover ? 'var(--card-hover)' : 'var(--shadow-sm)',
        animation: 'slideIn 200ms ease',
        position: 'relative',
        transition: 'box-shadow var(--transition)',
        overflow: 'hidden',
        minWidth: 0,
        minHeight: showCover ? undefined : '168px',
      }
    : {
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        animation: 'slideIn 200ms ease',
        position: 'relative',
        minHeight: '128px',
      }

  const faviconSize = isDesktop ? 18 : 16
  const globeSize = isDesktop ? 15 : 13
  const titleSize = isDesktop ? '15px' : '13px'
  const titleLineHeight = isDesktop ? 1.5 : 1.4
  const linkIconSize = isDesktop ? 13 : 11

  const innerPadding = showCover ? { padding: '12px 16px 16px' } : undefined

  const body = (
    <>
      {/* Top row: favicon + domain + date + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
        <div style={{ width: `${faviconSize}px`, height: `${faviconSize}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {article.favicon && !faviconError ? (
            <img
              src={article.favicon}
              width={faviconSize}
              height={faviconSize}
              onError={() => setFaviconError(true)}
              style={{ borderRadius: '2px' }}
              alt=""
            />
          ) : (
            <Globe size={globeSize} style={{ color: 'var(--text-subtle)' }} />
          )}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {getDomain(article.url)} · {formatDate(article.created_at)}
        </span>
        <button
          onClick={() => onDelete(article)}
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          title="Delete"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: 'var(--radius-sm)',
            background: deleteHover ? 'var(--red-dim)' : 'transparent',
            border: 'none',
            color: deleteHover ? 'var(--red)' : 'var(--text-subtle)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            flexShrink: 0,
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '8px' }}>
        {article.title ? (
          <button
            onClick={() => window.api.openUrl(article.url)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '5px',
              width: '100%',
            }}
          >
            <span style={{
              fontSize: titleSize,
              fontWeight: 500,
              color: 'var(--text)',
              lineHeight: titleLineHeight,
              transition: 'color var(--transition)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            >
              {article.title}
            </span>
            <ExternalLink size={linkIconSize} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: '2px' }} />
          </button>
        ) : (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.api.openUrl(article.url) }}
            style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', textDecoration: 'none', wordBreak: 'break-all' }}
          >
            {article.url.length > 50 ? article.url.slice(0, 48) + '…' : article.url}
          </a>
        )}
      </div>

      {/* Summary / status */}
      {isPending && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 700ms linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
            Fetching summary…
          </span>
        </div>
      )}

      {isError && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '10px', padding: '8px 10px', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)' }}>
          <AlertCircle size={13} style={{ color: 'var(--red)', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '12px', color: 'var(--red)', fontFamily: 'DM Mono, monospace', lineHeight: 1.4 }}>
            {article.summary ?? 'Failed to fetch summary'}
          </span>
        </div>
      )}

      {!isPending && !isError && article.summary && (
        <p
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: isDesktop ? '13px' : '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            marginBottom: '10px',
            cursor: 'pointer',
            overflow: expanded ? 'visible' : 'hidden',
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : isDesktop ? 3 : 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}
          title={expanded ? 'Click to collapse' : 'Click to expand'}
        >
          {article.summary}
        </p>
      )}

      {/* Tags */}
      <TagPills
        articleId={article.id}
        tags={article.tags}
        onAdd={handleTagAdd}
        onRemove={handleTagRemove}
      />
    </>
  )

  return (
    <article
      style={shellStyle}
      onMouseEnter={isDesktop ? () => setCardHover(true) : undefined}
      onMouseLeave={isDesktop ? () => setCardHover(false) : undefined}
    >
      {showCover && article.cover_image ? (
        <button
          type="button"
          onClick={() => window.api.openUrl(article.url)}
          aria-label="Open article in browser"
          title="Open link"
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            lineHeight: 0,
          }}
        >
          <img
            src={article.cover_image}
            alt=""
            onError={() => setCoverError(true)}
            style={{
              width: '100%',
              height: 'clamp(152px, min(24vh, 26vw), 228px)',
              minHeight: '152px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </button>
      ) : null}
      {showCover ? (
        <div style={innerPadding}>{body}</div>
      ) : (
        body
      )}
    </article>
  )
})

ArticleCard.displayName = 'ArticleCard'
