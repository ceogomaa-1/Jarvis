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

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to load inbox')
  }

  return payload
}

export function EmailPanel() {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
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

  return (
    <PanelWrapper
      title="Inbox"
      icon={<Mail size={16} />}
      className="h-full"
      headerRight={
        <button onClick={() => refetch()} className="workspace-button" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        {isLoading ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Connecting to Gmail...</span>
          </div>
        ) : missingGoogleToken ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Gmail access has not been captured for this login yet.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sign out and sign back in with Google once, and Jarvis will store Gmail access on the callback.
            </span>
          </div>
        ) : tokenExpired ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Your Google inbox session expired.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sign out and sign back in with Google to refresh Gmail access.
            </span>
          </div>
        ) : gmailApiNotEnabled ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Google is rejecting Gmail access because the Gmail API is not enabled.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Enable the Gmail API in the same Google Cloud project that owns your OAuth client, then sign in again.
            </span>
          </div>
        ) : gmailScopeMissing ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Google signed you in, but the Gmail permission was not granted to this session.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sign out and sign back in, approve Gmail access on the consent screen, and Jarvis will retry automatically.
            </span>
          </div>
        ) : gmailPreconditionFailed ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Google blocked the Gmail request with a precondition failure.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This usually means the Google project or consent configuration still needs one more fix.
            </span>
          </div>
        ) : error ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Gmail could not be loaded right now.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{error.message}</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="workspace-empty h-full">
            <Mail size={22} />
            <span>Your inbox is empty.</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Jarvis will show your most recent Gmail inbox messages here.
            </span>
          </div>
        ) : (
          <>
            <div className="workspace-badge workspace-badge--info" style={{ width: 'fit-content' }}>
              {emails.length} latest inbox messages
            </div>

            <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="workspace-list">
                {emails.map((email) => (
                  <a
                    key={email.id}
                    href={email.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="workspace-card block p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate-1" style={{ fontSize: 14, fontWeight: 800 }}>
                          {email.from}
                        </div>
                        {email.fromEmail ? (
                          <div className="truncate-1" style={{ marginTop: 2, fontSize: 12, color: 'var(--text-soft)' }}>
                            {email.fromEmail}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {!email.isRead ? <span className="workspace-badge workspace-badge--info">Unread</span> : null}
                        {email.isImportant ? <span className="workspace-badge workspace-badge--warm">Important</span> : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 15, fontWeight: 800, lineHeight: 1.35 }}>{email.subject}</div>

                    {email.preview ? (
                      <div className="truncate-2" style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)' }}>
                        {email.preview}
                      </div>
                    ) : null}

                    <div
                      style={{
                        marginTop: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Open in Gmail
                        <ExternalLink size={12} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PanelWrapper>
  )
}
