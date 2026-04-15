import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'missing_anthropic_key' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { date, tasksCount, topTask, nextEvent, btcPrice, btcChange, topHeadline } = body as {
    date?: string
    tasksCount?: number
    topTask?: string
    nextEvent?: string
    btcPrice?: string
    btcChange?: string
    topHeadline?: string
  }

  const contextParts: string[] = []
  if (date) contextParts.push(`Date: ${date}`)
  if (tasksCount !== undefined) contextParts.push(`Tasks open: ${tasksCount}`)
  if (topTask) contextParts.push(`Top priority task: "${topTask}"`)
  if (nextEvent) contextParts.push(`Next calendar event: ${nextEvent}`)
  if (btcPrice) contextParts.push(`BTC price: $${btcPrice} (${btcChange || '?'}% 24h)`)
  if (topHeadline) contextParts.push(`Top news: "${topHeadline}"`)

  const userPrompt = `Give me a sharp 3-sentence morning briefing based on this data: ${contextParts.join('. ')}. Start with the most important thing I need to do today. End with one motivating line.`

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: 'You are JARVIS, a personal AI assistant. Be concise, direct, and smart. No fluff.',
      messages: [{ role: 'user', content: userPrompt }],
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
