'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Zap } from 'lucide-react'
import { format } from 'date-fns'
import type { PlannerEvent } from '@/types'

const STORAGE_KEY_BRIEFING = 'jarvis.briefing.cache'
const BRIEFING_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

interface BriefingCache {
  text: string
  generatedAt: number
}

function loadCache(): BriefingCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRIEFING)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BriefingCache
    if (Date.now() - parsed.generatedAt > BRIEFING_TTL_MS) return null
    return parsed
  } catch { return null }
}

function saveCache(text: string) {
  try {
    localStorage.setItem(STORAGE_KEY_BRIEFING, JSON.stringify({ text, generatedAt: Date.now() }))
  } catch {}
}

async function gatherContext() {
  // Tasks
  let tasksCount = 0
  let topTask: string | undefined
  try {
    const r = await fetch('/api/tasks', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const tasks = (d.tasks ?? []) as Array<{ title: string; completed: boolean; priority: string }>
      const open = tasks.filter((t) => !t.completed)
      tasksCount = open.length
      const priorities = ['critical', 'high', 'normal']
      for (const p of priorities) {
        const found = open.find((t) => t.priority === p)
        if (found) { topTask = found.title; break }
      }
    }
  } catch {}

  // Next calendar event (from localStorage)
  let nextEvent: string | undefined
  try {
    const raw = localStorage.getItem('jarvis.planner.events')
    if (raw) {
      const events = JSON.parse(raw) as PlannerEvent[]
      const upcoming = events
        .filter((e) => new Date(e.startsAt) > new Date())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      if (upcoming[0]) {
        nextEvent = `${upcoming[0].title} at ${format(new Date(upcoming[0].startsAt), 'h:mm a')}`
      }
    }
  } catch {}

  // BTC from crypto watchlist
  let btcPrice: string | undefined
  let btcChange: string | undefined
  try {
    const r = await fetch('/api/finance?type=crypto', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const coins = Array.isArray(d) ? d : (d.data ?? [])
      const btc = coins.find((c: { id: string; current_price: number; price_change_percentage_24h: number }) => c.id === 'bitcoin')
      if (btc) {
        btcPrice = btc.current_price.toLocaleString(undefined, { maximumFractionDigits: 0 })
        btcChange = btc.price_change_percentage_24h.toFixed(2)
      }
    }
  } catch {}

  // Top news headline
  let topHeadline: string | undefined
  try {
    const r = await fetch('/api/news?category=all', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const articles = Array.isArray(d) ? d : (d.articles ?? [])
      if (articles[0]) topHeadline = articles[0].title
    }
  } catch {}

  return { date: format(new Date(), 'EEEE, MMMM d yyyy'), tasksCount, topTask, nextEvent, btcPrice, btcChange, topHeadline }
}

export function BriefingPanel() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(false)
    setText('')

    try {
      const context = await gatherContext()

      const response = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) throw new Error('Failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setText(accumulated)
      }

      saveCache(accumulated)
      setGeneratedAt(new Date())
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount: load cache or generate
  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setText(cached.text)
      setGeneratedAt(new Date(cached.generatedAt))
    } else {
      generate()
    }

    // Auto-regenerate every 4 hours
    const interval = setInterval(() => {
      generate()
    }, BRIEFING_TTL_MS)

    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [generate])

  return (
    <div
      className="workspace-panel briefing-panel flex-shrink-0"
      style={{ minHeight: 110, maxHeight: 130 }}
    >
      <div className="workspace-panel__body" style={{ padding: '12px 16px', flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        {/* Left label */}
        <div className="flex flex-shrink-0 flex-col gap-1" style={{ paddingTop: 2 }}>
          <div className="flex items-center gap-2">
            <span
              style={{ width: 7, height: 7, borderRadius: '999px', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }}
              className={loading ? 'dot-blink' : 'pulse-green'}
            />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              JARVIS BRIEFING
            </span>
          </div>
          {generatedAt ? (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {format(generatedAt, 'h:mm a')}
            </span>
          ) : null}
          <button
            onClick={generate}
            disabled={loading}
            className="workspace-button"
            style={{ padding: '4px 8px', marginTop: 4, fontSize: 11 }}
            aria-label="Regenerate briefing"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Thinking...' : 'Regen'}
          </button>
        </div>

        {/* Briefing text */}
        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto" style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-soft)' }}>
          {error ? (
            <span style={{ color: 'var(--danger)', fontSize: 13 }}>
              Briefing unavailable — check your Anthropic key.
            </span>
          ) : loading && !text ? (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              <Zap size={12} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
              JARVIS is generating your briefing...
            </span>
          ) : (
            text
          )}
        </div>
      </div>
    </div>
  )
}
