import { NextRequest, NextResponse } from 'next/server'
import { MOCK_NEWS } from '@/lib/mockData'
import type { NewsArticle, NewsCategory } from '@/types'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function categorizeArticle(title: string, description: string): NewsCategory {
  const text = (title + ' ' + description).toLowerCase()
  if (text.match(/gpt|claude|gemini|llm|language model|transformer|bert|llama/)) return 'llms'
  if (text.match(/tool|plugin|library|framework|sdk|api|platform|app|software/)) return 'tools'
  if (text.match(/research|paper|study|university|lab|benchmark|dataset|arxiv/)) return 'research'
  return 'all'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = (searchParams.get('category') || 'all') as NewsCategory

  // Try Hacker News Algolia API first (free, no key required)
  try {
    const hnRes = await fetch(
      'https://hn.algolia.com/api/v1/search?tags=story&query=artificial+intelligence+LLM&hitsPerPage=15&numericFilters=created_at_i>1700000000',
      { next: { revalidate: 900 } } // 15 min cache
    )

    if (hnRes.ok) {
      const data = await hnRes.json()
      const articles: NewsArticle[] = data.hits
        .filter((h: Record<string, unknown>) => h.title && h.url)
        .map((h: Record<string, unknown>) => ({
          id: h.objectID as string,
          title: h.title as string,
          source: (h.url as string) ? new URL(h.url as string).hostname.replace('www.', '') : 'Hacker News',
          url: h.url as string,
          publishedAt: h.created_at as string,
          description: `${timeAgo(h.created_at as string)} • ${h.points ?? 0} points • ${h.num_comments ?? 0} comments`,
          category: categorizeArticle(h.title as string, ''),
        }))

      let filtered = articles
      if (category !== 'all') {
        filtered = articles.filter((a) => a.category === category)
        if (filtered.length < 3) filtered = articles // fallback if category has too few
      }

      return NextResponse.json({ articles: filtered.slice(0, 8), source: 'hackernews' })
    }
  } catch {}

  // Try NewsAPI if key is configured
  if (process.env.NEWS_API_KEY) {
    try {
      const query = category === 'llms' ? 'LLM GPT Claude AI' :
        category === 'tools' ? 'AI tools software' :
        category === 'research' ? 'AI research paper' :
        'artificial intelligence'

      const newsRes = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en`,
        {
          headers: { 'X-Api-Key': process.env.NEWS_API_KEY },
          next: { revalidate: 900 },
        }
      )

      if (newsRes.ok) {
        const data = await newsRes.json()
        const articles: NewsArticle[] = data.articles
          .filter((a: Record<string, unknown>) => a.title && a.url && a.title !== '[Removed]')
          .map((a: Record<string, unknown>, i: number) => ({
            id: String(i),
            title: a.title as string,
            source: (a.source as { name?: string })?.name ?? 'News',
            url: a.url as string,
            publishedAt: a.publishedAt as string,
            description: a.description as string ?? '',
            category: categorizeArticle(a.title as string, a.description as string ?? ''),
            imageUrl: a.urlToImage as string ?? null,
          }))

        return NextResponse.json({ articles, source: 'newsapi' })
      }
    } catch {}
  }

  // Return mock data
  let filtered = MOCK_NEWS
  if (category !== 'all') {
    filtered = MOCK_NEWS.filter((a) => a.category === category)
    if (filtered.length < 2) filtered = MOCK_NEWS
  }

  return NextResponse.json({ articles: filtered, source: 'mock' })
}
