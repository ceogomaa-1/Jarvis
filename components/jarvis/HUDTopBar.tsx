'use client'

import { useEffect, useState } from 'react'
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface HUDTopBarProps {
  userEmail?: string
  userName?: string
  securityLabel?: string
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

export function HUDTopBar({ userEmail, userName, securityLabel, theme = 'light', onToggleTheme }: HUDTopBarProps) {
  const router = useRouter()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className="workspace-card"
      style={{
        position: 'sticky',
        top: 10,
        zIndex: 20,
        margin: '10px 16px 0',
        borderRadius: 28,
        padding: '16px 22px',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(18px)',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="font-display" style={{ fontSize: 34, lineHeight: 0.9 }}>
            Jarvis
          </div>
          <div style={{ marginTop: 8, color: 'var(--text-soft)', fontSize: 14 }}>
            {userName || userEmail || 'Workspace'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onToggleTheme ? (
            <button onClick={onToggleTheme} className="workspace-button" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          ) : null}

          <div className="workspace-badge workspace-badge--success">
            <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          </div>

          <div className="workspace-badge workspace-badge--info">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>

          {securityLabel ? (
            <div className="workspace-badge workspace-badge--warm">
              <ShieldCheck size={14} />
              {securityLabel}
            </div>
          ) : null}

          <button onClick={handleLogout} className="workspace-button">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
