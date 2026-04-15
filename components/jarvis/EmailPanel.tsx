'use client'

import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Mail, RefreshCw } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { EmailMessage } from '@/types'

interface EmailApiResponse {
  emails: EmailMessage[]
  source: string
  error?: string
}

async function fetchInbox(): Promise<EmailApiResponse> {
  const response = await fetch('/api/email-digest')
  const payload = (await response.json()) as EmailApiResponse
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load inbox')
  return payload
}

export function EmailPanel() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['gmail-inbox'],
    queryFn: fetchInbox,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  const emails = data?.emails ?? []
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
        <button onClick={() => refetch()} className="workspace-button" style={{ padding: '5px 10px' }}>
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      {isLoading ? renderEmpty(true, 'Connecting to Gmail...') :
       missingGoogleToken ? renderEmpty(true, 'Gmail access not captured yet.', 'Sign out and sign back in with Google once.') :
       tokenExpired ? renderEmpty(true, 'Google inbox session expired.', 'Sign out and sign back in to refresh.') :
       gmailApiNotEnabled ? renderEmpty(true, 'Gmail API is not enabled.', 'Enable it in your Google Cloud project.') :
       gmailScopeMissing ? renderEmpty(true, 'Gmail permission was not granted.', 'Sign out and approve Gmail access on the consent screen.') :
       gmailPreconditionFailed ? renderEmpty(true, 'Google blocked the Gmail request.', 'Check your Google project consent configuration.') :
       error ? renderEmpty(true, 'Gmail could not be loaded.', (error as Error).message) :
       emails.length === 0 ? renderEmpty(true, 'Your inbox is empty.') : (
        <>
          <div className="workspace-badge workspace-badge--info flex-shrink-0" style={{ width: 'fit-content', marginBottom: 8 }}>
            {emails.length} latest messages
          </div>
          <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="workspace-list">
              {emails.map((email) => (
                <a
                  key={email.id}
                  href={email.gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="workspace-card block px-3 py-2.5 transition-transform hover:-translate-y-0.5"
                >
                  {/* row 1: sender + badges */}
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

                  {/* row 2: subject */}
                  <div className="truncate-1" style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>{email.subject}</div>

                  {/* row 3: preview + timestamp */}
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
