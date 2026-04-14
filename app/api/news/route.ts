import { NextRequest, NextResponse } from 'next/server'
import type { NewsArticle, NewsCategory } from '@/types'

export const dynamic = 'force-dynamic'

const CATEGORY_QUERIES: Record<NewsCategory, string[]> = {
  all: ['artificial intelligence', 'machine learning', 'AI tools'],
  llms: ['llm', 'gpt', 'claude', 'gemini', 'llama'],
  tools: ['AI tool', 'AI product', 'AI app', 'AI SDK'],
  research: ['AI research', 'AI paper', 'AI benchmark', 'AI model'],
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function categorizeArticle(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase()
  if (text.match(/gpt|claude|gemini|llm|language model|transformer|bert|llama|openai|anthropic/)) return 'llms'
  if (text.match(/tool|plugin|library|framework|sdk|api|platform|app|software|copilot|agent/)) return 'tools'
  if (text.match(/research|paper|study|university|lab|benchmark|dataset|arxiv/)) return 'research'
  return 'all'
}

function scoreArticle(article: NewsArticle) {
  const ageHours = Math.max(1, (Date.now() - new Date(article.publishedAt).getTime()) / 36e5)
  const recencyScore = 36 / ageHours
  const socialBoost =
    article.source.toLowerCase().includes('reddit') || article.source.toLowerCase().includes('x')
      ? 4
      : 0
  const titleBoost = /breaking|launch|release|raises|ship|benchmark|open-source|announces/i.test(article.title) ? 3 : 0

  return recencyScore + socialBoost + titleBoost
}

function normalizeCategory(articles: NewsArticle[], category: NewsCategory) {
  if (category === 'all') return articles

  const filtered = articles.filter((article) => article.category === category)
  return filtered.length >= 6 ? filtered : articles
}

async function fetchHackerNews(category: NewsCategory) {
  const query = CATEGORY_QUERIES[category].join(' OR ')
  const response = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=18&query=${encodeURIComponent(query)}`,
    { next: { revalidate: 900 } }
  )

  if (!response.ok) return []
  const payload = (await response.json()) as {
    hits?: Array<Record<string, unknown>>
  }

  return (payload.hits ?? [])
    .filter((hit) => hit.title && hit.url)
    .map(
      (hit): NewsArticle => ({
        id: `hn-${String(hit.objectID)}`,
        title: String(hit.title),
        source: (hit.url as string) ? new URL(String(hit.url)).hostname.replace('www.', '') : 'Hacker News',
        url: String(hit.url),
        publishedAt: String(hit.created_at),
        description: `${timeAgo(String(hit.created_at))} • ${hit.points ?? 0} points • ${hit.num_comments ?? 0} comments`,
        category: categorizeArticle(String(hit.title), ''),
      })
    )
}

async function fetchReddit(category: NewsCategory) {
  const query = CATEGORY_QUERIES[category].join(' OR ')
  const response = await fetch(
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=hot&t=day&limit=24`,
    {
      headers: {
        'User-Agent': 'jarvis-dashboard/1.0',
      },
      next: { revalidate: 900 },
    }
  )

  if (!response.ok) return []
  const payload = (await response.json()) as {
    data?: {
      children?: Array<{
        data?: {
          id?: string
          title?: string
          permalink?: string
          created_utc?: number
          subreddit_name_prefixed?: string
          selftext?: string
          score?: number
          num_comments?: number
        }
      }>
    }
  }

  return (payload.data?.children ?? [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.id && post.title && post.permalink))
    .map(
      (post): NewsArticle => ({
        id: `reddit-${post.id}`,
        title: post.title ?? 'Reddit discussion',
        source: post.subreddit_name_prefixed ?? 'Reddit',
        url: `https://www.reddit.com${post.permalink}`,
        publishedAt: new Date((post.created_utc ?? 0) * 1000).toISOString(),
        description: `${timeAgo(new Date((post.created_utc ?? 0) * 1000).toISOString())} • ${post.score ?? 0} upvotes • ${post.num_comments ?? 0} comments`,
        category: categorizeArticle(post.title ?? '', post.selftext ?? ''),
      })
    )
}

async function fetchX(category: NewsCategory) {
  const bearerToken = process.env.X_BEARER_TOKEN

  if (!bearerToken) return []

  const query = CATEGORY_QUERIES[category].map((term) => `"${term}"`).join(' OR ')
  const params = new URLSearchParams({
    query: `(${query}) lang:en -is:retweet`,
    max_results: '15',
    'tweet.fields': 'created_at,public_metrics',
    expansions: 'author_id',
    'user.fields': 'name,username',
  })

  const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    next: { revalidate: 900 },
  })

  if (!response.ok) return []

  const payload = (await response.json()) as {
    data?: Array<{
      id: string
      text: string
      created_at: string
      author_id?: string
      public_metrics?: { like_count?: number; retweet_count?: number }
    }>
    includes?: {
      users?: Array<{ id: string; name?: string; username?: string }>
    }
  }

  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]))

  return (payload.data ?? []).map((tweet) => {
    const author = tweet.author_id ? users.get(tweet.author_id) : null
    const title = tweet.text.replace(/\s+/g, ' ').trim()

    return {
      id: `x-${tweet.id}`,
      title: title.length > 160 ? `${title.slice(0, 157)}...` : title,
      source: author?.username ? `X · @${author.username}` : 'X',
      url: author?.username ? `https://x.com/${author.username}/status/${tweet.id}` : `https://x.com/i/web/status/${tweet.id}`,
      publishedAt: tweet.created_at,
      description: `${timeAgo(tweet.created_at)} • ${tweet.public_metrics?.like_count ?? 0} likes • ${tweet.public_metrics?.retweet_count ?? 0} reposts`,
      category: categorizeArticle(tweet.text, ''),
    } satisfies NewsArticle
  })
}

async function fetchNewsApi(category: NewsCategory) {
  if (!process.env.NEWS_API_KEY) return []

  const query = CATEGORY_QUERIES[category].join(' OR ')
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=18&language=en`,
    {
      headers: { 'X-Api-Key': process.env.NEWS_API_KEY },
      next: { revalidate: 900 },
    }
  )

  if (!response.ok) return []

  const payload = (await response.json()) as {
    articles?: Array<Record<string, unknown>>
  }

  return (payload.articles ?? [])
    .filter((article) => article.title && article.url && article.title !== '[Removed]')
    .map(
      (article, index): NewsArticle => ({
        id: `newsapi-${index}-${String(article.url)}`,
        title: String(article.title),
        source: ((article.source as { name?: string } | undefined)?.name ?? 'News').replace('www.', ''),
        url: String(article.url),
        publishedAt: String(article.publishedAt),
        description: (article.description as string | null | undefined) ?? '',
        category: categorizeArticle(String(article.title), String(article.description ?? '')),
        imageUrl: (article.urlToImage as string | null | undefined) ?? null,
      })
    )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedCategory = searchParams.get('category')
  const category: NewsCategory =
    requestedCategory === 'llms' || requestedCategory === 'tools' || requestedCategory === 'research' ? requestedCategory : 'all'

  const results = await Promise.allSettled([
    fetchHackerNews(category),
    fetchReddit(category),
    fetchX(category),
    fetchNewsApi(category),
  ])

  const merged = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))

  const deduped = Array.from(
    new Map(
      merged.map((article) => [
        article.url.toLowerCase(),
        {
          ...article,
          description: article.description ?? '',
        },
      ])
    ).values()
  )

  const ranked = normalizeCategory(deduped, category)
    .sort((a, b) => scoreArticle(b) - scoreArticle(a))
    .slice(0, 20)

  return NextResponse.json({
    articles: ranked,
    sources: {
      hackerNews: results[0].status === 'fulfilled',
      reddit: results[1].status === 'fulfilled',
      x: results[2].status === 'fulfilled' && Boolean(process.env.X_BEARER_TOKEN),
      newsApi: results[3].status === 'fulfilled' && Boolean(process.env.NEWS_API_KEY),
    },
  })
}
