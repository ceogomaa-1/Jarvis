'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import type { DayScore as DayScoreType } from '@/types'

interface ScoresApiResponse {
  scores: DayScoreType[]
}

async function fetchScores(): Promise<DayScoreType[]> {
  const res = await fetch('/api/day-score')
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Failed to load scores')
  const d = (await res.json()) as ScoresApiResponse
  return d.scores ?? []
}

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--success)'
  if (score >= 5) return 'var(--accent-warm)'
  return 'var(--danger)'
}

const today = new Date().toISOString().split('T')[0]

export function DayScore() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { data: scores = [] } = useQuery({
    queryKey: ['day-scores'],
    queryFn: fetchScores,
    staleTime: 5 * 60 * 1000,
  })

  const todayScore = scores.find((s) => s.date === today)
  const last7 = [...scores].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  const avg = last7.length > 0
    ? (last7.reduce((s, r) => s + r.score, 0) / last7.length).toFixed(1)
    : null

  // Pre-fill with today's score if exists
  useEffect(() => {
    if (todayScore) {
      setSelected(todayScore.score)
      setNoteInput(todayScore.note ?? '')
    }
  }, [todayScore])

  const saveScore = useMutation({
    mutationFn: async () => {
      if (!selected) return
      const res = await fetch('/api/day-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: selected, note: noteInput.trim() || null, date: today }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-scores'] })
      setOpen(false)
    },
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        open &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="workspace-button"
        style={{ gap: 5 }}
      >
        <Star size={11} />
        {todayScore ? (
          <span style={{ color: scoreColor(todayScore.score), fontWeight: 800 }}>
            {todayScore.score}/10
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Rate today</span>
        )}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className="popover fade-in-up"
          style={{ top: 'calc(100% + 8px)', right: 0, width: 268 }}
        >
          <div className="flex flex-col gap-3">
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>How was today?</div>

            {/* Score selector */}
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  className="workspace-button"
                  style={{
                    padding: '5px 8px',
                    minWidth: 34,
                    fontWeight: 800,
                    ...(selected === n ? {
                      background: scoreColor(n),
                      color: '#fff',
                      borderColor: 'transparent',
                    } : {})
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="workspace-input"
              placeholder="What defined today? (optional)"
            />

            {/* 7-day dots */}
            {last7.length > 0 ? (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Last 7 days {avg ? `• avg ${avg}` : ''}
                </div>
                <div className="flex items-center gap-1">
                  {last7.map((s) => (
                    <div
                      key={s.id}
                      title={`${s.date}: ${s.score}/10${s.note ? ` — ${s.note}` : ''}`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '999px',
                        background: scoreColor(s.score),
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => saveScore.mutate()}
              disabled={!selected || saveScore.isPending}
              className="workspace-button workspace-button--primary"
            >
              {saveScore.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
