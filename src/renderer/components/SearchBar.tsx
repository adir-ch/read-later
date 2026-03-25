import React from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  const isTagQuery = value.trimStart().startsWith('#')

  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0 10px',
          transition: 'border-color var(--transition), box-shadow var(--transition)',
        }}
        onFocusCapture={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent)'
          el.style.boxShadow = '0 0 0 3px var(--accent-glow)'
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border)'
          el.style.boxShadow = 'none'
        }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search or #tag..."
          style={{
            flex: 1,
            height: '34px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface3)',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background var(--transition)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface3)' }}
          >
            <X size={10} />
          </button>
        )}
      </div>
      {isTagQuery && (
        <p style={{
          marginTop: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'DM Mono, monospace',
          animation: 'fadeIn 150ms ease',
        }}>
          Tag mode — try: <span style={{ color: 'var(--accent)' }}>#react #ts</span> · <span style={{ color: 'var(--accent)' }}>#react | #vue</span> · <span style={{ color: 'var(--accent)' }}>#react -#class</span>
        </p>
      )}
    </div>
  )
}
