'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Plus, X, RefreshCw, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import {
  MOCK_CRYPTO,
  MOCK_PORTFOLIO_ITEMS,
  MOCK_NET_WORTH_HISTORY,
} from '@/lib/mockData'
import type { CryptoQuote } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return formatUSD(value)
}

/** Map sparkline prices (7 points) to an inline SVG polyline string */
function buildSparklinePath(prices: number[], width = 72, height = 24): string {
  if (!prices || prices.length < 2) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const step = width / (prices.length - 1)
  const points = prices.map((p, i) => {
    const x = i * step
    const y = height - ((p - min) / range) * (height - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M${points.join(' L')}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ChangeChipProps {
  pct: number
  size?: 'sm' | 'md'
}

function ChangeChip({ pct, size = 'sm' }: ChangeChipProps) {
  const positive = pct >= 0
  const color = positive ? '#00FF88' : '#FF3B5C'
  const glow = positive
    ? '0 0 6px rgba(0,255,136,0.5)'
    : '0 0 6px rgba(255,59,92,0.5)'
  const arrow = positive ? '▲' : '▼'
  const textSize = size === 'md' ? 'text-sm' : 'text-[10px]'

  return (
    <span
      className={`font-mono font-semibold ${textSize} tabular-nums`}
      style={{ color, textShadow: glow }}
    >
      {arrow} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

interface SparklineProps {
  prices: number[]
  positive: boolean
  width?: number
  height?: number
}

function Sparkline({ prices, positive, width = 72, height = 24 }: SparklineProps) {
  const path = buildSparklinePath(prices, width, height)
  const color = positive ? '#00FF88' : '#FF3B5C'
  const glow = positive ? 'rgba(0,255,136,0.4)' : 'rgba(255,59,92,0.4)'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <filter id={`sg-${positive ? 'pos' : 'neg'}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Glow layer */}
      <path
        d={path}
        stroke={glow}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#sg-${positive ? 'pos' : 'neg'})`}
      />
      {/* Main line */}
      <path
        d={path}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface CryptoCardProps {
  coin: CryptoQuote
}

function CryptoCard({ coin }: CryptoCardProps) {
  const positive = coin.price_change_percentage_24h >= 0
  const color = positive ? '#00FF88' : '#FF3B5C'
  const borderGlow = positive ? 'rgba(0,255,136,0.15)' : 'rgba(255,59,92,0.15)'
  const prices = coin.sparkline_in_7d?.price ?? []

  return (
    <motion.div
      className="flex items-center justify-between rounded-sm px-3 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${borderGlow}`,
      }}
      whileHover={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: color + '40',
        transition: { duration: 0.15 },
      }}
    >
      {/* Left: name + symbol */}
      <div className="flex flex-col gap-0.5 min-w-[52px]">
        <span className="font-hud text-[10px] tracking-widest text-white/40 uppercase">
          {coin.symbol}
        </span>
        <span className="text-[11px] text-white/60 truncate max-w-[64px]">
          {coin.name}
        </span>
      </div>

      {/* Center: sparkline */}
      <div className="mx-2 flex-shrink-0">
        <Sparkline prices={prices} positive={positive} />
      </div>

      {/* Right: price + change */}
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="font-mono font-bold text-sm tabular-nums"
          style={{
            color: '#F8FAFC',
            textShadow: `0 0 8px ${color}40`,
          }}
        >
          {formatUSD(coin.current_price)}
        </span>
        <ChangeChip pct={coin.price_change_percentage_24h} />
      </div>
    </motion.div>
  )
}

// ─── Countdown Timer Hook ────────────────────────────────────────────────────

function useCountdown(seconds: number) {
  const [count, setCount] = useState(seconds)

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => (c <= 1 ? seconds : c - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [seconds])

  return count
}

// ─── Custom Recharts Tooltip ─────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function NetWorthTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-[10px] font-mono px-2 py-1 rounded-sm"
      style={{
        background: 'rgba(13,17,23,0.95)',
        border: '1px solid rgba(0,212,255,0.3)',
        color: '#00D4FF',
      }}
    >
      <div className="text-white/40">{label}</div>
      <div>{formatCompact(payload[0].value)}</div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinancePanel() {
  const countdown = useCountdown(60)
  const [showAddTicker, setShowAddTicker] = useState(false)
  const [newTicker, setNewTicker] = useState('')

  // Real API data via React Query — falls back to MOCK_CRYPTO when API is unavailable
  const { data: cryptoData } = useQuery<CryptoQuote[]>({
    queryKey: ['finance', 'crypto'],
    queryFn: async () => {
      const res = await fetch('/api/finance?type=crypto')
      if (!res.ok) throw new Error('Finance API error')
      return res.json()
    },
    refetchInterval: 60_000,
    // NOTE: real API data from react-query; MOCK_CRYPTO used as initial/fallback
    initialData: MOCK_CRYPTO,
    staleTime: 55_000,
  })

  // Use live data when available, else fall back to mock
  const cryptoList: CryptoQuote[] = cryptoData ?? MOCK_CRYPTO

  // Portfolio items (stocks + manual — wired to mock; extend with real API later)
  const portfolio = MOCK_PORTFOLIO_ITEMS

  // Derive total portfolio value
  const totalValue = portfolio.reduce((sum, item) => sum + (item.totalValue ?? 0), 0)

  // Stock/manual items only (crypto is shown separately above)
  const stockItems = portfolio.filter((p) => p.type === 'stock')
  const bankItem = portfolio.find((p) => p.type === 'manual')

  // Net worth chart data
  const chartData = MOCK_NET_WORTH_HISTORY.map((snap) => ({
    date: snap.snapshot_date.slice(5), // MM-DD
    value: snap.total_value,
  }))

  const handleAddTicker = useCallback(() => {
    // UI-only: no backend wiring yet
    setNewTicker('')
    setShowAddTicker(false)
  }, [])

  // ── Header right slot ──
  const headerRight = (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-xs font-bold tabular-nums"
        style={{ color: '#FFB830', textShadow: '0 0 8px rgba(255,184,48,0.6)' }}
      >
        {formatCompact(totalValue)}
      </span>
      <div className="flex items-center gap-1 text-white/30">
        <RefreshCw size={10} className="opacity-60" />
        <span className="font-mono text-[10px] tabular-nums">
          {countdown}s
        </span>
      </div>
    </div>
  )

  return (
    <PanelWrapper
      title="NET WORTH"
      icon={<TrendingUp size={13} />}
      amber
      headerRight={headerRight}
      className="h-full"
    >
      <div className="flex flex-col gap-3 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-0.5">

        {/* ── Total Portfolio Value ── */}
        <div className="flex flex-col items-center pt-1 pb-2">
          <span className="font-hud text-[10px] tracking-[0.2em] text-white/30 uppercase mb-1">
            Total Portfolio Value
          </span>
          <motion.span
            key={totalValue}
            initial={{ opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="font-orbitron text-2xl font-black tabular-nums"
            style={{
              color: '#FFB830',
              textShadow:
                '0 0 20px rgba(255,184,48,0.7), 0 0 40px rgba(255,184,48,0.3)',
              letterSpacing: '0.05em',
            }}
          >
            {formatUSD(totalValue)}
          </motion.span>
        </div>

        {/* ── Net Worth Trend Chart ── */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: 'rgba(0,212,255,0.025)',
            border: '1px solid rgba(0,212,255,0.12)',
            height: 120,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                content={<NetWorthTooltip />}
                cursor={{ stroke: 'rgba(0,212,255,0.3)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00D4FF"
                strokeWidth={1.5}
                fill="url(#netWorthGrad)"
                dot={false}
                activeDot={{
                  r: 3,
                  fill: '#00D4FF',
                  stroke: 'rgba(0,212,255,0.5)',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Crypto Section ── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-hud text-[10px] tracking-[0.18em] text-white/30 uppercase">
              Crypto
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {cryptoList.map((coin) => (
            <CryptoCard key={coin.id} coin={coin} />
          ))}
        </div>

        {/* ── Stocks Section ── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-hud text-[10px] tracking-[0.18em] text-white/30 uppercase">
              Stocks
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {stockItems.map((item) => {
            const positive = (item.change24h ?? 0) >= 0
            const color = positive ? '#00FF88' : '#FF3B5C'
            const borderGlow = positive
              ? 'rgba(0,255,136,0.15)'
              : 'rgba(255,59,92,0.15)'
            const prices = item.sparkline ?? []

            return (
              <motion.div
                key={item.id}
                className="flex items-center justify-between rounded-sm px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: `1px solid ${borderGlow}`,
                }}
                whileHover={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: color + '40',
                  transition: { duration: 0.15 },
                }}
              >
                {/* Left: ticker + name */}
                <div className="flex flex-col gap-0.5 min-w-[52px]">
                  <span className="font-hud text-[10px] tracking-widest text-white/40 uppercase">
                    {item.ticker}
                  </span>
                  <span className="text-[11px] text-white/50 truncate max-w-[72px]">
                    {item.name}
                  </span>
                </div>

                {/* Center: sparkline */}
                <div className="mx-2 flex-shrink-0">
                  <Sparkline prices={prices} positive={positive} />
                </div>

                {/* Right: price / change / total */}
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-xs font-bold tabular-nums"
                      style={{ color: '#F8FAFC' }}
                    >
                      {formatUSD(item.currentPrice ?? 0)}
                    </span>
                    <ChangeChip pct={item.change24h ?? 0} />
                  </div>
                  <span className="font-mono text-[10px] text-white/40 tabular-nums">
                    {formatUSD(item.totalValue ?? 0)}{' '}
                    <span className="text-white/25">
                      ×{item.quantity}
                    </span>
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ── Bank / Manual Entry ── */}
        {bankItem && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-hud text-[10px] tracking-[0.18em] text-white/30 uppercase">
                Bank
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="font-hud text-[10px] tracking-widest text-white/20 uppercase">
                Manual
              </span>
            </div>

            <motion.div
              className="flex items-center justify-between rounded-sm px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,184,48,0.12)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,184,48,0.25)',
                transition: { duration: 0.15 },
              }}
            >
              <div className="flex items-center gap-2">
                <Building2 size={14} className="opacity-40" style={{ color: '#FFB830' }} />
                <div className="flex flex-col gap-0.5">
                  <span className="font-hud text-[10px] tracking-widest text-white/40 uppercase">
                    {bankItem.ticker}
                  </span>
                  <span className="text-[11px] text-white/50">
                    {bankItem.name}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="font-mono text-sm font-bold tabular-nums"
                  style={{ color: '#FFB830', textShadow: '0 0 8px rgba(255,184,48,0.4)' }}
                >
                  {formatUSD(bankItem.manual_value ?? bankItem.totalValue ?? 0)}
                </span>
                <span className="font-mono text-[10px] text-white/25">
                  manual entry
                </span>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Add Ticker ── */}
        <div className="mt-auto pt-1">
          <AnimatePresence mode="wait">
            {!showAddTicker ? (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddTicker(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-sm text-[11px] font-hud tracking-[0.15em] uppercase transition-all"
                style={{
                  background: 'rgba(255,184,48,0.05)',
                  border: '1px dashed rgba(255,184,48,0.25)',
                  color: 'rgba(255,184,48,0.6)',
                }}
                whileHover={{
                  background: 'rgba(255,184,48,0.1)',
                  borderColor: 'rgba(255,184,48,0.5)',
                  color: '#FFB830',
                  transition: { duration: 0.15 },
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={11} />
                Add Ticker
              </motion.button>
            ) : (
              <motion.div
                key="add-form"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTicker()
                    if (e.key === 'Escape') setShowAddTicker(false)
                  }}
                  placeholder="BTC, AAPL, ETH…"
                  maxLength={10}
                  className="flex-1 rounded-sm px-3 py-2 font-mono text-xs uppercase tracking-widest bg-transparent outline-none placeholder:text-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,184,48,0.35)',
                    color: '#FFB830',
                    caretColor: '#FFB830',
                  }}
                />
                <button
                  onClick={handleAddTicker}
                  disabled={!newTicker.trim()}
                  className="px-3 py-2 rounded-sm font-hud text-[11px] tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{
                    background: 'rgba(255,184,48,0.15)',
                    border: '1px solid rgba(255,184,48,0.4)',
                    color: '#FFB830',
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddTicker(false); setNewTicker('') }}
                  className="px-2 py-2 rounded-sm text-white/30 hover:text-white/60 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </PanelWrapper>
  )
}
