'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Search, Trash2 } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { Note } from '@/types'

type NoteResponse = { notes: Note[] }

function noteText(note: Note) {
  const text = note.content?.text
  return typeof text === 'string' ? text : ''
}

async function fetchNotes(): Promise<Note[]> {
  const res = await fetch('/api/notes', { cache: 'no-store' })
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Failed to load notes')
  const data = (await res.json()) as NoteResponse
  return data.notes ?? []
}

export function NotesPanel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')

  const { data: notes = [], isLoading } = useQuery({ queryKey: ['notes'], queryFn: fetchNotes })

  useEffect(() => {
    if (!notes.length) { setActiveId(null); setDraftTitle(''); setDraftBody(''); return }
    const next = notes.find((n) => n.id === activeId) ?? notes[0]
    setActiveId(next.id)
    setDraftTitle(next.title)
    setDraftBody(noteText(next))
  }, [notes, activeId])

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return notes
    return notes.filter((n) => n.title.toLowerCase().includes(term) || noteText(n).toLowerCase().includes(term))
  }, [notes, search])

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId])

  const createNote = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: { text: '' }, tags: [] }),
      })
      if (!res.ok) throw new Error('Failed to create note')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  const updateNote = useMutation({
    mutationFn: async (payload: { id: string; title: string; content: string }) => {
      const res = await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.id, title: payload.title, content: { text: payload.content } }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  const saveActiveNote = () => {
    if (!activeNote) return
    updateNote.mutate({ id: activeNote.id, title: draftTitle.trim() || 'Untitled', content: draftBody })
  }

  return (
    <PanelWrapper
      title="Notes"
      icon={<FileText size={14} />}
      headerRight={
        activeNote ? (
          <button onClick={saveActiveNote} className="workspace-button workspace-button--soft">Save</button>
        ) : null
      }
      className="h-full"
    >
      {/* two-column grid fills all available body height */}
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)]">

        {/* left: search + new + list */}
        <div className="flex min-h-0 flex-col gap-2">
          <div className="relative flex-shrink-0">
            <Search size={12} style={{ color: 'var(--text-muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="workspace-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search notes"
            />
          </div>

          <button onClick={() => createNote.mutate()} className="workspace-button workspace-button--primary flex-shrink-0">
            <Plus size={13} />
            New note
          </button>

          <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="workspace-empty"><span>Loading...</span></div>
            ) : filteredNotes.length === 0 ? (
              <div className="workspace-empty">
                <FileText size={16} />
                <span>{notes.length === 0 ? 'No notes yet.' : 'No matches.'}</span>
              </div>
            ) : (
              <div className="workspace-list">
                {filteredNotes.map((note) => {
                  const selected = note.id === activeId
                  return (
                    <button
                      key={note.id}
                      onClick={() => { setActiveId(note.id); setDraftTitle(note.title); setDraftBody(noteText(note)) }}
                      className="workspace-card px-3 py-2.5 text-left"
                      style={{
                        borderColor: selected ? 'rgba(59,130,246,0.3)' : undefined,
                        background: selected ? 'var(--selected-card-bg)' : undefined,
                        color: selected ? 'var(--selected-card-text)' : undefined,
                      }}
                    >
                      <div className="truncate-1" style={{ fontSize: 13, fontWeight: 800 }}>
                        {note.title || 'Untitled'}
                      </div>
                      <div className="truncate-1" style={{ marginTop: 2, fontSize: 11, color: selected ? 'color-mix(in srgb, var(--selected-card-text) 65%, transparent)' : 'var(--text-soft)' }}>
                        {noteText(note) || 'Empty note'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* right: editor fills height */}
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          {activeNote ? (
            <>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="workspace-input flex-shrink-0"
                placeholder="Untitled"
              />
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                onBlur={saveActiveNote}
                className="workspace-textarea workspace-scroll min-h-0 flex-1"
                style={{ minHeight: 0 }}
                placeholder="Start writing..."
              />
              <div className="flex flex-shrink-0 items-center justify-between">
                <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                  {updateNote.isPending ? 'Saving...' : 'Auto-saves on blur or Save button.'}
                </span>
                <button onClick={() => deleteNote.mutate(activeNote.id)} className="workspace-button workspace-button--danger">
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="workspace-empty h-full">
              <FileText size={18} />
              <span>Create a note to start writing.</span>
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
