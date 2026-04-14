'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

import { HUDTopBar } from '@/components/jarvis/HUDTopBar'
import { NewsPanel } from '@/components/jarvis/NewsPanel'
import { FinancePanel } from '@/components/jarvis/FinancePanel'
import { TasksPanel } from '@/components/jarvis/TasksPanel'
import { NotesPanel } from '@/components/jarvis/NotesPanel'
import { CalendarPanel } from '@/components/jarvis/CalendarPanel'
import { EmailPanel } from '@/components/jarvis/EmailPanel'

interface UserInfo {
  id: string
  email: string
  name?: string
  avatar?: string
}

const INIT_STEPS = [
  'Establishing secure neural link...',
  'Loading mission intelligence...',
  'Synchronizing data streams...',
  'Calibrating command interface...',
  'Systems nominal. Welcome back.',
]

function InitializingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((s) => {
        if (s >= INIT_STEPS.length - 1) {
          clearInterval(stepInterval)
          setTimeout(onDone, 500)
          return s
        }
        return s + 1
      })
    }, 380)

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100))
    }, 38)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#080A0F' }}>
      <div className="hud-bg" />
      <div className="relative z-10 text-center max-w-md w-full px-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="font-display font-black tracking-[0.2em] glow-cyan text-cyan"
            style={{ fontSize: 48, textShadow: '0 0 30px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)' }}>
            JARVIS
          </div>
          <div className="font-hud text-xs tracking-[0.3em] text-secondary uppercase mt-1 opacity-60">
            Initializing Command Center
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="relative h-0.5 w-full rounded-full overflow-hidden mb-6"
          style={{ background: 'rgba(0,212,255,0.1)' }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #00D4FF, #40E0FF)',
              boxShadow: '0 0 10px #00D4FF',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>

        {/* Boot steps */}
        <div className="space-y-1.5 text-left">
          {INIT_STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= step ? 1 : 0.15, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="font-mono text-xs"
                style={{ color: i < step ? '#00FF88' : i === step ? '#00D4FF' : '#3D5A6B' }}>
                {i < step ? '✓' : i === step ? '▶' : '○'}
              </span>
              <span className="font-mono text-xs"
                style={{ color: i === step ? '#00D4FF' : i < step ? '#3D5A6B' : '#1a2a35' }}>
                {s}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 font-hud text-xs tracking-widest opacity-25"
          style={{ color: '#00D4FF' }}>
          {progress}% COMPLETE
        </motion.div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [showScanLine, setShowScanLine] = useState(false)
  const router = useRouter()
  const hasInitRun = useRef(false)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Check auth
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
        return
      }
      const u = data.session.user
      const meta = u.user_metadata
      setUser({
        id: u.id,
        email: u.email ?? '',
        name: meta?.full_name ?? meta?.name ?? undefined,
        avatar: meta?.avatar_url ?? meta?.picture ?? undefined,
      })
      setIsLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') router.push('/login')
        if (session) {
          const u = session.user
          const meta = u.user_metadata
          setUser({
            id: u.id,
            email: u.email ?? '',
            name: meta?.full_name ?? meta?.name ?? undefined,
            avatar: meta?.avatar_url ?? meta?.picture ?? undefined,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const handleInitDone = () => {
    setIsInitializing(false)
    setShowScanLine(true)
    setTimeout(() => setShowScanLine(false), 2500)
  }

  // For demo/development: skip auth check if no Supabase configured
  const skipAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'

  if (skipAuth && isLoading) {
    // Set a mock user for development
    setTimeout(() => {
      setUser({ id: 'dev', email: 'commander@jarvis.local', name: 'Commander' })
      setIsLoading(false)
    }, 0)
  }

  if (isLoading && !skipAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080A0F' }}>
        <div className="hud-bg" />
        <div className="relative z-10 font-display text-cyan text-xl tracking-widest animate-pulse glow-cyan">
          LOADING...
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Initialization screen */}
      <AnimatePresence>
        {isInitializing && !hasInitRun.current && (
          <motion.div
            key="init"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <InitializingScreen onDone={() => {
              hasInitRun.current = true
              handleInitDone()
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD scan line effect */}
      {showScanLine && (
        <div className="scan-line" style={{ zIndex: 9998 }} />
      )}

      {/* Main dashboard */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isInitializing ? 0 : 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="min-h-screen flex flex-col"
        style={{ background: '#080A0F' }}
      >
        {/* Background layers */}
        <div className="hud-bg" />
        <div className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 65%)',
            zIndex: 0,
          }}
        />

        {/* Top Status Bar */}
        <div className="relative z-20 shrink-0">
          <HUDTopBar
            userEmail={user?.email}
            userName={user?.name}
            userAvatar={user?.avatar}
          />
        </div>

        {/* Dashboard Grid */}
        <main className="relative z-10 flex-1 p-3 overflow-auto"
          style={{ minHeight: 0 }}>
          {/*
            Grid layout:
            Row 1: [NEWS — 4 cols] [FINANCE — 4 cols] [EMAIL — 4 cols]
            Row 2: [TASKS — 3 cols] [NOTES — 5 cols] [CALENDAR — 4 cols]
          */}
          <div className="grid gap-3 h-full"
            style={{
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridTemplateRows: 'minmax(380px, 1fr) minmax(420px, 1fr)',
              minHeight: 'calc(100vh - 56px - 24px)',
            }}>

            {/* Row 1 */}
            <div style={{ gridColumn: '1 / 5' }}>
              <NewsPanel />
            </div>

            <div style={{ gridColumn: '5 / 9' }}>
              <FinancePanel />
            </div>

            <div style={{ gridColumn: '9 / 13' }}>
              <EmailPanel />
            </div>

            {/* Row 2 */}
            <div style={{ gridColumn: '1 / 4' }}>
              <TasksPanel />
            </div>

            <div style={{ gridColumn: '4 / 9' }}>
              <NotesPanel />
            </div>

            <div style={{ gridColumn: '9 / 13' }}>
              <CalendarPanel />
            </div>
          </div>
        </main>

        {/* Bottom status strip */}
        <div className="relative z-20 shrink-0 px-5 py-1.5 flex items-center justify-between"
          style={{
            borderTop: '1px solid rgba(0,212,255,0.08)',
            background: 'rgba(8,10,15,0.9)',
          }}>
          <div className="flex items-center gap-4">
            <span className="live-dot">LIVE</span>
            <span className="font-hud text-[9px] tracking-[0.15em] uppercase"
              style={{ color: '#3D5A6B' }}>
              JARVIS v2.0 — All Systems Nominal
            </span>
          </div>
          <div className="font-mono text-[9px]" style={{ color: '#3D5A6B' }}>
            {new Date().getFullYear()} © COMMAND CENTER
          </div>
        </div>
      </motion.div>
    </>
  )
}
