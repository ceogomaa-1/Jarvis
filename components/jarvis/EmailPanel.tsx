'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Mail, RefreshCw, Settings, X } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
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

// ── Smart Filter Drawer ────────────────────────────────────────────────────────

function FilterDrawer({
  filter,
  onChange,
  onClose,
}: {
  filter: FilterConfig
  onChange: (f: FilterConfig) => void
  onClose: () => void
}) {
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
    <div className="flex-shrink-0 fade-in-up" style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--panel-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', marginBottom: 10 }}>
        INBOX SMART FILTER
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12 }}>Smart filter</span>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={enabled ? 'workspace-button workspace-button--soft' : 'workspace-button'}
          style={{ padding: '4px 12px' }}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Keywords */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Show emails matching any keyword:</div>
      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 8 }}>
        {keywords.map((kw) => (
          <span
            key={kw}
            className="workspace-badge workspace-badge--info"
            style={{ gap: 4, cursor: 'default' }}
          >
            {kw}
            <button
              onClick={() => removeChip(kw)}
              style={{ marginLeft: 2, opacity: 0.7, display: 'inline-flex', alignItems: 'center' }}
              aria-label={`Remove ${kw}`}
            >
              <X size={9} />
            </button>
          </span>
        ))}
      </div>

      {/* Add chip */}
      <div className="flex gap-1.5" style={{ marginBottom: 10 }}>
        <input
          value={chipInput}
          onChange={(e) => setChipInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addChip() }}
          className="workspace-input"
          style={{ fontSize: 12 }}
          placeholder="Add keyword, press Enter"
        />
        <button onClick={addChip} className="workspace-button" style={{ flexShrink: 0, padding: '5px 10px' }}>
          Add
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="workspace-button workspace-button--primary" style={{ flex: 1 }}>
          Save
        </button>
        <button onClick={onClose} className="workspace-button" style={{ padding: '5px 10px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function EmailPanel() {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({ keywords: DEFAULT_KEYWORDS, filter_enabled: false })
  const initialized = useRef(false)

  // Load filter from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      setFilterConfig(loadLocalFilter())
      initialized.current = true
    }
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

  const tokenExpired = error instanceof Error && error.message === 'google_session_expired'
  const missingGoogleToken = error instanceof Error && error.message === 'missing_provider_token'
  const gmailApiNotEnabled = error instanceof Error && error.message === 'gmail_api_not_enabled'
  const gmailScopeMissing = error instanceof Error && error.message === 'gmail_scope_missing'
  const gmailPreconditionFailed = error instanceof Error && error.message === 'gmail_precondition_failed'

  const renderEmpty = (icon: boolean, primary: string, secondary?: string) => (
    <div className="workspace-empty h-full">
      {icon ? <Mail size={18} /> : null}
      <span>{primary}</span>
      {secondary ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{secondary}</span> : null}
    </div>
  )

  return (
    <PanelWrapper
      title="Inbox"
      icon={<Mail size={14} />}
      className="h-full"
      headerRight={
        <div className="flex items-center gap-1.5">
          {filterConfig.filter_enabled ? (
            <span className="workspace-badge workspace-badge--info">FILTERED</span>
          ) : null}
          <button
            onClick={() => setFilterDrawerOpen((v) => !v)}
            className={filterDrawerOpen ? 'workspace-button workspace-button--soft' : 'workspace-button'}
            style={{ padding: '5px 8px' }}
            aria-label="Filter settings"
          >
            <Settings size={12} />
          </button>
          <button onClick={() => refetch()} className="workspace-button" style={{ padding: '5px 10px' }}>
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      }
    >
      {/* Filter drawer — slides in from header */}
      {filterDrawerOpen ? (
        <FilterDrawer
          filter={filterConfig}
          onChange={handleFilterSave}
          onClose={() => setFilterDrawerOpen(false)}
        />
      ) : null}

      {isLoading ? renderEmpty(true, 'Connecting to Gmail...') :
       missingGoogleToken ? renderEmpty(true, 'Gmail access not captured yet.', 'Sign out and sign back in with Google once.') :
       tokenExpired ? renderEmpty(true, 'Google inbox session expired.', 'Sign out and sign back in to refresh.') :
       gmailApiNotEnabled ? renderEmpty(true, 'Gmail API is not enabled.', 'Enable it in your Google Cloud project.') :
       gmailScopeMissing ? renderEmpty(true, 'Gmail permission was not granted.', 'Sign out and approve Gmail access on the consent screen.') :
       gmailPreconditionFailed ? renderEmpty(true, 'Google blocked the Gmail request.', 'Check your Google project consent configuration.') :
       error ? renderEmpty(true, 'Gmail could not be loaded.', (error as Error).message) :
       visibleEmails.length === 0 ? (
        <div className="workspace-empty h-full">
          <Mail size={18} />
          <span>{filterConfig.filter_enabled ? 'No important emails right now.' : 'Your inbox is empty.'}</span>
        </div>
       ) : (
        <>
          <div className="workspace-badge workspace-badge--info flex-shrink-0" style={{ width: 'fit-content', marginBottom: 8 }}>
            {visibleEmails.length} {filterConfig.filter_enabled ? 'filtered' : 'latest'} messages
          </div>
          <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="workspace-list">
              {visibleEmails.map((email) => (
                <a
                  key={email.id}
                  href={email.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="workspace-card block px-3 py-2.5 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="truncate-1" style={{ fontSize: 13, fontWeight: 800 }}>{email.from}</span>
                      {email.fromEmail ? (
                        <div className="truncate-1" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{email.fromEmail}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {!email.isRead ? <span className="workspace-badge workspace-badge--info">Unread</span> : null}
                      {email.isImportant ? <span className="workspace-badge workspace-badge--warm">!</span> : null}
                    </div>
                  </div>

                  <div className="truncate-1" style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>{email.subject}</div>

                  <div className="flex items-center justify-between gap-2" style={{ marginTop: 3 }}>
                    {email.preview ? (
                      <div className="truncate-1" style={{ fontSize: 11, color: 'var(--text-soft)', flex: 1 }}>{email.preview}</div>
                    ) : <div />}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      <ExternalLink size={10} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </PanelWrapper>
  )
}
