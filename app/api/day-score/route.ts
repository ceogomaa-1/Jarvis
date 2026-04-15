import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const from = sevenDaysAgo.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('day_scores')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scores: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { score, note, date } = body as { score: number; note?: string; date?: string }

  if (!score || score < 1 || score > 10) {
    return NextResponse.json({ error: 'Score must be 1-10' }, { status: 400 })
  }

  const today = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('day_scores')
    .upsert(
      { user_id: user.id, score, note: note ?? null, date: today },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ score: data })
}
