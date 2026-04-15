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
        top: 2,
        zIndex: 20,
        margin: '2px 10px 0',
        borderRadius: 16,
        padding: '5px 14px',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(18px)',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display" style={{ fontSize: 22, lineHeight: 1 }}>
            Jarvis
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {userName || userEmail || 'Workspace'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onToggleTheme ? (
            <button onClick={onToggleTheme} className="workspace-button" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
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
              <ShieldCheck size={12} />
              {securityLabel}
            </div>
          ) : null}

          <button onClick={handleLogout} className="workspace-button">
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
