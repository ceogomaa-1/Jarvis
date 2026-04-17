'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Google Calendar color IDs → hex ──────────────────────────────────────────

const GC_COLORS: Record<string, string> = {
  '1': '#7986CB',
  '2': '#33B679',
  '3': '#8E24AA',
  '4': '#E67C73',
  '5': '#F6BF26',
  '6': '#F4511E',
  '7': '#039BE5',
  '8': '#616161',
  '9': '#3F51B5',
  '10': '#0B8043',
  '11': '#D50000',
}

function eventColor(ev: GCalEvent): string {
  return ev.colorId ? (GC_COLORS[ev.colorId] ?? 'var(--accent)') : 'var(--accent)'
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return toDateKey(new Date())
}

function eventDateKey(ev: GCalEvent): string {
  const raw = ev.start.dateTime ?? ev.start.date ?? ''
  return raw.slice(0, 10)
}

function formatTime(ev: GCalEvent): string {
  if (!ev.start.dateTime) return 'All day'
  const d = new Date(ev.start.dateTime)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatEndTime(ev: GCalEvent): string {
  if (!ev.end.dateTime) return ''
  const d = new Date(ev.end.dateTime)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDayHeader(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const t = today()
  if (dateKey === t) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === toDateKey(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay() // 0 = Sunday
}

// ── Main component ────────────────────────────────────────────────────────────

export function GoogleCalendarPanel() {
  const [events, setEvents] = useState<GCalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayKey = today()
  const [selectedDate, setSelectedDate] = useState(todayKey)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/google-calendar')
      if (res.status === 401) {
        setError('auth')
        return
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? 'fetch_failed')
        return
      }
      const d = await res.json() as { events: GCalEvent[] }
      setEvents(d.events ?? [])
    } catch {
      setError('network_error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Build a map: YYYY-MM-DD → events[]
  const eventsByDay = useMemo(() => {
    const map = new Map<string, GCalEvent[]>()
    for (const ev of events) {
      const key = eventDateKey(ev)
      const existing = map.get(key) ?? []
      existing.push(ev)
      map.set(key, existing)
    }
    return map
  }, [events])

  // Build the month grid
  const monthGrid = useMemo(() => {
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)

    const cells: Array<{ key: string; day: number; currentMonth: boolean }> = []

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      const key = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({ key, day, currentMonth: false })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ key, day: d, currentMonth: true })
    }

    // Trailing days to complete grid (always fill to multiple of 7)
    const remainder = cells.length % 7
    if (remainder > 0) {
      const trailingCount = 7 - remainder
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      for (let d = 1; d <= trailingCount; d++) {
        const key = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push({ key, day: d, currentMonth: false })
      }
    }

    return cells
  }, [viewYear, viewMonth])

  const selectedEvents = useMemo(() => {
    const list = eventsByDay.get(selectedDate) ?? []
    return [...list].sort((a, b) => {
      const aTime = a.start.dateTime ?? a.start.date ?? ''
      const bTime = b.start.dateTime ?? b.start.date ?? ''
      return aTime.localeCompare(bTime)
    })
  }, [eventsByDay, selectedDate])

  // Upcoming events (from today, next 7 distinct days with events)
  const upcomingDays = useMemo(() => {
    const days: string[] = []
    const keys = Array.from(eventsByDay.keys())
      .filter((k) => k >= todayKey)
      .sort()
    for (const k of keys) {
      if (days.length >= 7) break
      days.push(k)
    }
    return days
  }, [eventsByDay, todayKey])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <PanelWrapper
      title="Google Calendar"
      icon={<CalendarDays size={14} />}
      className="flex-shrink-0"
      headerRight={
        <button
          onClick={load}
          disabled={loading}
          className="workspace-button"
          style={{ padding: '4px 10px', fontSize: 11 }}
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      }
    >
      {error === 'auth' ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <CalendarDays size={20} />
          <span style={{ fontWeight: 700 }}>Calendar not connected</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340 }}>
            Sign out and sign back in to grant Google Calendar access. The login page already requests the required scope.
          </span>
        </div>
      ) : (
        <div className="gcal-body">

          {/* ── LEFT: Month grid ─────────────────────────────────────────────── */}
          <div className="gcal-grid-col">
            {/* Month navigation */}
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: 10 }}>
              <button
                onClick={() => {
                  if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
                  else setViewMonth((m) => m - 1)
                }}
                className="workspace-button"
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{monthLabel}</span>
              <button
                onClick={() => {
                  if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
                  else setViewMonth((m) => m + 1)
                }}
                className="workspace-button"
                style={{ padding: '4px 8px' }}
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Day headers */}
            <div className="gcal-week-headers">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="gcal-day-header">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="gcal-grid">
              {monthGrid.map((cell) => {
                const cellEvents = eventsByDay.get(cell.key) ?? []
                const isToday = cell.key === todayKey
                const isSelected = cell.key === selectedDate
                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(cell.key)}
                    className="gcal-day-cell"
                    data-today={isToday ? 'true' : 'false'}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-current={cell.currentMonth ? 'true' : 'false'}
                  >
                    <span className="gcal-day-number">{cell.day}</span>
                    {/* Event dots */}
                    {cellEvents.length > 0 ? (
                      <div className="gcal-event-dots">
                        {cellEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="gcal-event-dot"
                            style={{ background: eventColor(ev) }}
                          />
                        ))}
                        {cellEvents.length > 3 ? (
                          <span className="gcal-event-dot-more">+{cellEvents.length - 3}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: Events for selected day ───────────────────────────────── */}
          <div className="gcal-events-col workspace-scroll" style={{ overflowY: 'auto' }}>
            {selectedEvents.length > 0 ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {formatDayHeader(selectedDate)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="workspace-card"
                      style={{
                        padding: '8px 12px',
                        borderLeft: `3px solid ${eventColor(ev)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
                          {ev.summary ?? '(No title)'}
                        </span>
                        {ev.htmlLink ? (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}
                          >
                            <ExternalLink size={11} />
                          </a>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                        {formatTime(ev)}{formatEndTime(ev) ? ` – ${formatEndTime(ev)}` : ''}
                      </div>
                      {ev.location ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}
                          className="truncate-1">
                          📍 {ev.location}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* No events on selected day — show upcoming */}
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  {loading ? 'Loading...' : upcomingDays.length === 0 ? 'No upcoming events' : 'Upcoming'}
                </div>
                {upcomingDays.length === 0 && !loading ? (
                  <div className="workspace-empty" style={{ minHeight: 80 }}>
                    <CalendarDays size={16} />
                    <span style={{ fontSize: 12 }}>No events in the next 90 days</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {upcomingDays.map((dayKey) => {
                      const dayEvents = (eventsByDay.get(dayKey) ?? []).sort((a, b) => {
                        const at = a.start.dateTime ?? a.start.date ?? ''
                        const bt = b.start.dateTime ?? b.start.date ?? ''
                        return at.localeCompare(bt)
                      })
                      return (
                        <div key={dayKey}>
                          <div
                            style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, cursor: 'pointer' }}
                            onClick={() => setSelectedDate(dayKey)}
                          >
                            {formatDayHeader(dayKey)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="workspace-card"
                                style={{ padding: '7px 10px', borderLeft: `3px solid ${eventColor(ev)}`, display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="truncate-1" style={{ fontSize: 12, fontWeight: 700 }}>{ev.summary ?? '(No title)'}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(ev)}</div>
                                </div>
                                {ev.htmlLink ? (
                                  <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                                    <ExternalLink size={10} />
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </PanelWrapper>
  )
}
