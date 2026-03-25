import React, { useEffect } from 'react'
import type { Article } from '../../shared/types'

interface UndoToastProps {
  article: Article | null
  onUndo: () => void
  onDismiss: () => void
}

export const UndoToast: React.FC<UndoToastProps> = ({ article, onUndo, onDismiss }) => {
  useEffect(() => {
    if (!article) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [article, onDismiss])

  if (!article) return null

  const title = article.title ?? article.url
  const display = title.length > 38 ? title.slice(0, 36) + '…' : title

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 14px',
        background: 'var(--surface3)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 200ms ease',
        zIndex: 100,
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Deleted: <span style={{ color: 'var(--text)' }}>{display}</span>
      </span>
      <button
        onClick={onUndo}
        style={{
          flexShrink: 0,
          height: '26px',
          padding: '0 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent)',
          color: '#0e0e10',
          border: 'none',
          fontSize: '11px',
          fontFamily: 'DM Mono, monospace',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'opacity var(--transition)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        Undo
      </button>
    </div>
  )
}
