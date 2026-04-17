'use client'

import { useEffect, useState } from 'react'
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { FocusTimer } from '@/components/jarvis/FocusTimer'
import { DayScore } from '@/components/jarvis/DayScore'

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
        {/* Left: logo + name */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display" style={{ fontSize: 22, lineHeight: 1 }}>
            Jarvis
          </span>
          <span className="hidden sm:block" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {userName || userEmail || 'Workspace'}
          </span>
        </div>

        {/* Right: controls — on mobile show only time + logout */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle — icon only on mobile */}
          {onToggleTheme ? (
            <button onClick={onToggleTheme} className="workspace-button" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          ) : null}

          {/* Time — always visible */}
          <div className="workspace-badge workspace-badge--success">
            <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          </div>

          {/* Date — hidden on mobile */}
          <div className="workspace-badge workspace-badge--info hidden sm:inline-flex">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>

          {/* Focus Timer — hidden on mobile */}
          <div className="hidden md:block">
            <FocusTimer />
          </div>

          {/* Day Score — hidden on mobile */}
          <div className="hidden md:block">
            <DayScore />
          </div>

          {/* Security label — hidden on mobile */}
          {securityLabel ? (
            <div className="workspace-badge workspace-badge--warm hidden sm:inline-flex">
              <ShieldCheck size={12} />
              {securityLabel}
            </div>
          ) : null}

          {/* Logout — always visible */}
          <button onClick={handleLogout} className="workspace-button" aria-label="Logout">
            <LogOut size={12} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
