import { NextRequest, NextResponse } from 'next/server'
import { MOCK_PORTFOLIO_ITEMS } from '@/lib/mockData'
import type { CryptoQuote, StockQuote } from '@/types'

// Fetch crypto prices from CoinGecko (free, no API key)
async function fetchCryptoPrices(ids: string[]): Promise<CryptoQuote[]> {
  const idStr = ids.join(',')
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idStr}&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h`,
    { next: { revalidate: 60 } }
  )

  if (!res.ok) throw new Error('CoinGecko error')
  return res.json()
}

// Fetch stock quote from Alpha Vantage
async function fetchStockQuote(symbol: string, apiKey: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const q = data['Global Quote']
    if (!q || !q['05. price']) return null

    return {
      symbol,
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'crypto'

  if (type === 'crypto') {
    try {
      const cryptos = await fetchCryptoPrices(['bitcoin', 'ethereum', 'solana'])
      return NextResponse.json({ data: cryptos, source: 'coingecko' })
    } catch {
      return NextResponse.json({ data: [], source: 'empty' })
    }
  }

  if (type === 'stock') {
    const symbol = searchParams.get('symbol')
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }

    if (!apiKey) {
      // Mock stock data
      const mock = MOCK_PORTFOLIO_ITEMS.find((p) => p.ticker === symbol)
      return NextResponse.json({
        data: {
          symbol,
          price: mock?.currentPrice ?? 100,
          change: 1.2,
          changePercent: 0.8,
        },
        source: 'mock',
      })
    }

    const quote = await fetchStockQuote(symbol, apiKey)
    if (!quote) {
      return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
    }

    return NextResponse.json({ data: quote, source: 'alphavantage' })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
