'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface GCalEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
  colorId?: string
  description?: string
  location?: string
}

const GC_COLORS: Record<string, string> = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
}

function eventColor(ev: GCalEvent): string {
  return ev.colorId ? (GC_COLORS[ev.colorId] ?? 'var(--accent)') : 'var(--accent)'
}

function toDateKey(d: Date): string { return d.toISOString().slice(0, 10) }
function today(): string { return toDateKey(new Date()) }
function eventDateKey(ev: GCalEvent): string { return (ev.start.dateTime ?? ev.start.date ?? '').slice(0, 10) }

function formatTime(ev: GCalEvent): string {
  if (!ev.start.dateTime) return 'All day'
  return new Date(ev.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatEndTime(ev: GCalEvent): string {
  if (!ev.end.dateTime) return ''
  return new Date(ev.end.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDayHeader(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const t = today()
  if (dateKey === t) return 'Today'
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === toDateKey(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function isEventNow(ev: GCalEvent): boolean {
  if (!ev.start.dateTime || !ev.end.dateTime) return false
  const now = Date.now()
  return new Date(ev.start.dateTime).getTime() <= now && now <= new Date(ev.end.dateTime).getTime()
}

function isEventPast(ev: GCalEvent): boolean {
  if (!ev.end.dateTime) return false
  return new Date(ev.end.dateTime).getTime() < Date.now()
}

export function GoogleCalendarPanel() {
  const [events, setEvents] = useState<GCalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayKey = today()
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [showGrid, setShowGrid] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/google-calendar')
      if (res.status === 401) { setError('auth'); return }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? 'fetch_failed'); return
      }
      const d = await res.json() as { events: GCalEvent[] }
      setEvents(d.events ?? [])
    } catch { setError('network_error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, GCalEvent[]>()
    for (const ev of events) {
      const key = eventDateKey(ev)
      const existing = map.get(key) ?? []; existing.push(ev); map.set(key, existing)
    }
    return map
  }, [events])

  const monthGrid = useMemo(() => {
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)
    const cells: Array<{ key: string; day: number; currentMonth: boolean }> = []

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      cells.push({ key: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, currentMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ key: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, currentMonth: true })
    }
    const remainder = cells.length % 7
    if (remainder > 0) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      for (let d = 1; d <= 7 - remainder; d++) {
        cells.push({ key: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, currentMonth: false })
      }
    }
    return cells
  }, [viewYear, viewMonth])

  const selectedEvents = useMemo(() => {
    const list = eventsByDay.get(selectedDate) ?? []
    return [...list].sort((a, b) => (a.start.dateTime ?? a.start.date ?? '').localeCompare(b.start.dateTime ?? b.start.date ?? ''))
  }, [eventsByDay, selectedDate])

  const upcomingDays = useMemo(() => {
    const days: string[] = []
    const keys = Array.from(eventsByDay.keys()).filter((k) => k >= todayKey).sort()
    for (const k of keys) { if (days.length >= 5) break; days.push(k) }
    return days
  }, [eventsByDay, todayKey])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })
  const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  if (error === 'auth') {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-mute)', fontStyle: 'italic' }}>
        Connect Google Calendar — sign out and back in.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
        Syncing calendar...
      </div>
    )
  }

  return (
    <>
      {/* Mini calendar toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={() => setShowGrid((v) => !v)}
          style={{ fontSize: 11, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }}
        >
          {showGrid ? 'Hide calendar' : 'Show calendar'}
        </button>
        <button
          onClick={load}
          style={{ fontSize: 11, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
          title="Sync"
        >
          ↻
        </button>
      </div>

      {/* Mini month grid */}
      {showGrid && (
        <div className="gcal-mini" style={{ marginBottom: 14 }}>
          <div className="gcal-mini-head">
            <button className="gcal-nav-btn" onClick={() => { if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) } else setViewMonth((m) => m - 1) }}>‹</button>
            <span className="gcal-mini-title">{monthLabel}</span>
            <button className="gcal-nav-btn" onClick={() => { if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) } else setViewMonth((m) => m + 1) }}>›</button>
          </div>
          <div className="gcal-week-row">
            {DAY_HEADERS.map((d, i) => <div key={i} className="gcal-day-label">{d}</div>)}
          </div>
          <div className="gcal-grid">
            {monthGrid.map((cell) => {
              const cellEvents = eventsByDay.get(cell.key) ?? []
              return (
                <button key={cell.key} className="gcal-cell"
                  data-today={cell.key === todayKey ? 'true' : 'false'}
                  data-selected={cell.key === selectedDate ? 'true' : 'false'}
                  data-outside={!cell.currentMonth ? 'true' : 'false'}
                  onClick={() => setSelectedDate(cell.key)}>
                  <span className="gcal-num">{cell.day}</span>
                  {cellEvents.length > 0 && (
                    <div className="gcal-dots">
                      {cellEvents.slice(0, 3).map((ev) => (
                        <span key={ev.id} className="gcal-dot" style={{ background: eventColor(ev) }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Events for selected/today */}
      {selectedEvents.length > 0 ? (
        <div className="schedule">
          {selectedEvents.map((ev) => {
            const isNow = isEventNow(ev)
            const isPast = isEventPast(ev)
            return (
              <div key={ev.id} className={`sched-item ${isNow ? 'now' : ''}`} style={{ opacity: isPast ? 0.5 : 1 }}>
                <span className="sched-time" style={{ color: isNow ? 'var(--accent)' : undefined }}>
                  {formatTime(ev)}
                </span>
                <div className="sched-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <span className="sched-title">{ev.summary ?? '(No title)'}</span>
                    {ev.htmlLink && (
                      <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 2 }}>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <span className="sched-sub">
                    {formatTime(ev)}{formatEndTime(ev) ? ` – ${formatEndTime(ev)}` : ''}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : upcomingDays.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-mute)', fontStyle: 'italic' }}>No upcoming events.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcomingDays.map((dayKey) => {
            const dayEvents = (eventsByDay.get(dayKey) ?? []).sort((a, b) =>
              (a.start.dateTime ?? a.start.date ?? '').localeCompare(b.start.dateTime ?? b.start.date ?? ''))
            return (
              <div key={dayKey}>
                <div
                  style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6, cursor: 'pointer' }}
                  onClick={() => setSelectedDate(dayKey)}
                >
                  {formatDayHeader(dayKey)}
                </div>
                <div className="schedule">
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="sched-item">
                      <span className="sched-time">{formatTime(ev)}</span>
                      <div className="sched-body">
                        <span className="sched-title">{ev.summary ?? '(No title)'}</span>
                        <span className="sched-sub">{ev.location ?? ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
