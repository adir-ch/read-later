import React from 'react'

interface TagFilterStripProps {
  tags: string[]
  active: string[]
  onToggle: (tag: string) => void
}

export const TagFilterStrip: React.FC<TagFilterStripProps> = ({ tags, active, onToggle }) => {
  if (tags.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}
    >
      <style>{`.tag-strip::-webkit-scrollbar { display: none; }`}</style>
      {tags.map((tag) => {
        const isActive = active.includes(tag)
        return (
          <button
            key={tag}
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
      })}
    </div>
  )
}
