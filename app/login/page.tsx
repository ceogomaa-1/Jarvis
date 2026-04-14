'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BOOT_LINES = [
  'Initializing JARVIS v2.0...',
  'Loading neural interface protocols...',
  'Syncing quantum data streams...',
  'Establishing secure uplink...',
  'Calibrating holographic display matrices...',
  'AI core online. Ready.',
]

export default function LoginPage() {
  const [bootLines, setBootLines] = useState<string[]>([])
  const [isBooting, setIsBooting] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if already authenticated
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard')
    })

    // Boot sequence animation
    let i = 0
    const interval = setInterval(() => {
      setBootLines((prev) => [...prev, BOOT_LINES[i]])
      i++
      if (i >= BOOT_LINES.length) {
        clearInterval(interval)
        setTimeout(() => {
          setIsBooting(false)
          setTimeout(() => setShowLogin(true), 300)
        }, 600)
      }
    }, 280)

    return () => clearInterval(interval)
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
      },
    })
    if (error) {
      console.error('OAuth error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#080A0F' }}>
      {/* Background grid */}
      <div className="hud-bg" />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,212,255,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="font-display text-5xl font-black tracking-widest glow-cyan text-cyan mb-2"
            style={{ letterSpacing: '0.15em' }}>
            JARVIS
          </div>
          <div className="font-hud text-xs tracking-[0.3em] text-secondary uppercase">
            Command Center v2.0
          </div>
          <div className="mt-3 mx-auto w-32 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #00D4FF, transparent)' }}
          />
        </motion.div>

        {/* Boot sequence terminal */}
        <AnimatePresence>
          {isBooting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8 p-4 rounded-sm"
              style={{
                background: 'rgba(0, 212, 255, 0.03)',
                border: '1px solid rgba(0, 212, 255, 0.1)',
              }}
            >
              <div className="space-y-1">
                {bootLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-xs"
                    style={{ color: i === bootLines.length - 1 ? '#00D4FF' : '#3D5A6B' }}
                  >
                    <span style={{ color: '#00FF88' }}>{'>'}</span> {line}
                  </motion.div>
                ))}
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-mono text-xs" style={{ color: '#00FF88' }}>{'>'}</span>
                  <span
                    className="inline-block w-2 h-3 ml-1"
                    style={{ background: '#00D4FF', animation: 'blink 1s step-end infinite' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Panel */}
        <AnimatePresence>
          {showLogin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hud-panel hud-panel-inner-corners p-8"
            >
              <div className="text-center mb-6">
                <div className="font-hud text-sm font-semibold tracking-[0.15em] text-secondary uppercase mb-1">
                  AUTHENTICATION REQUIRED
                </div>
                <div className="font-body text-xs text-muted opacity-70">
                  Identify yourself to access the command center
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-6 transition-all duration-300 relative group"
                style={{
                  background: 'rgba(0, 212, 255, 0.06)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '2px',
                  color: '#00D4FF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.12)'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.6)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.06)'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-cyan-DEFAULT border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: 'rgba(0,212,255,0.3)', borderTopColor: '#00D4FF' }}
                    />
                    <span className="font-hud text-sm tracking-widest">AUTHENTICATING...</span>
                  </div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.82-2.7.82-2.08 0-3.84-1.4-4.47-3.29H1.84v2.07A8 8 0 0 0 8.98 17z"/>
                      <path fill="#FBBC05" d="M4.51 10.58A4.8 4.8 0 0 1 4.26 9c0-.55.1-1.08.25-1.58V5.35H1.84A8 8 0 0 0 .98 9c0 1.28.3 2.5.86 3.65l2.67-2.07z"/>
                      <path fill="#EA4335" d="M8.98 3.58c1.16 0 2.2.4 3.02 1.19l2.24-2.24A8 8 0 0 0 8.98 1 8 8 0 0 0 1.84 5.35L4.51 7.42c.63-1.89 2.39-3.84 4.47-3.84z"/>
                    </svg>
                    <span className="font-hud text-sm font-semibold tracking-[0.15em]">SIGN IN WITH GOOGLE</span>
                  </>
                )}
              </button>

              <div className="mt-6 text-center">
                <div className="font-body text-xs opacity-40" style={{ color: '#7A9BAE' }}>
                  Access restricted to authorized personnel only
                </div>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-3 right-3 font-mono text-xs opacity-20" style={{ color: '#00D4FF' }}>
                [SYS:READY]
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mt-8 font-hud text-xs tracking-widest opacity-20"
          style={{ color: '#00D4FF' }}
        >
          JARVIS © 2025 — ALL SYSTEMS NOMINAL
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
