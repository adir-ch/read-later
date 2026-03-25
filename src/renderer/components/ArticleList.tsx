import React from 'react'
import type { Article, WindowMode } from '../../shared/types'
import { ArticleCard } from './ArticleCard'
import { BookOpen } from 'lucide-react'

interface ArticleListProps {
  windowMode: WindowMode
  articles: Article[]
  loading: boolean
  onDelete: (article: Article) => void
  onTagAdd: (articleId: number, tag: string) => void
  onTagRemove: (articleId: number, tag: string) => void
}

function SkeletonRow() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 'var(--radius-sm)',
  }

  return (
    <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ ...shimmer, width: '14px', height: '14px', borderRadius: '50%' }} />
        <div style={{ ...shimmer, width: '120px', height: '10px' }} />
      </div>
      <div style={{ ...shimmer, width: '85%', height: '13px', marginBottom: '8px' }} />
      <div style={{ ...shimmer, width: '100%', height: '11px', marginBottom: '4px' }} />
      <div style={{ ...shimmer, width: '70%', height: '11px', marginBottom: '10px' }} />
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ ...shimmer, width: '50px', height: '20px', borderRadius: 'var(--radius-full)' }} />
        <div style={{ ...shimmer, width: '40px', height: '20px', borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>
  )
}

function SkeletonGridCard() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 'var(--radius-sm)',
  }

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: '140px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ ...shimmer, width: '18px', height: '18px', borderRadius: '4px' }} />
        <div style={{ ...shimmer, width: '100px', height: '10px', flex: 1 }} />
      </div>
      <div style={{ ...shimmer, width: '85%', height: '14px', marginBottom: '10px' }} />
      <div style={{ ...shimmer, width: '100%', height: '11px', marginBottom: '6px' }} />
      <div style={{ ...shimmer, width: '75%', height: '11px', marginBottom: '14px' }} />
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ ...shimmer, width: '48px', height: '20px', borderRadius: 'var(--radius-full)' }} />
        <div style={{ ...shimmer, width: '40px', height: '20px', borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>
  )
}

export const ArticleList: React.FC<ArticleListProps> = ({
  windowMode,
  articles,
  loading,
  onDelete,
  onTagAdd,
  onTagRemove,
}) => {
  const layout = windowMode === 'desktop' ? 'desktop' : 'tray'

  if (loading) {
    if (layout === 'desktop') {
      return (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
            alignContent: 'start',
          }}
        >
          <SkeletonGridCard />
          <SkeletonGridCard />
          <SkeletonGridCard />
          <SkeletonGridCard />
          <SkeletonGridCard />
          <SkeletonGridCard />
        </div>
      )
    }
    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        gap: '12px',
        animation: 'fadeIn 300ms ease',
      }}>
        <BookOpen size={36} style={{ color: 'var(--text-subtle)', opacity: 0.6 }} />
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>
          No articles saved yet
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)', textAlign: 'center', lineHeight: 1.6, maxWidth: '240px' }}>
          Paste a URL above and press Enter to save your first article.
        </p>
      </div>
    )
  }

  if (layout === 'desktop') {
    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '14px',
          alignContent: 'start',
        }}
      >
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            layout="desktop"
            article={article}
            onDelete={onDelete}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          layout="tray"
          article={article}
          onDelete={onDelete}
          onTagAdd={onTagAdd}
          onTagRemove={onTagRemove}
        />
      ))}
    </div>
  )
}
