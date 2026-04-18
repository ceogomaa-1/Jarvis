'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, X } from 'lucide-react'
import type { EmailMessage } from '@/types'

interface EmailApiResponse {
  emails: EmailMessage[]
  source: string
  error?: string
}

interface FilterConfig {
  keywords: string[]
  filter_enabled: boolean
}

const DEFAULT_KEYWORDS = ['invoice', 'meeting', 'urgent', 'client', 'deployment', 'payment', 'contract', 'project']
const FILTER_STORAGE_KEY = 'jarvis.email.filter'

function loadLocalFilter(): FilterConfig {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return { keywords: DEFAULT_KEYWORDS, filter_enabled: false }
    return JSON.parse(raw) as FilterConfig
  } catch { return { keywords: DEFAULT_KEYWORDS, filter_enabled: false } }
}

function saveLocalFilter(config: FilterConfig) {
  try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(config)) } catch {}
}

async function fetchInbox(): Promise<EmailApiResponse> {
  const response = await fetch('/api/email-digest')
  const payload = (await response.json()) as EmailApiResponse
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load inbox')
  return payload
}

async function persistFilter(config: FilterConfig): Promise<void> {
  try {
    await fetch('/api/email-filters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  } catch {}
}

function FilterDrawer({ filter, onChange, onClose }: { filter: FilterConfig; onChange: (f: FilterConfig) => void; onClose: () => void }) {
  const [keywords, setKeywords] = useState<string[]>(filter.keywords)
  const [enabled, setEnabled] = useState(filter.filter_enabled)
  const [chipInput, setChipInput] = useState('')

  const addChip = () => {
    const kw = chipInput.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) { setChipInput(''); return }
    setKeywords((prev) => [...prev, kw])
    setChipInput('')
  }
  const removeChip = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw))
  const save = () => {
    const config: FilterConfig = { keywords, filter_enabled: enabled }
    onChange(config)
    onClose()
  }

  return (
    <div style={{ padding: '12px 0 14px', borderBottom: '1px solid var(--line-soft)', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
        Smart Filter
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Smart filter</span>
        <button
          onClick={() => setEnabled((v) => !v)}
          style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid',
            background: enabled ? 'var(--accent-soft)' : 'var(--bg-2)',
            borderColor: enabled ? 'var(--accent-line)' : 'var(--line-soft)',
            color: enabled ? 'var(--accent)' : 'var(--text-mute)',
          }}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {keywords.map((kw) => (
          <span key={kw} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
            borderRadius: 999, fontSize: 10.5, background: 'var(--accent-soft)',
            color: 'var(--accent)', border: '1px solid var(--accent-line)',
          }}>
            {kw}
            <button onClick={() => removeChip(kw)} style={{ opacity: 0.7, display: 'inline-flex', cursor: 'pointer' }} aria-label={`Remove ${kw}`}>
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={chipInput}
          onChange={(e) => setChipInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addChip() }}
          placeholder="Add keyword, press Enter"
          style={{
            flex: 1, padding: '5px 10px', borderRadius: 7, fontSize: 12,
            border: '1px solid var(--line-soft)', background: 'var(--bg-2)', color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button onClick={addChip} style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Add</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} style={{ flex: 1, padding: '6px 10px', borderRadius: 7, background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        <button onClick={onClose} style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--bg-2)', border: '1px solid var(--line-soft)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

export function EmailPanel() {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({ keywords: DEFAULT_KEYWORDS, filter_enabled: false })
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) { setFilterConfig(loadLocalFilter()); initialized.current = true }
  }, [])

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['gmail-inbox'],
    queryFn: fetchInbox,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  const allEmails = data?.emails ?? []
  const visibleEmails = useMemo(() => {
    if (!filterConfig.filter_enabled || filterConfig.keywords.length === 0) return allEmails
    const terms = filterConfig.keywords.map((k) => k.toLowerCase())
    return allEmails.filter((email) => {
      const haystack = [email.from, email.subject, email.preview ?? ''].join(' ').toLowerCase()
      return terms.some((term) => haystack.includes(term))
    })
  }, [allEmails, filterConfig])

  const handleFilterSave = (config: FilterConfig) => {
    setFilterConfig(config)
    saveLocalFilter(config)
    persistFilter(config)
  }

  const hasError = !!error
  const errorMsg = error instanceof Error ? error.message : 'Unknown error'

  return (
    <>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: filterDrawerOpen ? 0 : 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          {visibleEmails.length} {filterConfig.filter_enabled ? 'filtered' : 'messages'}
        </span>
        <div style={{ flex: 1 }} />
        {filterConfig.filter_enabled && (
          <span style={{ fontSize: 9.5, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Filtered</span>
        )}
        <button
          onClick={() => setFilterDrawerOpen((v) => !v)}
          style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
            border: '1px solid var(--line-soft)',
            background: filterDrawerOpen ? 'var(--accent-soft)' : 'var(--bg-2)',
            color: filterDrawerOpen ? 'var(--accent)' : 'var(--text-mute)',
          }}
        >
          Filter
        </button>
        <button
          onClick={() => refetch()}
          style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--line-soft)', background: 'var(--bg-2)', color: 'var(--text-mute)' }}
        >
          {isFetching ? '...' : '↻'}
        </button>
      </div>

      {filterDrawerOpen && (
        <FilterDrawer filter={filterConfig} onChange={handleFilterSave} onClose={() => setFilterDrawerOpen(false)} />
      )}

      {isLoading ? (
        <div style={{ fontSize: 12, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>Connecting to Gmail...</div>
      ) : hasError ? (
        <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>
          {errorMsg === 'google_session_expired' ? 'Session expired — sign out and back in.' :
           errorMsg === 'missing_provider_token' ? 'Sign out and back in with Google.' :
           errorMsg === 'gmail_scope_missing' ? 'Approve Gmail access on consent screen.' :
           'Could not load Gmail.'}
        </div>
      ) : visibleEmails.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-mute)', fontStyle: 'italic' }}>
          {filterConfig.filter_enabled ? 'No important emails right now.' : 'Inbox is empty.'}
        </div>
      ) : (
        <div className="inbox-list">
          {visibleEmails.slice(0, 6).map((email) => (
            <a
              key={email.id}
              href={email.gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inbox-row"
              style={{ textDecoration: 'none' }}
            >
              <span className={`inbox-dot ${email.isRead ? 'read' : ''}`} />
              <div style={{ minWidth: 0 }}>
                <div className="inbox-from">
                  {email.from}
                  {!email.isRead && <span className="unread-tag">NEW</span>}
                </div>
                <div className="inbox-subject">{email.subject}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <span className="inbox-time">
                  {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                </span>
                <ExternalLink size={9} style={{ color: 'var(--text-faint)' }} />
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
