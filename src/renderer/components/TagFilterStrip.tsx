import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const VISIBLE_TAG_COUNT = 6

interface TagFilterStripProps {
  tags: string[]
  active: string[]
  onToggle: (tag: string) => void
}

function TagPill({
  tag,
  isActive,
  onToggle,
}: {
  tag: string
  isActive: boolean
  onToggle: (tag: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag)}
      style={{
        flexShrink: 0,
        height: '24px',
        padding: '0 10px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        background: isActive ? 'var(--accent-glow)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: '11px',
        fontFamily: 'DM Mono, monospace',
        fontWeight: isActive ? 500 : 400,
        cursor: 'pointer',
        transition: 'all var(--transition)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--border2)'
          e.currentTarget.style.color = 'var(--text)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }
      }}
    >
      #{tag}
    </button>
  )
}

export const TagFilterStrip: React.FC<TagFilterStripProps> = ({ tags, active, onToggle }) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const visible = tags.slice(0, VISIBLE_TAG_COUNT)
  const overflow = tags.slice(VISIBLE_TAG_COUNT)
  const hasOverflow = overflow.length > 0
  const overflowHasActive = overflow.some((t) => active.includes(t))

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  if (tags.length === 0) return null

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        minHeight: '40px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {visible.map((tag) => (
          <TagPill key={tag} tag={tag} isActive={active.includes(tag)} onToggle={onToggle} />
        ))}
      </div>

      {hasOverflow && (
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label={moreOpen ? 'Hide more tags' : 'Show more tags'}
            onClick={() => setMoreOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '24px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${moreOpen || overflowHasActive ? 'var(--accent)' : 'var(--border)'}`,
              background: moreOpen ? 'var(--accent-glow)' : 'var(--surface2)',
              color: overflowHasActive ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
          >
            <ChevronDown
              size={14}
              style={{
                transform: moreOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition)',
              }}
            />
          </button>

          {moreOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                zIndex: 50,
                minWidth: '200px',
                maxWidth: 'min(320px, 85vw)',
                maxHeight: 'min(240px, 40vh)',
                overflowY: 'auto',
                padding: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignContent: 'flex-start',
              }}
            >
              {overflow.map((tag) => (
                <TagPill key={tag} tag={tag} isActive={active.includes(tag)} onToggle={onToggle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
