'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { PlannerEvent } from '@/types'

const STORAGE_KEY = 'jarvis.planner.events'

function loadEvents(): PlannerEvent[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PlannerEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function sortEvents(events: PlannerEvent[]) {
  return [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
}

export function CalendarPanel() {
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setEvents(loadEvents())
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
    }
  }, [events])

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, PlannerEvent[]>()

    sortEvents(events).forEach((event) => {
      const key = format(new Date(event.startsAt), 'yyyy-MM-dd')
      const current = groups.get(key) ?? []
      current.push(event)
      groups.set(key, current)
    })

    return Array.from(groups.entries())
  }, [events])

  const addEvent = () => {
    if (!title.trim() || !date || !startTime || !endTime) return

    const startsAt = new Date(`${date}T${startTime}`)
    const endsAt = new Date(`${date}T${endTime}`)

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return

    setEvents((current) =>
      sortEvents([
        ...current,
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          notes: notes.trim(),
        },
      ])
    )

    setTitle('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setNotes('')
    setShowForm(false)
  }

  const headerRight = (
    <div className="flex items-center gap-2">
      <div className="workspace-badge workspace-badge--info">
        {events.length} event{events.length === 1 ? '' : 's'}
      </div>
      <button
        onClick={() => setShowForm((v) => !v)}
        className="workspace-button workspace-button--primary"
        style={{ padding: '6px 12px' }}
      >
        <Plus size={13} />
        {showForm ? 'Cancel' : 'Add'}
      </button>
    </div>
  )

  return (
    <PanelWrapper title="Timeline" icon={<CalendarDays size={16} />} headerRight={headerRight} className="h-full">
      <div className="flex h-full min-h-0 flex-col gap-3">
        {showForm ? (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="workspace-input"
                placeholder="Event title"
              />
              <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="workspace-input" />
              <input
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                className="workspace-input"
              />
              <input value={endTime} onChange={(event) => setEndTime(event.target.value)} type="time" className="workspace-input" />
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="workspace-input"
              style={{ minHeight: 52, resize: 'none' }}
              placeholder="Optional notes"
            />
            <button onClick={addEvent} className="workspace-button workspace-button--primary" style={{ alignSelf: 'flex-start' }}>
              <Plus size={14} />
              Save event
            </button>
          </div>
        ) : null}

        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {groupedEvents.length === 0 ? (
            <div className="workspace-empty">
              <CalendarDays size={20} />
              <span>No events yet.</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Your timeline starts empty so you can build it your way.
              </span>
            </div>
          ) : (
            <div className="workspace-list">
              {groupedEvents.map(([day, dayEvents]) => (
                <div key={day} className="workspace-card p-5">
                  <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 800, color: 'var(--text-soft)' }}>
                    {format(new Date(day), 'EEEE, MMM d')}
                  </div>

                  <div className="workspace-list">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div style={{ fontWeight: 800 }}>{event.title}</div>
                          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-soft)' }}>
                            {format(new Date(event.startsAt), 'h:mm a')} - {format(new Date(event.endsAt), 'h:mm a')}
                          </div>
                          {event.notes ? (
                            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-soft)', whiteSpace: 'pre-wrap' }}>
                              {event.notes}
                            </div>
                          ) : null}
                        </div>

                        <button
                          onClick={() => setEvents((current) => current.filter((item) => item.id !== event.id))}
                          className="workspace-button workspace-button--danger"
                          style={{ padding: 10 }}
                          aria-label="Delete event"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
