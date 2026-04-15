import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailMessage } from '@/types'

export const dynamic = 'force-dynamic'

async function getRefreshTokenFromUserMetadata(
  cookieStore: ReturnType<typeof cookies>
): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const token = user?.user_metadata?.google_refresh_token
    return typeof token === 'string' && token ? token : null
  } catch {
    return null
  }
}

function parseMailbox(fromHeader: string | null | undefined) {
  if (!fromHeader) {
    return { from: 'Unknown sender', fromEmail: '' }
  }

  const match = fromHeader.match(/^(.*?)(?:\s*<(.+?)>)?$/)
  const from = match?.[1]?.replace(/^"|"$/g, '').trim() || fromHeader
  const fromEmail = match?.[2]?.trim() || ''

  return {
    from: from || fromEmail || 'Unknown sender',
    fromEmail,
  }
}

function getHeader(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

async function refreshGoogleProviderToken(refreshToken: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as { access_token?: string }
  return payload.access_token ?? null
}

async function fetchInbox(accessToken: string) {
  return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })
}

async function describeGoogleError(response: Response) {
  const fallback = `gmail_request_failed:${response.status}`

  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string
        status?: string
        details?: Array<{ reason?: string }>
      }
    }

    const message = payload.error?.message ?? ''
    const reason = payload.error?.details?.[0]?.reason ?? ''
    const combined = `${reason} ${message}`.toLowerCase()

    if (combined.includes('accessnotconfigured') || combined.includes('gmail api has not been used')) {
      return 'gmail_api_not_enabled'
    }

    if (combined.includes('insufficient authentication scopes') || combined.includes('insufficientpermissions')) {
      return 'gmail_scope_missing'
    }

    if (combined.includes('precondition check failed')) {
      return 'gmail_precondition_failed'
    }

    return message ? `${fallback}:${message}` : fallback
  } catch {
    return fallback
  }
}

export async function GET() {
  const cookieStore = cookies()
  let refreshToken = cookieStore.get('jarvis_google_provider_refresh_token')?.value ?? ''
  let accessToken = cookieStore.get('jarvis_google_provider_token')?.value ?? ''

  // If no refresh token in cookie, fall back to user metadata (survives cookie expiry)
  if (!refreshToken) {
    refreshToken = (await getRefreshTokenFromUserMetadata(cookieStore)) ?? ''
  }

  let inboxRes = accessToken ? await fetchInbox(accessToken) : null

  if ((!inboxRes || inboxRes.status === 401) && refreshToken) {
    const refreshedAccessToken = await refreshGoogleProviderToken(refreshToken)

    if (refreshedAccessToken) {
      accessToken = refreshedAccessToken
      cookieStore.set('jarvis_google_provider_token', refreshedAccessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60,
      })
      inboxRes = await fetchInbox(refreshedAccessToken)
    }
  }

  if (!accessToken || !inboxRes) {
    return NextResponse.json(
      {
        emails: [],
        source: 'gmail',
        error: 'missing_provider_token',
      },
      { status: 401 }
    )
  }

  if (!inboxRes.ok) {
    const reason = inboxRes.status === 401 ? 'google_session_expired' : await describeGoogleError(inboxRes.clone())

    return NextResponse.json(
      {
        emails: [],
        source: 'gmail',
        error: reason,
      },
      { status: inboxRes.status }
    )
  }

  const inboxPayload = (await inboxRes.json()) as { messages?: Array<{ id: string; threadId: string }> }
  const messages = inboxPayload.messages ?? []

  if (messages.length === 0) {
    return NextResponse.json({ emails: [], source: 'gmail' })
  }

  const detailResponses = await Promise.all(
    messages.map(async ({ id, threadId }) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        }
      )

      if (!detailRes.ok) return null
      const payload = (await detailRes.json()) as {
        id: string
        threadId: string
        labelIds?: string[]
        snippet?: string
        internalDate?: string
        payload?: { headers?: Array<{ name?: string; value?: string }> }
      }

      const headers = payload.payload?.headers ?? []
      const mailbox = parseMailbox(getHeader(headers, 'From'))
      const subject = getHeader(headers, 'Subject') || '(No subject)'
      const receivedAt = payload.internalDate ? new Date(Number(payload.internalDate)).toISOString() : new Date().toISOString()

      const email: EmailMessage = {
        id: payload.id,
        threadId: payload.threadId ?? threadId,
        from: mailbox.from,
        fromEmail: mailbox.fromEmail,
        subject,
        preview: payload.snippet ?? '',
        receivedAt,
        isRead: !(payload.labelIds ?? []).includes('UNREAD'),
        isImportant: (payload.labelIds ?? []).includes('IMPORTANT'),
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${payload.id}`,
      }

      return email
    })
  )

  const emails = detailResponses
    .filter((item): item is EmailMessage => Boolean(item))
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())

  return NextResponse.json({ emails, source: 'gmail' })
}
