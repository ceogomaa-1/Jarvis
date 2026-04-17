'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { BotMessageSquare, Copy, Plus, RefreshCw, Send, Trash2, TrendingUp } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { FinanceChatMessage, FinanceExpense, FinanceGoal, FinanceProfile } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = ['Housing', 'Food', 'Transport', 'Subscriptions', 'Debt', 'Other'] as const
type Category = typeof CATEGORY_OPTIONS[number]

const CATEGORY_COLORS: Record<Category, string> = {
  Housing: '#8ab4ff',
  Food: '#4ade80',
  Transport: '#f4a43a',
  Subscriptions: '#f87171',
  Debt: '#c084fc',
  Other: '#78716c',
}

function monthlyIncome(profile: FinanceProfile | null): number {
  if (!profile) return 0
  if (profile.income_frequency === 'weekly') return profile.income * 52 / 12
  if (profile.income_frequency === 'biweekly') return profile.income * 26 / 12
  return profile.income
}

function totalExpenses(profile: FinanceProfile | null): number {
  return (profile?.expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
}

function surplus(profile: FinanceProfile | null): number {
  return monthlyIncome(profile) - totalExpenses(profile)
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function newExpenseId(): string {
  return Math.random().toString(36).slice(2)
}

// ── API fetchers ──────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<FinanceProfile | null> {
  const res = await fetch('/api/finance-profile')
  if (res.status === 401) return null
  if (!res.ok) return null
  const d = await res.json()
  return d.profile ?? null
}

async function fetchGoals(): Promise<FinanceGoal[]> {
  const res = await fetch('/api/finance-goals')
  if (res.status === 401) return []
  if (!res.ok) return []
  const d = await res.json()
  return d.goals ?? []
}

// ── Tab: My Finances ─────────────────────────────────────────────────────────

function MyFinancesTab() {
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({ queryKey: ['finance-profile'], queryFn: fetchProfile, staleTime: 30_000 })
  const { data: goals = [] } = useQuery({ queryKey: ['finance-goals'], queryFn: fetchGoals, staleTime: 30_000 })

  // Local editable state
  const [income, setIncome] = useState('')
  const [freq, setFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('biweekly')
  const [expenses, setExpenses] = useState<FinanceExpense[]>([])

  // Goal form
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')

  // Goal add-savings inputs
  const [addSavings, setAddSavings] = useState<Record<string, string>>({})

  // Sync from server
  useEffect(() => {
    if (!profile) return
    setIncome(String(profile.income ?? 0))
    setFreq(profile.income_frequency ?? 'biweekly')
    setExpenses(profile.expenses ?? [])
  }, [profile])

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finance-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income: Number(income), income_frequency: freq, expenses }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-profile'] }),
  })

  const addExpense = () => {
    setExpenses((prev) => [...prev, { id: newExpenseId(), name: '', amount: 0, category: 'Other' }])
  }

  const updateExpense = (id: string, field: keyof FinanceExpense, value: string | number) => {
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e))
  }

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const createGoal = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finance-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: goalName, target_amount: Number(goalTarget), deadline: goalDeadline || null }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      setGoalName(''); setGoalTarget(''); setGoalDeadline('')
      queryClient.invalidateQueries({ queryKey: ['finance-goals'] })
    },
  })

  const updateGoalSaved = useMutation({
    mutationFn: async ({ id, add }: { id: string; add: number }) => {
      const goal = goals.find((g) => g.id === id)
      if (!goal) throw new Error('Goal not found')
      const res = await fetch('/api/finance-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, current_saved: goal.current_saved + add }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-goals'] }),
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance-goals?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-goals'] }),
  })

  // Computed
  const monthlyInc = monthlyIncome({ income: Number(income), income_frequency: freq, expenses, id: '', user_id: '' })
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const surplusAmt = monthlyInc - totalExp

  // Donut chart data
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      {/* Left: Setup (35%) */}
      <div className="workspace-scroll flex flex-col gap-3 overflow-y-auto pr-1" style={{ width: '35%', flexShrink: 0 }}>
        {/* Income */}
        <div className="workspace-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>INCOME</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>$</span>
              <input
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                type="number"
                min={0}
                className="workspace-input"
                style={{ paddingLeft: 20 }}
                placeholder="0"
              />
            </div>
            <select value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)} className="workspace-select" style={{ width: 110 }}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Expenses */}
        <div className="workspace-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>EXPENSES</div>
          <div className="workspace-list" style={{ gap: 6 }}>
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-1.5">
                <input
                  value={exp.name}
                  onChange={(e) => updateExpense(exp.id, 'name', e.target.value)}
                  className="workspace-input"
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder="Name"
                />
                <div className="relative" style={{ width: 70, flexShrink: 0 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                  <input
                    value={exp.amount}
                    onChange={(e) => updateExpense(exp.id, 'amount', Number(e.target.value))}
                    type="number"
                    min={0}
                    className="workspace-input"
                    style={{ paddingLeft: 18 }}
                    placeholder="0"
                  />
                </div>
                <select
                  value={exp.category}
                  onChange={(e) => updateExpense(exp.id, 'category', e.target.value as Category)}
                  className="workspace-select"
                  style={{ width: 82, flexShrink: 0, fontSize: 11 }}
                >
                  {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => removeExpense(exp.id)} className="workspace-button workspace-button--danger" style={{ padding: '5px 7px', flexShrink: 0 }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button onClick={addExpense} className="workspace-button" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
              <Plus size={12} /> Add expense
            </button>
          </div>
        </div>

        {/* Savings Goals */}
        <div className="workspace-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>SAVINGS GOALS</div>
          <div className="flex flex-col gap-1.5">
            <input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="workspace-input"
              placeholder="Goal name (e.g. Trip to Japan)"
            />
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                <input
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  type="number"
                  min={0}
                  className="workspace-input"
                  style={{ paddingLeft: 18 }}
                  placeholder="Target"
                />
              </div>
              <input
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                type="date"
                className="workspace-input"
                style={{ flex: 1 }}
              />
            </div>
            <button
              onClick={() => createGoal.mutate()}
              disabled={!goalName || !goalTarget || createGoal.isPending}
              className="workspace-button workspace-button--primary"
              style={{ alignSelf: 'flex-start' }}
            >
              <Plus size={12} /> Add goal
            </button>
          </div>
        </div>

        <button
          onClick={() => saveProfile.mutate()}
          disabled={saveProfile.isPending}
          className="workspace-button workspace-button--primary"
          style={{ alignSelf: 'flex-stretch' }}
        >
          {saveProfile.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Right: Overview (65%) */}
      <div className="workspace-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {/* Stats row */}
        <div className="flex gap-2">
          {[
            { label: 'Monthly Income', value: `$${fmt(monthlyInc)}`, sub: `${freq}` },
            { label: 'Total Expenses', value: `$${fmt(totalExp)}`, sub: `${expenses.length} items` },
            { label: 'Available', value: `$${fmt(surplusAmt)}`, accent: true },
          ].map((item) => (
            <div key={item.label} className="workspace-card flex-1" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 4, color: item.accent ? 'var(--accent)' : 'var(--text)' }}>
                {item.value}
              </div>
              {item.sub ? <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div> : null}
            </div>
          ))}
        </div>

        {/* Donut chart */}
        {pieData.length > 0 ? (
          <div className="workspace-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>EXPENSE BREAKDOWN</div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={54} dataKey="value" strokeWidth={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as Category] ?? '#78716c'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`$${fmt(v)}`, '']}
                    contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--panel-border)', borderRadius: 10, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: '999px', background: CATEGORY_COLORS[entry.name as Category] ?? '#78716c', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{entry.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>${fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Goals */}
        {goals.length > 0 ? (
          <div className="workspace-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 10 }}>SAVINGS GOALS</div>
            <div className="workspace-list">
              {goals.map((goal) => {
                const pct = Math.min(100, goal.target_amount > 0 ? (goal.current_saved / goal.target_amount) * 100 : 0)
                const remaining = goal.target_amount - goal.current_saved
                const monthsToGoal = surplusAmt > 0 ? Math.ceil(remaining / surplusAmt) : null
                return (
                  <div key={goal.id} className="workspace-card" style={{ padding: '10px 12px' }}>
                    <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{goal.name}</span>
                      <button onClick={() => deleteGoal.mutate(goal.id)} className="workspace-button workspace-button--danger" style={{ padding: '3px 6px' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <div className="finance-progress-track" style={{ marginBottom: 6 }}>
                      <div className="finance-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                        ${fmt(goal.current_saved)} / ${fmt(goal.target_amount)} ({pct.toFixed(0)}%)
                        {monthsToGoal ? ` · ~${monthsToGoal}mo` : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="relative" style={{ width: 64 }}>
                          <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>$</span>
                          <input
                            value={addSavings[goal.id] ?? ''}
                            onChange={(e) => setAddSavings((s) => ({ ...s, [goal.id]: e.target.value }))}
                            type="number"
                            min={0}
                            className="workspace-input"
                            style={{ paddingLeft: 16, fontSize: 12 }}
                            placeholder="0"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const add = Number(addSavings[goal.id] ?? 0)
                            if (!add) return
                            updateGoalSaved.mutate({ id: goal.id, add })
                            setAddSavings((s) => ({ ...s, [goal.id]: '' }))
                          }}
                          className="workspace-button workspace-button--soft"
                          style={{ padding: '5px 8px', fontSize: 11 }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Tab: AI Advisor ───────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "How should I split my paycheck?",
  "What can I cut to save faster?",
  "Give me a strict budget plan",
  "What's my biggest spending risk?",
]

function AIAdvisorTab() {
  const [messages, setMessages] = useState<FinanceChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: profile } = useQuery({ queryKey: ['finance-profile'], queryFn: fetchProfile, staleTime: 30_000 })
  const { data: goals = [] } = useQuery({ queryKey: ['finance-goals'], queryFn: fetchGoals, staleTime: 30_000 })

  const profileData = profile ?? null
  const surplusAmt = surplus(profileData)
  const monthlyInc = monthlyIncome(profileData)
  const totalExp = totalExpenses(profileData)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const sendMessage = useCallback(async (userText: string) => {
    const text = userText.trim()
    if (!text || streaming) return

    const newMessages: FinanceChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/ai/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, profile, goals }),
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) throw new Error('Failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, profile, goals])

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => null)
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      {/* Left: Context (35%) */}
      <div className="flex flex-col gap-3" style={{ width: '35%', flexShrink: 0 }}>
        {profile ? (
          <div className="workspace-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>YOUR FINANCIAL CONTEXT</div>
            <div className="workspace-list" style={{ gap: 4 }}>
              {[
                { label: 'Monthly income', value: `$${fmt(monthlyInc)}` },
                { label: 'Total expenses', value: `$${fmt(totalExp)}` },
                { label: 'Monthly surplus', value: `$${fmt(surplusAmt)}`, accent: surplusAmt > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: item.accent ? 'var(--success)' : 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
            {goals.length > 0 ? (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--panel-border)' }}>
                {goals.map((g) => {
                  const rem = g.target_amount - g.current_saved
                  const months = surplusAmt > 0 ? Math.ceil(rem / surplusAmt) : null
                  return (
                    <div key={g.id} style={{ fontSize: 11, color: 'var(--text-soft)', marginBottom: 3 }}>
                      {g.name}: ~{months ? `${months}mo` : '∞'}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="workspace-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set up your finance profile in the "My Finances" tab first.</div>
          </div>
        )}

        <div className="workspace-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 8 }}>SUGGESTED QUESTIONS</div>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={streaming}
                className="workspace-button"
                style={{ justifyContent: 'flex-start', fontSize: 11, textAlign: 'left', whiteSpace: 'normal', height: 'auto', padding: '6px 10px' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Chat (65%) */}
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {/* Messages */}
        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="workspace-empty h-full">
              <BotMessageSquare size={20} />
              <span>Ask me anything about your finances.</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>I have your full profile loaded as context.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-1">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div style={{ position: 'relative', maxWidth: '90%' }}>
                    <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                      {msg.content || (
                        <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                          <span className="dot-blink" style={{ display: 'inline-block', marginRight: 4 }}>●</span>
                          <span className="dot-blink" style={{ display: 'inline-block', marginRight: 4, animationDelay: '0.2s' }}>●</span>
                          <span className="dot-blink" style={{ display: 'inline-block', animationDelay: '0.4s' }}>●</span>
                        </span>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.content ? (
                      <button
                        onClick={() => copyMessage(msg.content)}
                        className="workspace-button"
                        style={{ position: 'absolute', top: 4, right: -32, padding: '3px 6px', opacity: 0.5 }}
                        title="Copy"
                      >
                        <Copy size={10} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.role === 'user' ? (
                <div className="flex justify-start">
                  <div className="chat-bubble-ai" style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
                    JARVIS is analyzing...
                  </div>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex flex-shrink-0 gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            className="workspace-input"
            placeholder="Ask your finance advisor..."
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="workspace-button workspace-button--primary"
            style={{ flexShrink: 0 }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function FinanceAgentPanel() {
  const [tab, setTab] = useState<'finances' | 'advisor'>('finances')

  return (
    <PanelWrapper
      title="Personal Finance"
      icon={<TrendingUp size={14} />}
      className="flex-shrink-0"
      headerRight={
        <div className="tab-bar">
          <button
            className="tab-bar__tab"
            data-active={tab === 'finances' ? 'true' : 'false'}
            onClick={() => setTab('finances')}
          >
            My Finances
          </button>
          <button
            className="tab-bar__tab"
            data-active={tab === 'advisor' ? 'true' : 'false'}
            onClick={() => setTab('advisor')}
          >
            <BotMessageSquare size={11} style={{ display: 'inline', marginRight: 4 }} />
            AI Advisor
          </button>
        </div>
      }
    >
      {tab === 'finances' ? <MyFinancesTab /> : <AIAdvisorTab />}
    </PanelWrapper>
  )
}
