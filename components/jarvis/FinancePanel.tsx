'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { CryptoQuote } from '@/types'

const STORAGE_KEY = 'jarvis.crypto.watchlist'
const symbolToId: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
}

async function fetchCrypto(): Promise<CryptoQuote[]> {
  const res = await fetch('/api/finance?type=crypto')
  if (!res.ok) throw new Error('Failed to load crypto')
  const payload = await res.json()
  return Array.isArray(payload) ? payload : (payload.data ?? [])
}

export function FinancePanel() {
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [symbol, setSymbol] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) setWatchlist(parsed)
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
    }
  }, [watchlist])

  const { data: coins = [], isLoading } = useQuery({
    queryKey: ['crypto-watchlist'],
    queryFn: fetchCrypto,
    refetchInterval: 60_000,
    staleTime: 55_000,
  })

  const visibleCoins = useMemo(() => coins.filter((coin) => watchlist.includes(coin.id)), [coins, watchlist])

  const addCoin = () => {
    const normalized = symbol.trim().toUpperCase()
    const id = symbolToId[normalized]
    if (!id || watchlist.includes(id)) return
    setWatchlist((c) => [...c, id])
    setSymbol('')
  }

  return (
    <>
      {/* Add row */}
      <div className="crypto-add">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') addCoin() }}
          placeholder="Add BTC, ETH, or SOL"
        />
        <button
          onClick={addCoin}
          style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: 'var(--bg)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
        >
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-mute)' }}>Loading market data...</span>
        </div>
      ) : visibleCoins.length === 0 ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span>Your watchlist is empty.</span>
          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Add BTC, ETH, or SOL above.</span>
        </div>
      ) : (
        <div className="crypto-list">
          {visibleCoins.map((coin) => {
            const trend = coin.sparkline_in_7d?.price?.map((value, index) => ({ index, value })) ?? []
            const positive = coin.price_change_percentage_24h >= 0
            return (
              <div key={coin.id} className="crypto-row">
                <div>
                  <div className="crypto-ticker">
                    {coin.symbol.toUpperCase()}
                    <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 6 }}>{coin.name}</span>
                  </div>
                  <div className="crypto-price">
                    ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={positive ? 'crypto-change-pos' : 'crypto-change-neg'}>
                    {positive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}% today
                  </div>
                </div>
                <div style={{ width: 80, height: 36 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <Line type="monotone" dataKey="value" dot={false}
                        stroke={positive ? 'var(--success)' : 'var(--danger)'} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <button
                  className="crypto-del"
                  onClick={() => setWatchlist((c) => c.filter((item) => item !== coin.id))}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
