'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Newspaper, RefreshCw } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
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
    <PanelWrapper
      title="News"
      icon={<Newspaper size={16} />}
      className="h-full"
      headerRight={
        <button onClick={() => refetch()} className="workspace-button" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => {
            const selected = category === item.value

            return (
              <button
                key={item.value}
                onClick={() => setCategory(item.value)}
                className={selected ? 'workspace-button workspace-button--soft' : 'workspace-button'}
                style={{ padding: '8px 12px' }}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="workspace-empty">
              <span>Loading the latest news...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="workspace-empty">
              <Newspaper size={20} />
              <span>No articles found.</span>
            </div>
          ) : (
            <div className="workspace-list">
              {articles.slice(0, 20).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="workspace-card block p-5 transition-transform hover:-translate-y-0.5"
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>
                    {article.source}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, lineHeight: 1.35 }}>
                    {article.title}
                  </div>
                  {article.description ? (
                    <div className="truncate-2" style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)' }}>
                      {article.description}
                    </div>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
