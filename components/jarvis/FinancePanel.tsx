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
      icon={<TrendingUp size={16} />}
      headerRight={<div className="workspace-badge workspace-badge--info">Live</div>}
      className="h-full"
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex gap-2">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addCoin()
            }}
            className="workspace-input"
            placeholder="Add BTC, ETH, or SOL"
          />
          <button onClick={addCoin} className="workspace-button workspace-button--primary">
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="workspace-empty">
              <span>Loading market data...</span>
            </div>
          ) : visibleCoins.length === 0 ? (
            <div className="workspace-empty">
              <TrendingUp size={20} />
              <span>Your crypto watchlist is empty.</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Add BTC, ETH, or SOL to build a clean little market view.
              </span>
            </div>
          ) : (
            <div className="workspace-list">
              {visibleCoins.map((coin) => {
                const trend = coin.sparkline_in_7d?.price?.map((value, index) => ({ index, value })) ?? []
                const positive = coin.price_change_percentage_24h >= 0

                return (
                  <div key={coin.id} className="workspace-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>
                          {coin.symbol.toUpperCase()}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>
                          ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            color: positive ? 'var(--success)' : 'var(--danger)',
                          }}
                        >
                          {positive ? '+' : ''}
                          {coin.price_change_percentage_24h.toFixed(2)}% today
                        </div>
                      </div>

                      <div style={{ width: 120, height: 54 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trend}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              dot={false}
                              stroke={positive ? '#0f9f6e' : '#dc2626'}
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{coin.name}</span>
                      <button
                        onClick={() => setWatchlist((current) => current.filter((item) => item !== coin.id))}
                        className="workspace-button"
                        style={{ padding: '8px 12px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
