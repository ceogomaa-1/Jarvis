import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { FinanceChatMessage, FinanceProfile, FinanceGoal } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(profile: FinanceProfile | null, goals: FinanceGoal[]): string {
  const lines: string[] = [
    'You are a sharp, no-BS personal finance advisor integrated into the user\'s JARVIS dashboard.',
    'You have access to their full financial profile. Be specific with numbers. Give actionable advice.',
    'Never be vague. Address the user directly.',
    '',
  ]

  if (profile) {
    const monthlyIncome =
      profile.income_frequency === 'weekly'
        ? profile.income * 52 / 12
        : profile.income_frequency === 'biweekly'
        ? profile.income * 26 / 12
        : profile.income

    const totalExpenses = profile.expenses.reduce((sum, e) => sum + e.amount, 0)
    const surplus = monthlyIncome - totalExpenses

    lines.push(`USER FINANCIAL PROFILE:`)
    lines.push(`- Income: $${profile.income} ${profile.income_frequency} ($${monthlyIncome.toFixed(0)}/mo)`)
    lines.push(`- Monthly expenses: $${totalExpenses.toFixed(0)}`)
    lines.push(`- Monthly surplus: $${surplus.toFixed(0)}`)

    if (profile.expenses.length > 0) {
      lines.push(`- Expense breakdown:`)
      profile.expenses.forEach((e) => {
        lines.push(`  • ${e.name} (${e.category}): $${e.amount}/mo`)
      })
    }

    if (goals.length > 0) {
      lines.push(`- Savings goals:`)
      goals.forEach((g) => {
        const remaining = g.target_amount - g.current_saved
        const monthsToGoal = surplus > 0 ? (remaining / surplus).toFixed(1) : '∞'
        lines.push(
          `  • ${g.name}: $${g.current_saved}/$${g.target_amount} saved` +
          (g.deadline ? `, deadline: ${g.deadline}` : '') +
          `, ~${monthsToGoal} months to reach at current rate`
        )
      })
    }
  } else {
    lines.push('Note: No financial profile has been set up yet. Encourage the user to set up their profile first.')
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_anthropic_key' }, { status: 503 })
  }

  let body: {
    messages: FinanceChatMessage[]
    profile: FinanceProfile | null
    goals: FinanceGoal[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { messages = [], profile = null, goals = [] } = body

  const systemPrompt = buildSystemPrompt(profile, goals)

  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
