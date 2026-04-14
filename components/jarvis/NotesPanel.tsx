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

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
  })

  useEffect(() => {
    if (!notes.length) {
      setActiveId(null)
      setDraftTitle('')
      setDraftBody('')
      return
    }

    const next = notes.find((note) => note.id === activeId) ?? notes[0]
    setActiveId(next.id)
    setDraftTitle(next.title)
    setDraftBody(noteText(next))
  }, [notes, activeId])

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return notes

    return notes.filter((note) => {
      return note.title.toLowerCase().includes(term) || noteText(note).toLowerCase().includes(term)
    })
  }, [notes, search])

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeId) ?? null,
    [notes, activeId]
  )

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const updateNote = useMutation({
    mutationFn: async (payload: { id: string; title: string; content: string }) => {
      const res = await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.id,
          title: payload.title,
          content: { text: payload.content },
        }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const saveActiveNote = () => {
    if (!activeNote) return
    updateNote.mutate({
      id: activeNote.id,
      title: draftTitle.trim() || 'Untitled',
      content: draftBody,
    })
  }

  const headerRight = activeNote ? (
    <button onClick={saveActiveNote} className="workspace-button workspace-button--soft">
      Save
    </button>
  ) : null

  return (
    <PanelWrapper title="Notes" icon={<FileText size={16} />} headerRight={headerRight} className="h-full">
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="relative">
            <Search
              size={14}
              style={{ color: 'var(--text-muted)', position: 'absolute', left: 14, top: 15 }}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="workspace-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search notes"
            />
          </div>

          <button onClick={() => createNote.mutate()} className="workspace-button workspace-button--primary">
            <Plus size={14} />
            New note
          </button>

          <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="workspace-empty">
                <span>Loading your notes...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="workspace-empty">
                <FileText size={20} />
                <span>{notes.length === 0 ? 'No notes yet.' : 'No notes match that search.'}</span>
              </div>
            ) : (
              <div className="workspace-list">
                {filteredNotes.map((note) => {
                  const selected = note.id === activeId

                  return (
                    <button
                      key={note.id}
                      onClick={() => {
                        setActiveId(note.id)
                        setDraftTitle(note.title)
                        setDraftBody(noteText(note))
                      }}
                      className="workspace-card p-5 text-left"
                      style={{
                        borderColor: selected ? 'rgba(59, 130, 246, 0.25)' : undefined,
                        background: selected ? 'rgba(239, 246, 255, 0.9)' : undefined,
                      }}
                    >
                      <div className="truncate-1" style={{ fontWeight: 800 }}>
                        {note.title || 'Untitled'}
                      </div>
                      <div className="truncate-2" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-soft)' }}>
                        {noteText(note) || 'Empty note'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {activeNote ? (
            <>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="workspace-input"
                placeholder="Untitled"
              />

              <textarea
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                onBlur={saveActiveNote}
                className="workspace-textarea workspace-scroll min-h-0 flex-1"
                placeholder="Start writing..."
              />

              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                  {updateNote.isPending ? 'Saving...' : 'Your note saves when you leave the editor or press Save.'}
                </span>

                <button
                  onClick={() => deleteNote.mutate(activeNote.id)}
                  className="workspace-button workspace-button--danger"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="workspace-empty h-full">
              <FileText size={22} />
              <span>Create a note to start writing.</span>
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
