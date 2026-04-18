'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { DayScore } from '@/components/jarvis/DayScore'

interface HUDTopBarProps {
  userName?: string
  tod?: 'morning' | 'afternoon' | 'evening'
  greeting?: string
  onOpenCmd?: () => void
  // kept for API compat but unused in new design
  userEmail?: string
  securityLabel?: string
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

export function HUDTopBar({ userName = 'Mohamed', tod = 'morning', greeting = 'Good morning,', onOpenCmd }: HUDTopBarProps) {
  const firstName = userName.split(' ')[0]

  return (
    <div className="topbar">
      <div className="greeting">
        {greeting} <em>{firstName}</em>.
      </div>
      <div className="spacer" />

      {/* Day score */}
      <DayScore />

      {/* ⌘K command button */}
      <button className="cmdk-btn" onClick={onOpenCmd} title="Open command palette (⌘K)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span>Ask Jarvis or jump to…</span>
        <span className="kbd">⌘K</span>
      </button>

      {/* Settings icon */}
      <button className="icon-btn" title="Settings">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3.2h-4l-.6 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.6 2.5h4l.6-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c0-.4.1-.8.1-1.2z"/>
        </svg>
      </button>
    </div>
  )
}
