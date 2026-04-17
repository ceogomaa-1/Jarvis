import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getRefreshTokenFromUserMetadata(
  cookieStore: ReturnType<typeof cookies>
): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const token = user?.user_metadata?.google_refresh_token
    return typeof token === 'string' && token ? token : null
  } catch { return null }
}

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const d = (await res.json()) as { access_token?: string }
  return d.access_token ?? null
}

async function fetchEvents(accessToken: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
}

export async function GET() {
  const cookieStore = cookies()
  let accessToken = cookieStore.get('jarvis_google_provider_token')?.value ?? ''
  let refreshToken = cookieStore.get('jarvis_google_provider_refresh_token')?.value ?? ''

  if (!refreshToken) {
    refreshToken = (await getRefreshTokenFromUserMetadata(cookieStore)) ?? ''
  }

  // Fetch events from 7 days ago through 90 days ahead
  const timeMin = new Date()
  timeMin.setDate(timeMin.getDate() - 7)
  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + 90)

  let res = accessToken ? await fetchEvents(accessToken, timeMin.toISOString(), timeMax.toISOString()) : null

  // Token expired — refresh
  if ((!res || res.status === 401) && refreshToken) {
    const newToken = await refreshGoogleToken(refreshToken)
    if (newToken) {
      accessToken = newToken
      cookieStore.set('jarvis_google_provider_token', newToken, {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 3600,
      })
      res = await fetchEvents(accessToken, timeMin.toISOString(), timeMax.toISOString())
    }
  }

  if (!accessToken || !res) {
    return NextResponse.json({ events: [], error: 'missing_token' }, { status: 401 })
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return NextResponse.json(
      { events: [], error: errBody?.error?.message ?? `calendar_error:${res.status}` },
      { status: res.status }
    )
  }

  const data = (await res.json()) as { items?: unknown[] }
  return NextResponse.json({ events: data.items ?? [] })
}
