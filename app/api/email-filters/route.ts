import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('email_filters')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const defaultKeywords = ['invoice', 'meeting', 'urgent', 'client', 'deployment', 'payment', 'contract', 'project']
  return NextResponse.json({
    keywords: (data?.keywords as string[]) ?? defaultKeywords,
    filter_enabled: data?.filter_enabled ?? false,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { keywords, filter_enabled } = body as { keywords?: string[]; filter_enabled?: boolean }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (keywords !== undefined) updates.keywords = keywords
  if (filter_enabled !== undefined) updates.filter_enabled = filter_enabled

  const { data, error } = await supabase
    .from('email_filters')
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ filter: data })
}
