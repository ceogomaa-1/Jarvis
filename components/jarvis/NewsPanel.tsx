'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { NewsArticle, NewsCategory } from '@/types'

const categories: { label: string; value: NewsCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'LLMs', value: 'llms' },
  { label: 'Tools', value: 'tools' },
  { label: 'Research', value: 'research' },
]

async function fetchNews(category: NewsCategory): Promise<NewsArticle[]> {
  const res = await fetch(`/api/news?category=${category}`)
  if (!res.ok) throw new Error('Failed to load news')
  const payload = await res.json()
  return Array.isArray(payload) ? payload : (payload.articles ?? [])
}

export function NewsPanel() {
  const [category, setCategory] = useState<NewsCategory>('all')
  const { data: articles = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['news-feed', category],
    queryFn: () => fetchNews(category),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  })

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map((item) => (
          <button
            key={item.value}
            onClick={() => setCategory(item.value)}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
              border: '1px solid',
              borderColor: category === item.value ? 'var(--accent-line)' : 'var(--line-soft)',
              background: category === item.value ? 'var(--accent-soft)' : 'var(--bg-2)',
              color: category === item.value ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)',
              transition: 'all .15s ease',
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          style={{
            marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer',
            border: '1px solid var(--line-soft)', background: 'var(--bg-2)', color: 'var(--text-dim)',
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: 'inline', marginRight: 4, animation: isFetching ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/>
            <path d="M21 3v5h-5M3 21v-5h5"/>
          </svg>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-mute)' }}>Loading signals...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span>No articles found.</span>
        </div>
      ) : (
        <div className="news-list">
          {articles.slice(0, 20).map((article, i) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-row"
            >
              <span className="news-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="news-head">{article.title}</div>
                <div className="news-meta">
                  <span>{article.source}</span>
                  {article.description && <span className="truncate-1" style={{ maxWidth: 300 }}>· {article.description}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
