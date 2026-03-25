import React, { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'

interface TagPillsProps {
  articleId: number
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

export const TagPills: React.FC<TagPillsProps> = ({ tags, onAdd, onRemove }) => {
  const [adding, setAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startAdding = () => {
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitTag = () => {
    const tag = inputValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (tag && !tags.includes(tag)) {
      onAdd(tag)
    }
    setInputValue('')
    setAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTag()
    } else if (e.key === 'Escape') {
      setInputValue('')
      setAdding(false)
    }
  }

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '20px',
    padding: '0 7px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontFamily: 'DM Mono, monospace',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
      {tags.map((tag) => (
        <span key={tag} style={pillStyle}>
          #{tag}
          <button
            onClick={() => onRemove(tag)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: 0,
              transition: 'color var(--transition)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-subtle)' }}
          >
            <X size={9} />
          </button>
        </span>
      ))}

      {adding ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
          placeholder="tag..."
          style={{
            height: '20px',
            width: '72px',
            padding: '0 7px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--surface2)',
            border: '1px solid var(--accent)',
            color: 'var(--text)',
            fontSize: '11px',
            fontFamily: 'DM Mono, monospace',
            outline: 'none',
            boxShadow: '0 0 0 2px var(--accent-glow)',
          }}
        />
      ) : (
        <button
          onClick={startAdding}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            height: '20px',
            padding: '0 7px',
            borderRadius: 'var(--radius-full)',
            background: 'transparent',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontFamily: 'DM Mono, monospace',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <Plus size={10} />
          tag
        </button>
      )}
    </div>
  )
}
