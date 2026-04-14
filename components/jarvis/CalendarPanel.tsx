'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, MapPin, Video, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import { MOCK_CALENDAR_EVENTS } from '@/lib/mockData'
import type { CalendarEvent } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatTimeRange(start: string, end: string, allDay: boolean): string {
  if (allDay) return 'All day'
  return `${formatTime(start)} – ${formatTime(end)}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getDayLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'TODAY'
  if (isSameDay(date, addDays(today, 1))) return 'TOMORROW'
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
}

// ─── Next upcoming event (not yet ended) ─────────────────────────────────────

function getNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now()
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = todayStart + 86400000

  const todayEvents = events
    .filter((e) => {
      const endMs = new Date(e.end).getTime()
      const startMs = new Date(e.start).getTime()
      // Must start today and not yet ended
      return startMs >= todayStart && startMs < todayEnd && endMs > now
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return todayEvents[0] ?? null
}

// ─── Upcoming 7 days grouped ──────────────────────────────────────────────────

interface DayGroup {
  label: string
  date: Date
  events: CalendarEvent[]
}

function getUpcoming7Days(events: CalendarEvent[]): DayGroup[] {
  const today = startOfDay(new Date())
  const groups: DayGroup[] = []

  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i)
    const dayEvents = events
      .filter((e) => isSameDay(new Date(e.start), day))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    if (dayEvents.length > 0) {
      groups.push({
        label: getDayLabel(day, today),
        date: day,
        events: dayEvents,
      })
    }
  }

  return groups
}

// ─── JOIN button ──────────────────────────────────────────────────────────────

function JoinButton({ url, size = 'sm' }: { url: string; size?: 'sm' | 'xs' }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded font-semibold uppercase tracking-widest transition-all duration-150 focus:outline-none shrink-0"
      style={{
        fontSize: size === 'sm' ? 10 : 9,
        padding: size === 'sm' ? '4px 10px' : '2px 7px',
        background: 'rgba(251,191,36,0.12)',
        color: '#FBB924',
        border: '1px solid rgba(251,191,36,0.35)',
        boxShadow: '0 0 8px rgba(251,191,36,0.12)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = 'rgba(251,191,36,0.22)'
        el.style.boxShadow = '0 0 14px rgba(251,191,36,0.28)'
        el.style.borderColor = 'rgba(251,191,36,0.65)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = 'rgba(251,191,36,0.12)'
        el.style.boxShadow = '0 0 8px rgba(251,191,36,0.12)'
        el.style.borderColor = 'rgba(251,191,36,0.35)'
      }}
    >
      <Video size={size === 'sm' ? 10 : 8} />
      JOIN
    </a>
  )
}

// ─── Today at a Glance ────────────────────────────────────────────────────────

function TodayGlance({ events }: { events: CalendarEvent[] }) {
  const next = useMemo(() => getNextEvent(events), [events])

  return (
    <div className="shrink-0">
      {/* Section label */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span
          className="text-[9px] font-semibold tracking-[0.2em] uppercase font-hud"
          style={{ color: 'rgba(0,212,255,0.55)' }}
        >
          Today at a Glance
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'rgba(0,212,255,0.08)' }}
        />
      </div>

      <div className="px-3 py-2">
        <AnimatePresence mode="wait" initial={false}>
          {next ? (
            <motion.div
              key={next.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `4px solid ${next.color}`,
              }}
            >
              {/* Glow from event color */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${next.color}0A 0%, transparent 60%)`,
                }}
              />
              <div className="relative px-3 py-2.5 flex flex-col gap-1.5">
                {/* NEXT UP label */}
                <span
                  className="text-[9px] font-semibold tracking-[0.22em] uppercase font-hud"
                  style={{ color: next.color }}
                >
                  Next Up
                </span>

                {/* Title */}
                <span
                  className="text-[15px] font-semibold leading-tight"
                  style={{ color: 'rgba(255,255,255,0.93)' }}
                >
                  {next.title}
                </span>

                {/* Time */}
                <span
                  className="text-[11px] font-medium"
                  style={{ color: next.color, opacity: 0.85 }}
                >
                  {formatTimeRange(next.start, next.end, next.allDay)}
                </span>

                {/* Location */}
                {next.location && (
                  <span
                    className="flex items-center gap-1 text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    <MapPin size={9} />
                    {next.location}
                  </span>
                )}

                {/* JOIN button */}
                {next.meetingUrl && (
                  <div className="mt-0.5">
                    <JoinButton url={next.meetingUrl} size="sm" />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="clear"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-3 py-3 rounded"
              style={{
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.1)',
              }}
            >
              <CalendarDays size={14} style={{ color: 'rgba(0,212,255,0.35)' }} />
              <span
                className="text-[11px] font-medium tracking-wide font-hud"
                style={{ color: 'rgba(0,212,255,0.5)' }}
              >
                ALL CLEAR — No more events today
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Mini Month Calendar ──────────────────────────────────────────────────────

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface MiniCalendarProps {
  events: CalendarEvent[]
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
}

function MiniCalendar({ events, selectedDate, onSelectDate }: MiniCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Build calendar grid
  const calGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const startDow = firstDay.getDay() // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d))
    }
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  // Map event start dates to colors (for dot rendering)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    events.forEach((e) => {
      const d = startOfDay(new Date(e.start))
      const key = d.toDateString()
      const existing = map.get(key) ?? []
      if (!existing.includes(e.color)) existing.push(e.color)
      map.set(key, existing)
    })
    return map
  }, [events])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="shrink-0">
      {/* Section label */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span
          className="text-[9px] font-semibold tracking-[0.2em] uppercase font-hud"
          style={{ color: 'rgba(0,212,255,0.55)' }}
        >
          Calendar
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,212,255,0.08)' }} />
      </div>

      <div className="px-3 py-2">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={prevMonth}
            className="rounded p-0.5 transition-colors focus:outline-none"
            style={{ color: 'rgba(0,212,255,0.5)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#00D4FF' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.5)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={13} />
          </button>
          <span
            className="text-[11px] font-semibold tracking-widest uppercase font-hud"
            style={{ color: '#00D4FF' }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="rounded p-0.5 transition-colors focus:outline-none"
            style={{ color: 'rgba(0,212,255,0.5)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#00D4FF' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.5)' }}
            aria-label="Next month"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {DOW_LABELS.map((d) => (
            <div
              key={d}
              className="flex items-center justify-center font-hud"
              style={{
                fontSize: 9,
                color: 'rgba(0,212,255,0.4)',
                letterSpacing: '0.08em',
                height: 18,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calGrid.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} style={{ height: 28 }} />
            }

            const isToday = isSameDay(date, today)
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isCurrentMonth = date.getMonth() === viewMonth
            const dots = eventsByDay.get(date.toDateString()) ?? []

            return (
              <button
                key={date.toDateString()}
                onClick={() => onSelectDate(isSelected ? null! : date)}
                className="flex flex-col items-center justify-center relative focus:outline-none rounded transition-colors"
                style={{
                  height: 28,
                  fontSize: 10,
                  fontFamily: 'inherit',
                  color: !isCurrentMonth
                    ? 'rgba(255,255,255,0.15)'
                    : isToday
                    ? '#0D1117'
                    : isSelected
                    ? '#00D4FF'
                    : 'rgba(255,255,255,0.7)',
                  background: isToday
                    ? '#00D4FF'
                    : isSelected
                    ? 'rgba(0,212,255,0.15)'
                    : 'transparent',
                  fontWeight: isToday || isSelected ? 700 : 400,
                  borderRadius: isToday ? '50%' : '3px',
                  width: '100%',
                }}
                aria-label={date.toLocaleDateString()}
              >
                <span style={{ lineHeight: 1 }}>{date.getDate()}</span>

                {/* Event dots */}
                {dots.length > 0 && (
                  <div className="flex items-center gap-px mt-0.5" style={{ height: 4 }}>
                    {dots.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: isToday ? 'rgba(13,17,23,0.7)' : color,
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Selected Day Events ──────────────────────────────────────────────────────

function SelectedDayEvents({
  date,
  events,
}: {
  date: Date
  events: CalendarEvent[]
}) {
  const today = startOfDay(new Date())
  const label = getDayLabel(date, today)

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => isSameDay(new Date(e.start), date))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [date, events]
  )

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden shrink-0"
      >
        <div
          className="mx-3 mb-2 rounded overflow-hidden"
          style={{
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.12)',
          }}
        >
          <div
            className="px-2.5 py-1.5"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <span
              className="text-[9px] font-semibold tracking-[0.18em] uppercase font-hud"
              style={{ color: '#00D4FF' }}
            >
              {label}
            </span>
          </div>
          {dayEvents.length === 0 ? (
            <div className="px-2.5 py-2">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No events
              </span>
            </div>
          ) : (
            dayEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 px-2.5 py-1.5"
                style={{ borderTop: '1px solid rgba(0,212,255,0.05)' }}
              >
                <div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }}
                />
                <span className="text-[10px] flex-1 min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {e.title}
                </span>
                <span className="text-[9px] shrink-0" style={{ color: e.color, opacity: 0.8 }}>
                  {formatTimeRange(e.start, e.end, e.allDay)}
                </span>
                {e.meetingUrl && <JoinButton url={e.meetingUrl} size="xs" />}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Upcoming 7 Days List ─────────────────────────────────────────────────────

function UpcomingList({ events }: { events: CalendarEvent[] }) {
  const groups = useMemo(() => getUpcoming7Days(events), [events])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section label */}
      <div
        className="px-3 py-1.5 flex items-center gap-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span
          className="text-[9px] font-semibold tracking-[0.2em] uppercase font-hud"
          style={{ color: 'rgba(0,212,255,0.55)' }}
        >
          Upcoming 7 Days
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,212,255,0.08)' }} />
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,212,255,0.18) transparent',
        }}
      >
        {groups.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <span className="text-[11px]" style={{ color: 'rgba(0,212,255,0.3)' }}>
              No upcoming events
            </span>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date.toDateString()} className="mb-2">
              {/* Day label */}
              <div className="mb-1 pt-1">
                <span
                  className="text-[9px] font-semibold tracking-[0.18em] uppercase font-hud"
                  style={{ color: '#00D4FF' }}
                >
                  {group.label}
                </span>
              </div>

              {/* Events in this day */}
              {group.events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 py-1.5 rounded px-2 mb-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${e.color}`,
                  }}
                >
                  {/* Color dot */}
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: e.color,
                      boxShadow: `0 0 5px ${e.color}80`,
                      flexShrink: 0,
                    }}
                  />

                  {/* Time */}
                  <span
                    className="text-[10px] font-medium shrink-0 font-hud"
                    style={{ color: e.color, opacity: 0.9, minWidth: 70 }}
                  >
                    {e.allDay ? 'All day' : formatTime(e.start)}
                  </span>

                  {/* Title */}
                  <span
                    className="text-[11px] flex-1 min-w-0 truncate"
                    style={{ color: 'rgba(255,255,255,0.82)' }}
                  >
                    {e.title}
                  </span>

                  {/* Location (small) */}
                  {e.location && (
                    <span
                      className="hidden sm:flex items-center gap-0.5 text-[9px] shrink-0"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      <MapPin size={8} />
                      {e.location}
                    </span>
                  )}

                  {/* JOIN */}
                  {e.meetingUrl && <JoinButton url={e.meetingUrl} size="xs" />}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CalendarPanel() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const events = MOCK_CALENDAR_EVENTS

  const addEventButton = (
    <a
      href="https://calendar.google.com/calendar/r/eventedit"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center rounded transition-all duration-150 focus:outline-none"
      style={{
        width: 22,
        height: 22,
        background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.3)',
        color: '#00D4FF',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = 'rgba(0,212,255,0.2)'
        el.style.borderColor = 'rgba(0,212,255,0.6)'
        el.style.boxShadow = '0 0 10px rgba(0,212,255,0.2)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = 'rgba(0,212,255,0.1)'
        el.style.borderColor = 'rgba(0,212,255,0.3)'
        el.style.boxShadow = 'none'
      }}
      aria-label="Add event in Google Calendar"
      title="Add event"
    >
      <Plus size={12} />
    </a>
  )

  return (
    <PanelWrapper
      title="TIMELINE"
      icon={<CalendarDays size={13} />}
      headerRight={addEventButton}
      noPad
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* 1. Today at a Glance */}
        <TodayGlance events={events} />

        {/* 2. Mini month calendar */}
        <MiniCalendar
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* 2b. Selected day detail */}
        <AnimatePresence>
          {selectedDate && (
            <SelectedDayEvents date={selectedDate} events={events} />
          )}
        </AnimatePresence>

        {/* 3. Upcoming 7 days */}
        <UpcomingList events={events} />
      </div>
    </PanelWrapper>
  )
}
