'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Plus, TrendingUp } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
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

  const visibleCoins = useMemo(() => {
    return coins.filter((coin) => watchlist.includes(coin.id))
  }, [coins, watchlist])

  const addCoin = () => {
    const normalized = symbol.trim().toUpperCase()
    const id = symbolToId[normalized]
    if (!id || watchlist.includes(id)) return
    setWatchlist((current) => [...current, id])
    setSymbol('')
  }

  return (
    <PanelWrapper
      title="Crypto"
      icon={<TrendingUp size={14} />}
      headerRight={<div className="workspace-badge workspace-badge--info">Live</div>}
      className="h-full"
    >
      {/* add row — always pinned at top */}
      <div className="flex flex-shrink-0 gap-2 pb-2">
        <input
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          onKeyDown={(event) => { if (event.key === 'Enter') addCoin() }}
          className="workspace-input"
          placeholder="Add BTC, ETH, or SOL"
        />
        <button onClick={addCoin} className="workspace-button workspace-button--primary">
          <Plus size={13} />
          Add
        </button>
      </div>

      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="workspace-empty h-full">
            <span>Loading market data...</span>
          </div>
        ) : visibleCoins.length === 0 ? (
          <div className="workspace-empty h-full">
            <TrendingUp size={18} />
            <span>Your watchlist is empty.</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add BTC, ETH, or SOL above.</span>
          </div>
        ) : (
          <div className="workspace-list">
            {visibleCoins.map((coin) => {
              const trend = coin.sparkline_in_7d?.price?.map((value, index) => ({ index, value })) ?? []
              const positive = coin.price_change_percentage_24h >= 0

              return (
                /* single-row card: ~64-72px tall */
                <div key={coin.id} className="workspace-card flex items-center gap-3 px-3 py-2.5">
                  {/* left: ticker + price + change */}
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)' }}>
                      {coin.symbol.toUpperCase()}
                      <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 11, color: 'var(--text-muted)' }}>{coin.name}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>
                      ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: positive ? 'var(--success)' : 'var(--danger)', marginTop: 1 }}>
                      {positive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}% today
                    </div>
                  </div>

                  {/* sparkline */}
                  <div style={{ width: 80, height: 36, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend}>
                        <Line type="monotone" dataKey="value" dot={false} stroke={positive ? '#0f9f6e' : '#dc2626'} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* remove */}
                  <button
                    onClick={() => setWatchlist((current) => current.filter((item) => item !== coin.id))}
                    className="workspace-button"
                    style={{ padding: '5px 9px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PanelWrapper>
  )
}
