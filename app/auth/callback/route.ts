import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  const cookieStore = cookies()

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            })
          },
        },
      }
    )

    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const providerToken = data.session?.provider_token
    const providerRefreshToken = data.session?.provider_refresh_token
    const userId = data.session?.user?.id

    if (providerToken) {
      response.cookies.set('jarvis_google_provider_token', providerToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60,
      })
    }

    if (providerRefreshToken) {
      response.cookies.set('jarvis_google_provider_refresh_token', providerRefreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      // Persist refresh token to user metadata so it survives cookie expiry
      if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { google_refresh_token: providerRefreshToken },
        }).catch(() => null)
      }
    }
  }

  return response
}
