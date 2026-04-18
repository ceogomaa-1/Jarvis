'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import type { PlannerEvent } from '@/types'

const STORAGE_KEY_BRIEFING = 'jarvis.briefing.cache'
const BRIEFING_TTL_MS = 4 * 60 * 60 * 1000

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
  let tasksCount = 0
  let topTask: string | undefined
  try {
    const r = await fetch('/api/tasks', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      const tasks = (d.tasks ?? []) as Array<{ title: string; completed: boolean; priority: string }>
      const open = tasks.filter((t) => !t.completed)
      tasksCount = open.length
      for (const p of ['critical', 'high', 'normal']) {
        const found = open.find((t) => t.priority === p)
        if (found) { topTask = found.title; break }
      }
    }
  } catch {}

  let nextEvent: string | undefined
  try {
    const raw = localStorage.getItem('jarvis.planner.events')
    if (raw) {
      const events = JSON.parse(raw) as PlannerEvent[]
      const upcoming = events
        .filter((e) => new Date(e.startsAt) > new Date())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      if (upcoming[0]) nextEvent = `${upcoming[0].title} at ${format(new Date(upcoming[0].startsAt), 'h:mm a')}`
    }
  } catch {}

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
    setLoading(true); setError(false); setText('')
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

  useEffect(() => {
    const cached = loadCache()
    if (cached) { setText(cached.text); setGeneratedAt(new Date(cached.generatedAt)) }
    else { generate() }
    const interval = setInterval(() => { generate() }, BRIEFING_TTL_MS)
    return () => { clearInterval(interval); abortRef.current?.abort() }
  }, [generate])

  const now = new Date()
  const timeStr = format(now, 'HH:mm')
  const dateStr = format(now, 'EEEE, MMM d')

  return (
    <section className="briefing">
      <div className="briefing-eyebrow">
        <span className={`pulse ${loading ? 'dot-blink' : ''}`} />
        JARVIS BRIEFING
        <time>{generatedAt ? `Generated ${format(generatedAt, 'h:mm a')}` : timeStr} · {dateStr}</time>
      </div>

      <div className="briefing-body">
        {error ? (
          <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
            Briefing unavailable — check your Anthropic API key.
          </span>
        ) : loading && !text ? (
          <span style={{ color: 'var(--text-mute)', fontStyle: 'italic', fontSize: 16 }}>
            Jarvis is generating your briefing...
          </span>
        ) : (
          text
        )}
      </div>

      <div className="briefing-actions">
        <button className="ghost-btn" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.5 : 1 }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12a8 8 0 0 1 14.6-4.5L21 5"/><path d="M21 5v5h-5"/>
            <path d="M20 12a8 8 0 0 1-14.6 4.5L3 19"/><path d="M3 19v-5h5"/>
          </svg>
          {loading ? 'Thinking...' : 'Regenerate'}
        </button>
        <button className="ghost-btn">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8L12 3z"/>
          </svg>
          Ask Jarvis
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          AI · auto-refreshes 4h
        </span>
      </div>
    </section>
  )
}
