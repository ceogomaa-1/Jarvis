'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  List,
  Heading2,
  FileText,
  Search,
  Plus,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Note {
  id: string
  title: string
  tags: string[]
  content: object // TipTap JSON doc
  updatedAt: string
}

type SaveState = 'saved' | 'saving'

interface AISuggestion {
  type: 'idea' | 'next_step' | 'related_topic' | 'question'
  text: string
}

interface AIState {
  open: boolean
  loading: boolean
  error: boolean
  suggestions: AISuggestion[]
}

// ─── Mock content helpers ─────────────────────────────────────────────────────

const API_PARA_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Connecting the JARVIS system to external APIs requires OAuth2 token management, rate-limit backoff, and graceful degradation. The Supabase client handles auth state persistence, while the Anthropic SDK streams completions directly into the editor context. All endpoints are proxied through Next.js API routes to keep secrets server-side.',
        },
      ],
    },
  ],
}

const GOALS_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ship NotesPanel with TipTap integration' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Refactor FinancePanel to use React Query' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write integration tests for /api/notes/ai' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Review Q2 roadmap with team' }] }],
        },
      ],
    },
  ],
}

// ─── Initial notes ────────────────────────────────────────────────────────────

const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'JARVIS Integration Notes',
    tags: ['dev', 'ai'],
    content: API_PARA_CONTENT,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Weekly Goals',
    tags: ['goals', 'planning'],
    content: GOALS_CONTENT,
    updatedAt: new Date().toISOString(),
  },
]

// ─── AI suggestion type icons ─────────────────────────────────────────────────

const SUGGESTION_ICONS: Record<AISuggestion['type'], string> = {
  idea: '💡',
  next_step: '⚡',
  related_topic: '🔗',
  question: '❓',
}

// ─── Shimmer card ─────────────────────────────────────────────────────────────

function ShimmerCard() {
  return (
    <div
      className="rounded p-3 mb-2"
      style={{
        background: 'rgba(0,212,255,0.04)',
        border: '1px solid rgba(0,212,255,0.12)',
      }}
    >
      <div className="shimmer h-3 w-1/3 rounded mb-2" />
      <div className="shimmer h-2.5 w-full rounded mb-1" />
      <div className="shimmer h-2.5 w-4/5 rounded" />
    </div>
  )
}

// ─── AI Side Panel ────────────────────────────────────────────────────────────

interface AIPanelProps {
  aiState: AIState
  onClose: () => void
}

function AIPanel({ aiState, onClose }: AIPanelProps) {
  return (
    <motion.div
      key="ai-panel"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 bottom-0 flex flex-col z-20"
      style={{
        width: '260px',
        background: 'linear-gradient(160deg, rgba(13,17,23,0.98) 0%, rgba(0,20,30,0.97) 100%)',
        borderLeft: '1px solid rgba(0,212,255,0.35)',
        boxShadow: '-4px 0 30px rgba(0,212,255,0.08), inset 1px 0 0 rgba(0,212,255,0.06)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: '#00D4FF' }} />
          <span
            className="font-hud text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: '#00D4FF' }}
          >
            AI Suggestions
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 transition-colors duration-150 focus:outline-none"
          style={{ color: 'rgba(0,212,255,0.5)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#00D4FF')}
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.5)')
          }
          aria-label="Close AI panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel body */}
      <div
        className="flex-1 overflow-y-auto p-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,255,0.2) transparent' }}
      >
        {aiState.loading && (
          <>
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </>
        )}

        {aiState.error && !aiState.loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span style={{ fontSize: 28 }}>⚠️</span>
            <span
              className="font-hud text-[11px] font-semibold tracking-wider text-center"
              style={{ color: 'rgba(255,59,92,0.8)' }}
            >
              AI OFFLINE
            </span>
            <span
              className="text-[10px] text-center leading-snug"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Could not reach the neural network. Try again later.
            </span>
          </div>
        )}

        {!aiState.loading && !aiState.error && aiState.suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Sparkles size={22} style={{ color: 'rgba(0,212,255,0.2)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(0,212,255,0.35)' }}>
              No suggestions yet.
            </span>
          </div>
        )}

        {!aiState.loading &&
          !aiState.error &&
          aiState.suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2 }}
              className="rounded p-2.5 mb-2"
              style={{
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.12)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span style={{ fontSize: 13 }}>{SUGGESTION_ICONS[s.type]}</span>
                <span
                  className="font-hud text-[9px] font-semibold tracking-widest uppercase"
                  style={{ color: 'rgba(0,212,255,0.55)' }}
                >
                  {s.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                {s.text}
              </p>
            </motion.div>
          ))}
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES)
  const [activeId, setActiveId] = useState<string>(INITIAL_NOTES[0].id)
  const [search, setSearch] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [aiState, setAIState] = useState<AIState>({
    open: false,
    loading: false,
    error: false,
    suggestions: [],
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0]

  // ─── Editor ──────────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Begin your transmission...' }),
    ],
    content: activeNote.content,
    onUpdate: ({ editor: ed }) => {
      triggerAutoSave(ed.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  })

  // ─── Auto-save debounce ───────────────────────────────────────────────────

  const triggerAutoSave = useCallback(
    (json: object) => {
      setSaveState('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeId
              ? { ...n, content: json, updatedAt: new Date().toISOString() }
              : n
          )
        )
        setSaveState('saved')
      }, 3000)
    },
    [activeId]
  )

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // ─── Switch note ──────────────────────────────────────────────────────────

  const switchNote = useCallback(
    (id: string) => {
      if (id === activeId) return
      // flush pending save immediately
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        if (editor) {
          const json = editor.getJSON()
          setNotes((prev) =>
            prev.map((n) => (n.id === activeId ? { ...n, content: json } : n))
          )
        }
      }
      setActiveId(id)
      setSaveState('saved')
    },
    [activeId, editor]
  )

  // Update editor content when active note changes
  useEffect(() => {
    if (!editor) return
    const note = notes.find((n) => n.id === activeId)
    if (note) {
      editor.commands.setContent(note.content)
    }
  // Only run when activeId changes (not when notes array mutates from auto-save)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, editor])

  // Focus tag input when it appears
  useEffect(() => {
    if (showTagInput) {
      tagInputRef.current?.focus()
    }
  }, [showTagInput])

  // ─── Note title edit ──────────────────────────────────────────────────────

  const handleTitleChange = (value: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, title: value } : n))
    )
    triggerAutoSave(editor?.getJSON() ?? activeNote.content)
  }

  // ─── Tag management ───────────────────────────────────────────────────────

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || activeNote.tags.includes(tag)) {
      setTagInput('')
      setShowTagInput(false)
      return
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, tags: [...n.tags, tag] } : n
      )
    )
    setTagInput('')
    setShowTagInput(false)
    triggerAutoSave(editor?.getJSON() ?? activeNote.content)
  }

  const removeTag = (tag: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, tags: n.tags.filter((t) => t !== tag) } : n
      )
    )
    triggerAutoSave(editor?.getJSON() ?? activeNote.content)
  }

  // ─── New note ─────────────────────────────────────────────────────────────

  const createNote = () => {
    const id = `note-${Date.now()}`
    const newNote: Note = {
      id,
      title: 'Untitled Note',
      tags: [],
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      updatedAt: new Date().toISOString(),
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveId(id)
    setSaveState('saved')
  }

  // ─── AI suggestions ───────────────────────────────────────────────────────

  const getAISuggestions = async () => {
    setAIState({ open: true, loading: true, error: false, suggestions: [] })
    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor?.getHTML() ?? '',
          title: activeNote.title,
        }),
      })
      if (!res.ok) throw new Error('Non-OK response')
      const data = await res.json()
      const suggestions: AISuggestion[] = Array.isArray(data.suggestions)
        ? data.suggestions
        : Array.isArray(data)
        ? data
        : []
      setAIState({ open: true, loading: false, error: false, suggestions })
    } catch {
      setAIState({ open: true, loading: false, error: true, suggestions: [] })
    }
  }

  // ─── Filtered notes list ──────────────────────────────────────────────────

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Date formatter ───────────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PanelWrapper title="NEURAL NOTES" icon={<FileText size={13} />} noPad>
      <div className="flex h-full relative overflow-hidden">

        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <div
          className="flex flex-col shrink-0"
          style={{
            width: '35%',
            borderRight: '1px solid rgba(0,212,255,0.12)',
          }}
        >
          {/* Search */}
          <div
            className="px-2 py-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <div
              className="flex items-center gap-2 rounded px-2 py-1.5"
              style={{
                background: 'rgba(0,212,255,0.04)',
                border: '1px solid rgba(0,212,255,0.12)',
              }}
            >
              <Search size={11} style={{ color: 'rgba(0,212,255,0.45)', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="flex-1 min-w-0 bg-transparent text-[11px] focus:outline-none placeholder:opacity-40"
                style={{ color: 'rgba(255,255,255,0.8)', caretColor: '#00D4FF' }}
                aria-label="Search notes"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="shrink-0 focus:outline-none"
                  style={{ color: 'rgba(0,212,255,0.4)' }}
                  aria-label="Clear search"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* New Note button */}
          <div
            className="px-2 py-1.5 shrink-0"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-1.5 rounded py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-all duration-150 focus:outline-none font-hud"
              style={{
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.2)',
                color: '#00D4FF',
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = 'rgba(0,212,255,0.12)'
                b.style.borderColor = 'rgba(0,212,255,0.4)'
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = 'rgba(0,212,255,0.06)'
                b.style.borderColor = 'rgba(0,212,255,0.2)'
              }}
            >
              <Plus size={11} />
              New Note
            </button>
          </div>

          {/* Note list */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,255,0.2) transparent' }}
          >
            <AnimatePresence initial={false}>
              {filteredNotes.length === 0 ? (
                <motion.div
                  key="no-notes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-6 px-2"
                >
                  <span className="text-[10px] text-center" style={{ color: 'rgba(0,212,255,0.35)' }}>
                    No notes found
                  </span>
                </motion.div>
              ) : (
                filteredNotes.map((note) => {
                  const isActive = note.id === activeId
                  return (
                    <motion.button
                      key={note.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => switchNote(note.id)}
                      className="w-full text-left px-3 py-2.5 focus:outline-none transition-colors duration-150 relative"
                      style={{
                        borderBottom: '1px solid rgba(0,212,255,0.06)',
                        background: isActive ? 'rgba(0,212,255,0.07)' : 'transparent',
                        borderLeft: isActive
                          ? '2px solid #00D4FF'
                          : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          ;(e.currentTarget as HTMLButtonElement).style.background =
                            'rgba(0,212,255,0.04)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                        }
                      }}
                    >
                      <div
                        className="text-[12px] font-medium leading-snug truncate-1 mb-1"
                        style={{
                          color: isActive ? '#E8F4F8' : 'rgba(255,255,255,0.65)',
                          fontFamily: 'Rajdhani, sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        {note.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[9px]"
                          style={{ color: 'rgba(0,212,255,0.4)' }}
                        >
                          {formatDate(note.updatedAt)}
                        </span>
                        {note.tags[0] && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-wider uppercase font-hud"
                            style={{
                              background: 'rgba(0,212,255,0.08)',
                              border: '1px solid rgba(0,212,255,0.18)',
                              color: '#00D4FF',
                            }}
                          >
                            {note.tags[0]}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right main area ───────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{
            // shrink when AI panel is open
            marginRight: aiState.open ? '260px' : '0',
            transition: 'margin-right 0.3s ease',
          }}
        >
          {/* Title */}
          <div
            className="px-3 pt-3 pb-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-lg font-semibold leading-snug font-hud"
              style={{
                color: '#E8F4F8',
                caretColor: '#00D4FF',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '20px',
                fontWeight: 700,
              }}
              aria-label="Note title"
            />

            {/* Tags row */}
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {activeNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase font-hud"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.22)',
                    color: '#00D4FF',
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="focus:outline-none opacity-60 hover:opacity-100 transition-opacity"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}

              {/* Add tag */}
              <AnimatePresence>
                {showTagInput ? (
                  <motion.input
                    key="tag-input"
                    ref={tagInputRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 80, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTag()
                      if (e.key === 'Escape') {
                        setTagInput('')
                        setShowTagInput(false)
                      }
                    }}
                    onBlur={addTag}
                    placeholder="add tag"
                    className="rounded px-2 py-0.5 text-[10px] font-hud focus:outline-none"
                    style={{
                      background: 'rgba(0,212,255,0.06)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      color: '#00D4FF',
                      caretColor: '#00D4FF',
                    }}
                    aria-label="New tag"
                  />
                ) : (
                  <motion.button
                    key="add-tag-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-hud transition-colors duration-150 focus:outline-none"
                    style={{
                      background: 'rgba(0,212,255,0.04)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      color: 'rgba(0,212,255,0.5)',
                    }}
                    aria-label="Add tag"
                  >
                    <Plus size={9} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-3 py-1.5 shrink-0"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            {[
              {
                label: 'B',
                title: 'Bold',
                isActive: editor?.isActive('bold') ?? false,
                action: () => editor?.chain().focus().toggleBold().run(),
                icon: <Bold size={11} />,
              },
              {
                label: 'I',
                title: 'Italic',
                isActive: editor?.isActive('italic') ?? false,
                action: () => editor?.chain().focus().toggleItalic().run(),
                icon: <Italic size={11} />,
              },
              {
                label: '•',
                title: 'Bullet List',
                isActive: editor?.isActive('bulletList') ?? false,
                action: () => editor?.chain().focus().toggleBulletList().run(),
                icon: <List size={11} />,
              },
              {
                label: 'H2',
                title: 'Heading 2',
                isActive: editor?.isActive('heading', { level: 2 }) ?? false,
                action: () =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run(),
                icon: <Heading2 size={11} />,
              },
            ].map(({ label, title, isActive, action, icon }) => (
              <button
                key={label}
                onClick={action}
                title={title}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold font-hud tracking-wider transition-all duration-150 focus:outline-none"
                style={{
                  border: '1px solid rgba(0,212,255,0.25)',
                  background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.04)',
                  color: isActive ? '#00D4FF' : 'rgba(0,212,255,0.55)',
                  boxShadow: isActive ? '0 0 8px rgba(0,212,255,0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = 'rgba(0,212,255,0.09)'
                    b.style.color = 'rgba(0,212,255,0.8)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    const b = e.currentTarget as HTMLButtonElement
                    b.style.background = 'rgba(0,212,255,0.04)'
                    b.style.color = 'rgba(0,212,255,0.55)'
                  }
                }}
                aria-label={title}
                aria-pressed={isActive}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Save indicator */}
            <span
              className="font-hud text-[9px] font-semibold tracking-widest uppercase flex items-center gap-1"
              style={{
                color: saveState === 'saved' ? '#00FF88' : 'rgba(0,212,255,0.6)',
              }}
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 size={9} className="animate-spin" />
                  SAVING...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 9 }}>●</span>
                  SAVED
                </>
              )}
            </span>
          </div>

          {/* Editor */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,255,0.2) transparent' }}
          >
            <div className="tiptap-editor h-full">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Footer — Get Ideas button */}
          <div
            className="shrink-0 px-3 py-2 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={getAISuggestions}
              disabled={aiState.loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-semibold font-hud tracking-wider uppercase transition-all duration-150 focus:outline-none disabled:opacity-50"
              style={{
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00D4FF',
              }}
              onMouseEnter={(e) => {
                if (!aiState.loading) {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'rgba(0,212,255,0.13)'
                  b.style.borderColor = 'rgba(0,212,255,0.5)'
                  b.style.boxShadow = '0 0 16px rgba(0,212,255,0.12)'
                }
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = 'rgba(0,212,255,0.06)'
                b.style.borderColor = 'rgba(0,212,255,0.25)'
                b.style.boxShadow = 'none'
              }}
              aria-label="Get AI suggestions"
            >
              {aiState.loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span style={{ fontSize: 13 }}>💡</span>
              )}
              Get Ideas
            </motion.button>

            {aiState.open && (
              <button
                onClick={() => setAIState((s) => ({ ...s, open: false }))}
                className="text-[9px] font-hud tracking-widest uppercase focus:outline-none transition-colors duration-150"
                style={{ color: 'rgba(0,212,255,0.4)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = '#00D4FF')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,212,255,0.4)')
                }
              >
                Hide Panel
              </button>
            )}
          </div>
        </div>

        {/* ── AI Side Panel ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {aiState.open && (
            <AIPanel
              aiState={aiState}
              onClose={() => setAIState((s) => ({ ...s, open: false }))}
            />
          )}
        </AnimatePresence>
      </div>
    </PanelWrapper>
  )
}
