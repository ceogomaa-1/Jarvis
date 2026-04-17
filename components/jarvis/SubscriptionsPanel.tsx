'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  created_at: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions')
  if (res.status === 401) return []
  if (!res.ok) return []
  const d = await res.json()
  return d.subscriptions ?? []
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SubscriptionsPanel() {
  const queryClient = useQueryClient()
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
    staleTime: 30_000,
  })

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), amount: Number(newAmount) }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      setNewName('')
      setNewAmount('')
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, amount }: { id: string; name: string; amount: number }) => {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, amount }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const total = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0)

  const startEdit = (sub: Subscription) => {
    setEditingId(sub.id)
    setEditName(sub.name)
    setEditAmount(String(sub.amount))
  }

  const commitEdit = (id: string) => {
    if (!editName.trim()) return
    updateMutation.mutate({ id, name: editName.trim(), amount: Number(editAmount) })
  }

  return (
    <PanelWrapper
      title="Subscriptions"
      icon={<CreditCard size={14} />}
      className="flex-shrink-0"
      headerRight={
        subscriptions.length > 0 ? (
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>
            ${fmt(total)}/mo total
          </div>
        ) : null
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Subscription list ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
              No subscriptions added yet. Add your first one →
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="workspace-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}
                >
                  {editingId === sub.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => commitEdit(sub.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(sub.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="workspace-input"
                        style={{ flex: 1, fontSize: 13 }}
                        placeholder="Name"
                      />
                      <div style={{ position: 'relative', width: 80, flexShrink: 0 }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                        <input
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onBlur={() => commitEdit(sub.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(sub.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          type="number"
                          min={0}
                          className="workspace-input"
                          style={{ paddingLeft: 18, fontSize: 12 }}
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: 'text', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => startEdit(sub)}
                        title="Click to edit"
                      >
                        {sub.name}
                      </span>
                      <span
                        style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', flexShrink: 0, cursor: 'text' }}
                        onClick={() => startEdit(sub)}
                      >
                        ${fmt(sub.amount)}<span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>/mo</span>
                      </span>
                    </>
                  )}

                  <button
                    onClick={() => deleteMutation.mutate(sub.id)}
                    disabled={deleteMutation.isPending}
                    className="workspace-button workspace-button--danger"
                    style={{ padding: '4px 6px', flexShrink: 0 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {/* Total row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  paddingTop: 6,
                  borderTop: '1px solid var(--panel-border)',
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Monthly Total
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                  ${fmt(total)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Add form ──────────────────────────────────────────────────────── */}
        <div
          className="workspace-card"
          style={{ width: 260, flexShrink: 0, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ADD SUBSCRIPTION
          </div>

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && newAmount) addMutation.mutate() }}
            className="workspace-input"
            placeholder="e.g. Netflix, Spotify..."
          />

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>$</span>
            <input
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && newAmount) addMutation.mutate() }}
              type="number"
              min={0}
              className="workspace-input"
              style={{ paddingLeft: 20 }}
              placeholder="0.00 / month"
            />
          </div>

          <button
            onClick={() => addMutation.mutate()}
            disabled={!newName.trim() || !newAmount || addMutation.isPending}
            className="workspace-button workspace-button--primary"
            style={{ justifyContent: 'center' }}
          >
            <Plus size={12} />
            Add Subscription
          </button>
        </div>
      </div>
    </PanelWrapper>
  )
}
