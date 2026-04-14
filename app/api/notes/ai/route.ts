import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Return mock suggestions when API key not configured
    return NextResponse.json({
      suggestions: [
        { type: 'idea', content: 'Consider breaking this into smaller, actionable sub-tasks.' },
        { type: 'next_step', content: 'Research existing solutions before implementing from scratch.' },
        { type: 'related_topic', content: 'System design patterns that could apply here: CQRS, Event Sourcing.' },
        { type: 'question', content: 'What are the core constraints or requirements you haven\'t listed yet?' },
        { type: 'idea', content: 'A prototype in 1-2 hours could validate the core assumption quickly.' },
      ],
      source: 'mock',
    })
  }

  try {
    const { content, title } = await request.json()

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey })

    const noteText = typeof content === 'string'
      ? content
      : JSON.stringify(content).replace(/"text":"([^"]+)"/g, '$1').replace(/[{}"]/g, ' ')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are JARVIS, an AI assistant for a personal command center. A user has a note and wants intelligent suggestions.

Note title: "${title || 'Untitled'}"
Note content: "${noteText.substring(0, 2000)}"

Provide 5 helpful suggestions as JSON. Return ONLY valid JSON, no markdown:
{
  "suggestions": [
    {"type": "idea", "content": "..."},
    {"type": "next_step", "content": "..."},
    {"type": "related_topic", "content": "..."},
    {"type": "question", "content": "..."},
    {"type": "idea", "content": "..."}
  ]
}

Types: "idea" (creative angle), "next_step" (concrete action), "related_topic" (related concept/resource), "question" (clarifying question to sharpen thinking).
Be specific and actionable. No generic advice.`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(responseText)

    return NextResponse.json({ ...parsed, source: 'claude' })
  } catch (err) {
    console.error('AI suggestions error:', err)
    return NextResponse.json({
      suggestions: [
        { type: 'idea', content: 'Break this down into smaller, testable components.' },
        { type: 'next_step', content: 'Define a clear success criterion for this work.' },
        { type: 'related_topic', content: 'Review prior art before committing to this approach.' },
        { type: 'question', content: 'Who else should be looped in on this decision?' },
        { type: 'idea', content: 'Build the simplest version first, then iterate.' },
      ],
      source: 'fallback',
    })
  }
}
