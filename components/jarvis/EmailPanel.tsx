'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Settings,
  X,
  Plus,
  ExternalLink,
  Eye,
  CheckCircle,
  Inbox,
} from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import { MOCK_EMAILS } from '@/lib/mockData'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EmailMessage {
  id: string
  threadId: string
  from: string
  fromEmail: string
  subject: string
  preview: string
  receivedAt: string
  isRead: boolean
  isImportant: boolean
  gmailUrl: string
}

// ---------------------------------------------------------------------------
// Time-ago helper (no external dependency)
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return 'unknown'

  const diffMs = now - then
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------
async function fetchEmailDigest(): Promise<EmailMessage[]> {
  const res = await fetch('/api/email-digest')
  if (!res.ok) throw new Error(`Failed to fetch email digest: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.emails ?? data.messages ?? [])
}

// ---------------------------------------------------------------------------
// Default filter keywords
// ---------------------------------------------------------------------------
const DEFAULT_KEYWORDS = ['invoice', 'meeting', 'urgent', 'client', 'payment']

// ---------------------------------------------------------------------------
// Keyword settings panel
// ---------------------------------------------------------------------------
interface KeywordSettingsPanelProps {
  keywords: string[]
  onAdd: (kw: string) => void
  onRemove: (kw: string) => void
  onClose: () => void
}

function KeywordSettingsPanel({
  keywords,
  onAdd,
  onRemove,
  onClose,
}: KeywordSettingsPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase()
    if (trimmed && !keywords.includes(trimmed)) {
      onAdd(trimmed)
    }
    setInputValue('')
    inputRef.current?.focus()
  }, [inputValue, keywords, onAdd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd]
  )

  return (
    <motion.div
      key="keyword-settings"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="overflow-hidden"
      style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
    >
      <div className="px-4 py-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/50"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Priority Keywords
          </span>
          <button
            onClick={onClose}
            className="p-0.5 rounded text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors duration-150"
            aria-label="Close settings"
          >
            <X size={12} />
          </button>
        </div>

        {/* Keyword tags */}
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-sm text-[11px] font-medium"
              style={{
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00D4FF',
                fontFamily: 'Rajdhani, sans-serif',
              }}
            >
              {kw}
              <button
                onClick={() => onRemove(kw)}
                className="rounded hover:bg-white/10 transition-colors duration-100 flex items-center justify-center"
                style={{ color: 'rgba(0,212,255,0.6)' }}
                aria-label={`Remove ${kw}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        {/* Add keyword input */}
        <div
          className="flex items-center gap-1.5 rounded-sm px-2 py-1"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,212,255,0.15)',
          }}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add keyword…"
            className="flex-1 bg-transparent text-[12px] text-white/70 placeholder-white/20 outline-none"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="rounded p-0.5 text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Add keyword"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Email row
// ---------------------------------------------------------------------------
interface EmailRowProps {
  email: EmailMessage
  onMarkRead: (id: string) => void
}

function EmailRow({ email, onMarkRead }: EmailRowProps) {
  const [hovered, setHovered] = useState(false)

  const initial = email.from.charAt(0).toUpperCase()
  const isUnread = !email.isRead

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-start gap-2.5 px-3 py-2.5 cursor-default transition-colors duration-150"
      style={{
        background: isUnread
          ? 'rgba(0,212,255,0.035)'
          : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Unread left border glow */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300"
        style={{
          background: isUnread
            ? 'linear-gradient(180deg, #00D4FF 0%, rgba(0,212,255,0.3) 100%)'
            : 'transparent',
          boxShadow: isUnread ? '0 0 6px rgba(0,212,255,0.6)' : 'none',
        }}
      />

      {/* Avatar */}
      <div
        className="shrink-0 flex items-center justify-center rounded-full font-bold text-[11px]"
        style={{
          width: 28,
          height: 28,
          background: isUnread
            ? 'rgba(0,212,255,0.15)'
            : 'rgba(255,255,255,0.06)',
          border: isUnread
            ? '1px solid rgba(0,212,255,0.35)'
            : '1px solid rgba(255,255,255,0.1)',
          color: isUnread ? '#00D4FF' : 'rgba(255,255,255,0.35)',
          fontFamily: 'Rajdhani, sans-serif',
          flexShrink: 0,
        }}
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: sender + time + badges */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[12px] truncate"
            style={{
              color: isUnread ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
              fontWeight: isUnread ? 700 : 400,
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.03em',
              flex: '1 1 0',
              minWidth: 0,
            }}
          >
            {email.from}
          </span>

          {/* IMPORTANT badge */}
          {email.isImportant && (
            <span
              className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
              style={{
                background: 'rgba(255,184,48,0.12)',
                border: '1px solid rgba(255,184,48,0.35)',
                color: '#FFB830',
                fontFamily: 'Rajdhani, sans-serif',
              }}
            >
              IMPORTANT
            </span>
          )}

          {/* Time */}
          <span
            className="shrink-0 text-[10px]"
            style={{
              color: 'rgba(255,255,255,0.28)',
              fontFamily: 'Rajdhani, sans-serif',
            }}
          >
            {timeAgo(email.receivedAt)}
          </span>
        </div>

        {/* Subject */}
        <div
          className="text-[12px] leading-snug truncate mb-0.5"
          style={{
            color: email.isImportant
              ? '#FFB830'
              : isUnread
              ? 'rgba(255,255,255,0.8)'
              : 'rgba(255,255,255,0.45)',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: email.isImportant || isUnread ? 600 : 400,
          }}
        >
          {email.subject}
        </div>

        {/* Preview */}
        <div
          className="text-[11px] leading-relaxed truncate"
          style={{
            color: 'rgba(255,255,255,0.28)',
            fontFamily: 'Rajdhani, sans-serif',
          }}
        >
          {email.preview}
        </div>

        {/* Action row — visible on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden flex items-center gap-1.5"
            >
              {/* Mark as Read */}
              {isUnread && (
                <button
                  onClick={() => onMarkRead(email.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    color: 'rgba(0,212,255,0.7)',
                    fontFamily: 'Rajdhani, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.background = 'rgba(0,212,255,0.15)'
                    el.style.color = '#00D4FF'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.background = 'rgba(0,212,255,0.08)'
                    el.style.color = 'rgba(0,212,255,0.7)'
                  }}
                >
                  <Eye size={10} />
                  Mark Read
                </button>
              )}

              {/* Open in Gmail */}
              <a
                href={email.gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'Rajdhani, sans-serif',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.08)'
                  el.style.color = 'rgba(255,255,255,0.75)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.04)'
                  el.style.color = 'rgba(255,255,255,0.4)'
                }}
              >
                <ExternalLink size={10} />
                Open in Gmail
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10">
      <CheckCircle size={22} style={{ color: 'rgba(0,212,255,0.3)' }} />
      <span
        className="text-[11px] font-semibold tracking-[0.15em] uppercase text-center"
        style={{ color: 'rgba(255,255,255,0.22)', fontFamily: 'Rajdhani, sans-serif' }}
      >
        INBOX CLEAR — No priority messages
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function EmailPanel() {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Local read overrides: track ids marked read in this session
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set())

  // React Query — fetch with 5 min staleTime, refetch on window focus
  const { data: fetchedEmails, isLoading } = useQuery<EmailMessage[]>({
    queryKey: ['email-digest'],
    queryFn: fetchEmailDigest,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // Use fetched data or fall back to mock data while loading
  const baseEmails: EmailMessage[] = isLoading
    ? (MOCK_EMAILS as EmailMessage[])
    : (fetchedEmails ?? (MOCK_EMAILS as EmailMessage[]))

  // Apply local read overrides
  const emails: EmailMessage[] = baseEmails.map((e) =>
    localReadIds.has(e.id) ? { ...e, isRead: true } : e
  )

  // Max 10, scrollable
  const visibleEmails = emails.slice(0, 10)

  const unreadCount = visibleEmails.filter((e) => !e.isRead).length

  const handleMarkRead = useCallback((id: string) => {
    setLocalReadIds((prev) => new Set(prev).add(id))
  }, [])

  const handleAddKeyword = useCallback((kw: string) => {
    setKeywords((prev) => [...prev, kw])
  }, [])

  const handleRemoveKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  // Header right slot
  const headerRight = (
    <div className="flex items-center gap-2">
      {/* Unread badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="unread-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
            style={{
              background: 'rgba(255,184,48,0.12)',
              border: '1px solid rgba(255,184,48,0.35)',
              color: '#FFB830',
              fontFamily: 'Rajdhani, sans-serif',
            }}
          >
            {unreadCount} UNREAD
          </motion.span>
        )}
      </AnimatePresence>

      {/* Settings gear */}
      <button
        onClick={() => setSettingsOpen((v) => !v)}
        className="p-1 rounded transition-colors duration-150"
        style={{
          color: settingsOpen ? '#00D4FF' : 'rgba(255,255,255,0.3)',
          background: settingsOpen ? 'rgba(0,212,255,0.08)' : 'transparent',
        }}
        aria-label="Toggle keyword settings"
        title="Filter keywords"
      >
        <Settings size={13} />
      </button>
    </div>
  )

  return (
    <PanelWrapper
      title="COMMS INCOMING"
      icon={<Mail size={13} />}
      headerRight={headerRight}
      noPad
    >
      <div className="flex flex-col h-full">
        {/* Keyword settings panel */}
        <AnimatePresence>
          {settingsOpen && (
            <KeywordSettingsPanel
              keywords={keywords}
              onAdd={handleAddKeyword}
              onRemove={handleRemoveKeyword}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Email list */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
          style={{ maxHeight: '420px' }}
        >
          {visibleEmails.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              {visibleEmails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 shrink-0 flex items-center gap-1.5"
          style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}
        >
          <Inbox size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <span
            className="text-[10px]"
            style={{
              color: 'rgba(255,255,255,0.2)',
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.06em',
            }}
          >
            Synced via Gmail API &bull; Connect in Settings
          </span>
        </div>
      </div>
    </PanelWrapper>
  )
}
