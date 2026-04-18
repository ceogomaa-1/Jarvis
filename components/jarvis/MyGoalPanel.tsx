'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface MyGoal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_saved: number
  created_at: string
  updated_at: string
}

async function fetchGoal(): Promise<MyGoal | null> {
  const res = await fetch('/api/my-goal')
  if (res.status === 401) return null
  if (!res.ok) return null
  const d = await res.json()
  return d.goal ?? null
}

async function putGoal(updates: Partial<Pick<MyGoal, 'title' | 'target_amount' | 'current_saved'>>): Promise<MyGoal | null> {
  const res = await fetch('/api/my-goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d.goal ?? null
}

async function deleteGoal(): Promise<void> {
  await fetch('/api/my-goal', { method: 'DELETE' })
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function MyGoalPanel() {
  const queryClient = useQueryClient()
  const { data: goal } = useQuery({ queryKey: ['my-goal'], queryFn: fetchGoal, staleTime: 30_000 })

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('')
  const targetInputRef = useRef<HTMLInputElement>(null)

  const [savingsInput, setSavingsInput] = useState('')
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalDraft, setTotalDraft] = useState('')
  const totalInputRef = useRef<HTMLInputElement>(null)
  const [optimisticSaved, setOptimisticSaved] = useState<number | null>(null)

  const displaySaved = optimisticSaved ?? goal?.current_saved ?? 0

  useEffect(() => { if (goal) setOptimisticSaved(null) }, [goal])

  const saveMutation = useMutation({
    mutationFn: putGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-goal'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-goal'] }),
  })

  const startEditTitle = () => { setTitleDraft(goal?.title ?? ''); setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0) }
  const commitTitle = () => {
    setEditingTitle(false)
    if (titleDraft !== goal?.title) saveMutation.mutate({ title: titleDraft })
  }
  const startEditTarget = () => { setTargetDraft(String(goal?.target_amount ?? 0)); setEditingTarget(true); setTimeout(() => targetInputRef.current?.focus(), 0) }
  const commitTarget = () => {
    setEditingTarget(false)
    const val = Number(targetDraft)
    if (!isNaN(val) && val !== goal?.target_amount) saveMutation.mutate({ target_amount: val })
  }
  const addSavings = () => {
    const amount = Number(savingsInput)
    if (!amount || isNaN(amount)) return
    const newSaved = displaySaved + amount
    setOptimisticSaved(newSaved); setSavingsInput('')
    saveMutation.mutate({ current_saved: newSaved })
  }
  const startEditTotal = () => { setTotalDraft(String(displaySaved)); setEditingTotal(true); setTimeout(() => totalInputRef.current?.focus(), 0) }
  const commitTotal = () => {
    setEditingTotal(false)
    const val = Number(totalDraft)
    if (!isNaN(val)) { setOptimisticSaved(val); saveMutation.mutate({ current_saved: val }) }
  }

  const target = goal?.target_amount ?? 0
  const pct = target > 0 ? Math.min(100, (displaySaved / target) * 100) : 0
  const isComplete = pct >= 100
  const r = 30
  const C = 2 * Math.PI * r
  const hasGoal = goal !== null && goal !== undefined

  return (
    <div className="goal-card">
      {/* Ring */}
      <div className="goal-ring">
        <svg viewBox="0 0 74 74">
          <circle cx="37" cy="37" r={r} className="track" fill="none" strokeWidth="5" />
          <circle cx="37" cy="37" r={r} className="val" fill="none" strokeWidth="5"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            style={{ stroke: isComplete ? 'var(--success)' : 'var(--accent)' }} />
        </svg>
        <span className="pct">{Math.round(pct)}%</span>
      </div>

      {/* Meta */}
      <div className="goal-meta" style={{ flex: 1 }}>
        <span className="goal-label">{isComplete ? '🎯 GOAL REACHED' : 'SAVING FOR'}</span>

        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') commitTitle() }}
            className="goal-input"
            placeholder="Goal title..."
            style={{ marginBottom: 4 }}
          />
        ) : (
          <span
            className="goal-title"
            onClick={startEditTitle}
            style={{ cursor: 'text', color: hasGoal && goal.title ? 'var(--text)' : 'var(--text-faint)', fontStyle: hasGoal && goal.title ? 'normal' : 'italic' }}
          >
            {hasGoal && goal.title ? goal.title : 'Click to set goal…'}
          </span>
        )}

        <div className="goal-amounts">
          <b>${fmt(displaySaved)}</b>
          {' '}of{' '}
          {editingTarget ? (
            <input ref={targetInputRef} value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={commitTarget} onKeyDown={(e) => { if (e.key === 'Enter') commitTarget() }}
              type="number" min={0} style={{ width: 70, fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--accent-line)', borderRadius: 4, padding: '1px 6px', color: 'var(--text)', outline: 'none' }} />
          ) : (
            <span onClick={startEditTarget} style={{ cursor: 'text', textDecoration: 'underline dotted' }}>
              ${fmt(target)}
            </span>
          )}
        </div>

        {/* Log savings */}
        <div className="goal-actions">
          {editingTotal ? (
            <input ref={totalInputRef} value={totalDraft} onChange={(e) => setTotalDraft(e.target.value)}
              onBlur={commitTotal} onKeyDown={(e) => { if (e.key === 'Enter') commitTotal() }}
              type="number" min={0} className="goal-input" placeholder="0" />
          ) : (
            <input
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSavings() }}
              type="number" min={0}
              className="goal-input"
              placeholder="+$0.00"
            />
          )}
          <button className="goal-save-btn" onClick={editingTotal ? commitTotal : addSavings}>
            {editingTotal ? '✓' : '+'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="goal-edit-link" onClick={editingTotal ? () => setEditingTotal(false) : startEditTotal}>
            {editingTotal ? 'Cancel' : 'Edit total'}
          </button>
          {hasGoal && (
            <button className="goal-edit-link" style={{ color: 'var(--danger)' }} onClick={() => deleteMutation.mutate()}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
