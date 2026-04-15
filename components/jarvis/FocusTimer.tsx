'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Target, X } from 'lucide-react'

const STORAGE_KEY = 'jarvis.focus'

interface FocusSession {
  task: string
  startTime: number
  durationMs: number
}

function loadSession(): FocusSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FocusSession
  } catch { return null }
}

function saveSession(session: FocusSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function playChime() {
  try {
    const ctx = new AudioContext()
    const frequencies = [440, 523, 659]
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const startAt = ctx.currentTime + i * 0.35
      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(0.18, startAt + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.5)
      osc.start(startAt)
      osc.stop(startAt + 0.5)
    })
  } catch {}
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DURATIONS = [
  { label: '25m', ms: 25 * 60 * 1000 },
  { label: '45m', ms: 45 * 60 * 1000 },
  { label: '60m', ms: 60 * 60 * 1000 },
  { label: '90m', ms: 90 * 60 * 1000 },
]

export function FocusTimer() {
  const [session, setSession] = useState<FocusSession | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [open, setOpen] = useState(false)
  const [taskInput, setTaskInput] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0].ms)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Load persisted session on mount
  useEffect(() => {
    const saved = loadSession()
    if (saved) {
      const elapsed = Date.now() - saved.startTime
      if (elapsed < saved.durationMs) {
        setSession(saved)
        setRemaining(saved.durationMs - elapsed)
      } else {
        saveSession(null)
      }
    }
  }, [])

  // Tick countdown
  useEffect(() => {
    if (!session) return
    const id = setInterval(() => {
      const elapsed = Date.now() - session.startTime
      const rem = session.durationMs - elapsed
      if (rem <= 0) {
        setRemaining(0)
        setSession(null)
        saveSession(null)
        clearInterval(id)
        playChime()
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus block complete. Great work.')
        }
      } else {
        setRemaining(rem)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [session])

  // Global F key shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        open &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const startFocus = useCallback(() => {
    const newSession: FocusSession = {
      task: taskInput.trim() || 'Focus block',
      startTime: Date.now(),
      durationMs: selectedDuration,
    }
    setSession(newSession)
    setRemaining(selectedDuration)
    saveSession(newSession)
    setOpen(false)

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [taskInput, selectedDuration])

  const endFocus = useCallback(() => {
    setSession(null)
    setRemaining(0)
    saveSession(null)
    setOpen(false)
  }, [])

  const isActive = session !== null

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="workspace-button"
        style={isActive ? { color: 'var(--danger)', fontFamily: 'monospace', fontWeight: 800 } : {}}
        aria-label="Focus timer"
      >
        {isActive ? (
          <>
            <span
              style={{ width: 7, height: 7, borderRadius: '999px', background: 'var(--danger)', flexShrink: 0 }}
              className="pulse-red"
            />
            FOCUS — {formatCountdown(remaining)}
          </>
        ) : (
          <>
            <Target size={12} />
            Focus
          </>
        )}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className="popover fade-in-up"
          style={{ top: 'calc(100% + 8px)', right: 0, width: 280 }}
        >
          {isActive ? (
            <div className="flex flex-col gap-3">
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>Active focus block</div>
              <div className="workspace-card" style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{session?.task}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: 'var(--danger)', marginTop: 4 }}>
                  {formatCountdown(remaining)}
                </div>
              </div>
              <button onClick={endFocus} className="workspace-button workspace-button--danger" style={{ alignSelf: 'flex-start' }}>
                <X size={12} />
                End Early
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>What are you focusing on?</div>
              <input
                autoFocus
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                className="workspace-input"
                placeholder="Enter focus task..."
                onKeyDown={(e) => { if (e.key === 'Enter') startFocus() }}
              />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Duration</div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.ms}
                      onClick={() => setSelectedDuration(d.ms)}
                      className="workspace-button"
                      style={selectedDuration === d.ms ? {
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                      } : { padding: '5px 10px' }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={startFocus} className="workspace-button workspace-button--primary">
                <Target size={12} />
                Start Focus Block
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
