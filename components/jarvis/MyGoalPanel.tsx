'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Target, Trash2 } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyGoal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_saved: number
  created_at: string
  updated_at: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function MyGoalPanel() {
  const queryClient = useQueryClient()
  const { data: goal } = useQuery({ queryKey: ['my-goal'], queryFn: fetchGoal, staleTime: 30_000 })

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Target amount editing
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('')
  const targetInputRef = useRef<HTMLInputElement>(null)

  // Log savings input
  const [savingsInput, setSavingsInput] = useState('')

  // Edit total (manual correction)
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalDraft, setTotalDraft] = useState('')
  const totalInputRef = useRef<HTMLInputElement>(null)

  // Optimistic current_saved for instant feedback
  const [optimisticSaved, setOptimisticSaved] = useState<number | null>(null)
  const displaySaved = optimisticSaved ?? goal?.current_saved ?? 0

  useEffect(() => {
    if (goal) setOptimisticSaved(null) // sync from server after refetch
  }, [goal])

  const saveMutation = useMutation({
    mutationFn: putGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-goal'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-goal'] }),
  })

  // ── Title handlers ──────────────────────────────────────────────────────────

  const startEditTitle = () => {
    setTitleDraft(goal?.title ?? '')
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const commitTitle = () => {
    setEditingTitle(false)
    if (titleDraft !== goal?.title) {
      saveMutation.mutate({ title: titleDraft })
    }
  }

  // ── Target handlers ─────────────────────────────────────────────────────────

  const startEditTarget = () => {
    setTargetDraft(String(goal?.target_amount ?? 0))
    setEditingTarget(true)
    setTimeout(() => targetInputRef.current?.focus(), 0)
  }

  const commitTarget = () => {
    setEditingTarget(false)
    const val = Number(targetDraft)
    if (!isNaN(val) && val !== goal?.target_amount) {
      saveMutation.mutate({ target_amount: val })
    }
  }

  // ── Add savings handler ─────────────────────────────────────────────────────

  const addSavings = () => {
    const amount = Number(savingsInput)
    if (!amount || isNaN(amount)) return
    const newSaved = displaySaved + amount
    setOptimisticSaved(newSaved)
    setSavingsInput('')
    saveMutation.mutate({ current_saved: newSaved })
  }

  // ── Edit total handler ──────────────────────────────────────────────────────

  const startEditTotal = () => {
    setTotalDraft(String(displaySaved))
    setEditingTotal(true)
    setTimeout(() => totalInputRef.current?.focus(), 0)
  }

  const commitTotal = () => {
    setEditingTotal(false)
    const val = Number(totalDraft)
    if (!isNaN(val)) {
      setOptimisticSaved(val)
      saveMutation.mutate({ current_saved: val })
    }
  }

  // ── Progress values ─────────────────────────────────────────────────────────

  const target = goal?.target_amount ?? 0
  const pct = target > 0 ? Math.min(100, (displaySaved / target) * 100) : 0
  const isComplete = pct >= 100
  const accentColor = isComplete ? 'var(--success)' : 'var(--accent)'

  const hasGoal = goal !== null && goal !== undefined

  return (
    <PanelWrapper
      title="MY GOAL"
      icon={<Target size={14} />}
      className="flex-shrink-0"
    >
      <div className="my-goal-body">
        {/* ── LEFT: Goal Info (~30%) ────────────────────────────────────────── */}
        <div
          className="workspace-card my-goal-left"
          style={{
            width: '30%',
            flexShrink: 0,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
          }}
        >
          {/* Title */}
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTitle() }}
              className="workspace-input"
              placeholder="Goal title..."
              style={{ fontSize: 13, fontWeight: 700, padding: '4px 8px' }}
            />
          ) : (
            <div
              onClick={startEditTitle}
              style={{
                fontSize: 13,
                fontWeight: 700,
                cursor: 'text',
                color: hasGoal && goal.title ? 'var(--text)' : 'var(--text-muted)',
                fontStyle: hasGoal && goal.title ? 'normal' : 'italic',
                lineHeight: 1.3,
              }}
            >
              {hasGoal && goal.title ? goal.title : 'Click to set your goal...'}
            </div>
          )}

          {/* Target amount */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target:</span>
            {editingTarget ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>$</span>
                <input
                  ref={targetInputRef}
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onBlur={commitTarget}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitTarget() }}
                  type="number"
                  min={0}
                  className="workspace-input"
                  style={{ width: 80, fontSize: 11, padding: '2px 6px' }}
                />
              </div>
            ) : (
              <span
                onClick={startEditTarget}
                style={{ fontSize: 11, color: 'var(--text-soft)', cursor: 'text', fontWeight: 600 }}
              >
                ${fmt(target)}
              </span>
            )}
          </div>

          {/* Delete button */}
          {hasGoal ? (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="workspace-button workspace-button--danger"
              style={{ position: 'absolute', top: 8, right: 8, padding: '3px 5px' }}
              title="Clear goal"
            >
              <Trash2 size={10} />
            </button>
          ) : null}
        </div>

        {/* ── CENTER: Progress Bar (~45%) ───────────────────────────────────── */}
        <div
          className="workspace-card my-goal-center"
          style={{
            flex: 1,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isComplete ? '🎯 GOAL REACHED' : 'PROGRESS'}
          </div>

          {/* Track */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                height: 14,
                borderRadius: 999,
                background: 'var(--panel-muted)',
                border: '1px solid var(--panel-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  width: `${pct}%`,
                  background: isComplete
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--success)))',
                  boxShadow: `0 0 6px ${accentColor}`,
                  transition: 'width 0.4s ease, background 0.3s ease, box-shadow 0.3s ease',
                }}
              />
            </div>
            {/* Percentage label */}
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%) translateX(calc(100% + 6px))',
                fontSize: 10,
                fontWeight: 800,
                color: accentColor,
                whiteSpace: 'nowrap',
              }}
            >
              {pct.toFixed(0)}%
            </span>
          </div>

          {/* Amount labels */}
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>${fmt(displaySaved)}</span>
            {' '}of{' '}
            <span style={{ fontWeight: 700 }}>${fmt(target)}</span>
          </div>
        </div>

        {/* ── RIGHT: Add Savings (~25%) ─────────────────────────────────────── */}
        <div
          className="workspace-card my-goal-right"
          style={{
            width: '22%',
            flexShrink: 0,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            LOG SAVINGS
          </div>

          {/* Amount input */}
          <div className="relative">
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>$</span>
            <input
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSavings() }}
              type="number"
              min={0}
              className="workspace-input"
              placeholder="0.00"
              style={{ paddingLeft: 18, width: '100%' }}
            />
          </div>

          {/* Add button */}
          <button
            onClick={addSavings}
            disabled={!savingsInput || saveMutation.isPending}
            className="workspace-button workspace-button--primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
          >
            + Add to Goal
          </button>

          {/* Edit total link */}
          {editingTotal ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>$</span>
              <input
                ref={totalInputRef}
                value={totalDraft}
                onChange={(e) => setTotalDraft(e.target.value)}
                onBlur={commitTotal}
                onKeyDown={(e) => { if (e.key === 'Enter') commitTotal() }}
                type="number"
                min={0}
                className="workspace-input"
                placeholder="0"
                style={{ flex: 1, fontSize: 11, padding: '2px 6px' }}
              />
            </div>
          ) : (
            <button
              onClick={startEditTotal}
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}
            >
              Edit total
            </button>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
