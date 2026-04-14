import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        providerToken?: string
        providerRefreshToken?: string
      }
    | null

  const providerToken = body?.providerToken?.trim()
  const providerRefreshToken = body?.providerRefreshToken?.trim()

  if (!providerToken && !providerRefreshToken) {
    return NextResponse.json({ ok: false, error: 'missing_tokens' }, { status: 400 })
  }

  const cookieStore = cookies()

  if (providerToken) {
    cookieStore.set('jarvis_google_provider_token', providerToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60,
    })
  }

  if (providerRefreshToken) {
    cookieStore.set('jarvis_google_provider_refresh_token', providerRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    // Also persist to user metadata so it survives cookie expiry
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (user?.id) {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: { google_refresh_token: providerRefreshToken },
        }).catch(() => null)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
