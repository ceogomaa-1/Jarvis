'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Rss, RefreshCw, ExternalLink } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { NewsArticle, NewsCategory } from '@/types'

// ---------------------------------------------------------------------------
// Time-ago helper (no external dependency)
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  if (isNaN(then)) return 'unknown'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REFETCH_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

const TABS: { label: string; value: NewsCategory }[] = [
  { label: 'All AI', value: 'all' },
  { label: 'LLMs', value: 'llms' },
  { label: 'Tools', value: 'tools' },
  { label: 'Research', value: 'research' },
]

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------
async function fetchNews(category: NewsCategory): Promise<NewsArticle[]> {
  const url = `/api/news?category=${category}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch news: ${res.status}`)
  const data = await res.json()
  // API may return { articles: [...] } or a bare array
  return Array.isArray(data) ? data : (data.articles ?? [])
}

// ---------------------------------------------------------------------------
// Shimmer skeleton
// ---------------------------------------------------------------------------
function SkeletonArticle() {
  return (
    <div className="p-3 rounded border border-white/5 animate-pulse space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-16 rounded bg-white/10" />
        <div className="h-2.5 w-10 rounded bg-white/6" />
      </div>
      <div className="h-3.5 w-full rounded bg-white/10" />
      <div className="h-3.5 w-4/5 rounded bg-white/8" />
      <div className="h-2.5 w-3/4 rounded bg-white/6" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Countdown hook — ticks every second, resets when dataUpdatedAt changes
// ---------------------------------------------------------------------------
function useRefreshCountdown(dataUpdatedAt: number): string {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function calc() {
      const nextRefresh = dataUpdatedAt + REFETCH_INTERVAL_MS
      const diff = Math.max(0, nextRefresh - Date.now())
      const totalSec = Math.round(diff / 1000)
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      if (m > 0) {
        setRemaining(`${m}m ${s < 10 ? '0' : ''}${s}s`)
      } else {
        setRemaining(`${s}s`)
      }
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [dataUpdatedAt])

  return remaining
}

// ---------------------------------------------------------------------------
// Article card
// ---------------------------------------------------------------------------
function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="group p-3 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.045] hover:border-cyan-500/20 transition-all duration-200"
    >
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#00D4FF', fontFamily: 'Rajdhani, sans-serif' }}
        >
          {article.source}
        </span>
        <span className="text-[10px] text-white/30" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {timeAgo(article.publishedAt)}
        </span>
      </div>

      {/* Title */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-1.5 group/link"
      >
        <span
          className="text-[13px] font-medium leading-snug text-white/85 group-hover/link:text-cyan-400 transition-colors duration-200 line-clamp-2"
        >
          {article.title}
        </span>
        <ExternalLink
          size={10}
          className="shrink-0 mt-1 opacity-0 group-hover/link:opacity-60 transition-opacity duration-200 text-cyan-400"
        />
      </a>

      {/* Description */}
      {article.description && (
        <p className="mt-1.5 text-[11px] text-white/35 leading-relaxed line-clamp-1">
          {article.description}
        </p>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function NewsPanel() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('all')

  const {
    data: articles,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useQuery<NewsArticle[]>({
    queryKey: ['news', activeCategory],
    queryFn: () => fetchNews(activeCategory),
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: REFETCH_INTERVAL_MS,
    placeholderData: (prev) => prev,
  })

  const countdown = useRefreshCountdown(dataUpdatedAt)

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Header right slot
  const headerRight = (
    <div className="flex items-center gap-3">
      {/* LIVE indicator */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span
          className="text-[10px] font-semibold tracking-widest text-green-400 uppercase"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          LIVE
        </span>
      </div>

      {/* Countdown */}
      {dataUpdatedAt > 0 && (
        <span
          className="text-[10px] text-white/30"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          Refreshing in {countdown}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isFetching}
        className="p-1 rounded hover:bg-cyan-500/10 text-white/40 hover:text-cyan-400 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Refresh feed"
      >
        <RefreshCw
          size={12}
          className={isFetching ? 'animate-spin' : ''}
        />
      </button>
    </div>
  )

  return (
    <PanelWrapper
      title="AI INTEL FEED"
      icon={<Rss size={13} />}
      headerRight={headerRight}
      noPad
    >
      <div className="flex flex-col h-full">
        {/* Category tabs */}
        <div
          className="flex items-center gap-1 px-3 py-2 shrink-0"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
        >
          {TABS.map((tab) => {
            const isActive = activeCategory === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className="px-2.5 py-1 rounded-sm text-[11px] font-semibold tracking-wider uppercase transition-all duration-200"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  background: isActive ? 'rgba(0,212,255,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                  color: isActive ? '#00D4FF' : 'rgba(255,255,255,0.35)',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Article list */}
        <div
          className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
          style={{ maxHeight: '400px' }}
        >
          {isLoading ? (
            // Shimmer skeletons
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonArticle key={i} />
              ))}
            </div>
          ) : !articles || articles.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <span
                className="text-[12px] text-white/25 tracking-widest uppercase"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                No articles found
              </span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {articles.slice(0, 8).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
