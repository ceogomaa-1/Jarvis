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
        top: 8,
        zIndex: 20,
        margin: '8px 14px 0',
        borderRadius: 22,
        padding: '10px 18px',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(18px)',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display" style={{ fontSize: 26, lineHeight: 1 }}>
            Jarvis
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {userName || userEmail || 'Workspace'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onToggleTheme ? (
            <button onClick={onToggleTheme} className="workspace-button" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
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
              <ShieldCheck size={13} />
              {securityLabel}
            </div>
          ) : null}

          <button onClick={handleLogout} className="workspace-button">
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
