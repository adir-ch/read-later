import React from 'react'
import { Sun, Moon, X, Power } from 'lucide-react'

interface HeaderProps {
  articleCount: number
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onHide: () => void
  onQuit: () => void
}

export const Header: React.FC<HeaderProps> = ({ articleCount, theme, onToggleTheme, onHide, onQuit }) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
        position: 'relative',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Spacer to push controls to the right (mirrors traffic lights width) */}
      <div style={{ width: '72px', flexShrink: 0 }} />

      {/* Logo + count — centered absolutely */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontFamily: '"Caveat", cursive',
            fontWeight: 700,
            fontSize: '28px',
            color: 'var(--accent)',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          ReadLater
        </h1>
        <span
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
            lineHeight: 1.6,
          }}
        >
          {articleCount}
        </span>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background var(--transition), color var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface2)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={onQuit}
          title="Quit app"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background var(--transition), color var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--red-dim)'
            e.currentTarget.style.color = 'var(--red)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <Power size={15} />
        </button>

        <button
          onClick={onHide}
          title="Close"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background var(--transition), color var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--red-dim)'
            e.currentTarget.style.color = 'var(--red)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  )
}
