'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  created_at: string
}

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

export function SubscriptionsPanel() {
  const queryClient = useQueryClient()
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
    staleTime: 30_000,
  })

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
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
    onSuccess: () => { setNewName(''); setNewAmount(''); queryClient.invalidateQueries({ queryKey: ['subscriptions'] }) },
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
    onSuccess: () => { setEditingId(null); queryClient.invalidateQueries({ queryKey: ['subscriptions'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/subscriptions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const total = subscriptions.reduce((s, sub) => s + Number(sub.amount), 0)

  const startEdit = (sub: Subscription) => { setEditingId(sub.id); setEditName(sub.name); setEditAmount(String(sub.amount)) }
  const commitEdit = (id: string) => {
    if (!editName.trim()) return
    updateMutation.mutate({ id, name: editName.trim(), amount: Number(editAmount) })
  }

  return (
    <>
      {isLoading ? (
        <div style={{ fontSize: 12, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>Loading...</div>
      ) : (
        <div className="subs-list">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="sub-row">
              {editingId === sub.id ? (
                <>
                  <input
                    autoFocus value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitEdit(sub.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(sub.id); if (e.key === 'Escape') setEditingId(null) }}
                    style={{ flex: 1, fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--accent-line)', borderRadius: 5, padding: '2px 6px', color: 'var(--text)', outline: 'none' }}
                    placeholder="Name"
                  />
                  <input
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    onBlur={() => commitEdit(sub.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(sub.id); if (e.key === 'Escape') setEditingId(null) }}
                    type="number" min={0}
                    style={{ width: 60, fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--accent-line)', borderRadius: 5, padding: '2px 6px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                    placeholder="0.00"
                  />
                </>
              ) : (
                <>
                  <span className="sub-name" onClick={() => startEdit(sub)} style={{ cursor: 'text' }} title="Click to edit">{sub.name}</span>
                  <span className="sub-amt" onClick={() => startEdit(sub)} style={{ cursor: 'text' }}>${fmt(sub.amount)}<span style={{ fontSize: 9, color: 'var(--text-faint)' }}>/mo</span></span>
                </>
              )}
              <button className="sub-del" onClick={() => deleteMutation.mutate(sub.id)} aria-label="Delete">×</button>
            </div>
          ))}

          <div className="subs-total">
            <span>MONTHLY TOTAL</span>
            <b>${fmt(total)}</b>
          </div>
        </div>
      )}

      {/* Add row */}
      <div className="subs-add-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && newAmount) addMutation.mutate() }}
          placeholder="Name..."
        />
        <input
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && newAmount) addMutation.mutate() }}
          type="number" min={0}
          placeholder="$0.00"
          style={{ width: 64 }}
        />
        <button
          className="subs-add-btn"
          onClick={() => addMutation.mutate()}
          disabled={!newName.trim() || !newAmount || addMutation.isPending}
        >
          Add
        </button>
      </div>
    </>
  )
}
