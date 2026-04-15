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
  } catch { return [] }
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

  useEffect(() => { setEvents(loadEvents()) }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
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
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) return
    setEvents((current) => sortEvents([...current, {
      id: crypto.randomUUID(), title: title.trim(),
      startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), notes: notes.trim(),
    }]))
    setTitle(''); setDate(''); setStartTime(''); setEndTime(''); setNotes(''); setShowForm(false)
  }

  return (
    <PanelWrapper
      title="Timeline"
      icon={<CalendarDays size={14} />}
      headerRight={
        <div className="flex items-center gap-2">
          <div className="workspace-badge workspace-badge--info">
            {events.length} event{events.length === 1 ? '' : 's'}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="workspace-button workspace-button--primary"
            style={{ padding: '4px 10px' }}
          >
            <Plus size={12} />
            {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>
      }
      className="h-full"
    >
      {/* add-event form — only shown when toggled, uses compact field heights */}
      {showForm ? (
        <div className="flex flex-shrink-0 flex-col gap-1.5 pb-2">
          <div className="grid gap-1.5 md:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="workspace-input" placeholder="Event title" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="workspace-input" />
            <input value={startTime} onChange={(e) => setStartTime(e.target.value)} type="time" className="workspace-input" />
            <input value={endTime} onChange={(e) => setEndTime(e.target.value)} type="time" className="workspace-input" />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="workspace-input"
            style={{ minHeight: 44, resize: 'none', fontSize: 12 }}
            placeholder="Optional notes"
          />
          <button onClick={addEvent} className="workspace-button workspace-button--primary" style={{ alignSelf: 'flex-start' }}>
            <Plus size={12} />
            Save event
          </button>
        </div>
      ) : null}

      {/* scrollable events list */}
      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {groupedEvents.length === 0 ? (
          <div className="workspace-empty h-full">
            <CalendarDays size={18} />
            <span>No events yet.</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Press Add to create your first event.</span>
          </div>
        ) : (
          <div className="workspace-list">
            {groupedEvents.map(([day, dayEvents]) => (
              <div key={day} className="workspace-card px-3 py-2.5">
                <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 800, color: 'var(--text-soft)' }}>
                  {format(new Date(day), 'EEEE, MMM d')}
                </div>
                <div className="workspace-list">
                  {dayEvents.map((event) => (
                    /* compact event row ~52-60px */
                    <div
                      key={event.id}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                      style={{ border: '1px solid var(--event-card-border)', background: 'var(--event-card-bg)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate-1" style={{ fontSize: 13, fontWeight: 800 }}>{event.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2 }}>
                          {format(new Date(event.startsAt), 'h:mm a')} – {format(new Date(event.endsAt), 'h:mm a')}
                        </div>
                        {event.notes ? (
                          <div className="truncate-1" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{event.notes}</div>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setEvents((current) => current.filter((item) => item.id !== event.id))}
                        className="workspace-button workspace-button--danger flex-shrink-0"
                        style={{ padding: '4px 8px' }}
                        aria-label="Delete event"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelWrapper>
  )
}
