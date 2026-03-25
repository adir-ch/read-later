import React, { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface UrlInputProps {
  onSave: (url: string) => Promise<void>
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSave }) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    const url = value.trim()
    if (!url) return
    setError(null)
    setLoading(true)
    try {
      await onSave(url)
      setValue('')
      inputRef.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) void handleSave() }}
          placeholder="Paste a URL to save..."
          disabled={loading}
          autoFocus
          style={{
            flex: 1,
            height: '36px',
            padding: '0 12px',
            background: 'var(--surface2)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: '13px',
            transition: 'border-color var(--transition), box-shadow var(--transition)',
            outline: 'none',
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = `0 0 0 3px var(--accent-glow)`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <button
          onClick={() => void handleSave()}
          disabled={loading || !value.trim()}
          style={{
            height: '36px',
            padding: '0 16px',
            background: loading || !value.trim() ? 'var(--surface3)' : 'var(--accent)',
            color: loading || !value.trim() ? 'var(--text-muted)' : '#0e0e10',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'DM Mono, monospace',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
            transition: 'background var(--transition), color var(--transition), transform var(--transition)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!loading && value.trim()) e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {loading ? (
            <>
              <Loader2 size={13} style={{ animation: 'spin 700ms linear infinite' }} />
              Saving
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
      {error && (
        <p style={{
          marginTop: '6px',
          fontSize: '12px',
          color: 'var(--red)',
          fontFamily: 'DM Mono, monospace',
          animation: 'fadeIn 150ms ease',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
