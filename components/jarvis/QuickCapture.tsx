'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type Destination = 'task' | 'note' | 'idea'

export function QuickCapture() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setText('')
  }, [])

  // Q key shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  // Ctrl+Enter to save as task
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        capture('task')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, text]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autofocus textarea when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  const capture = useCallback(async (dest: Destination) => {
    const content = text.trim()
    if (!content) return
    setSaving(true)

    try {
      if (dest === 'task') {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content, priority: 'normal' }),
        })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        showToast('Captured as Task ✓')
      } else if (dest === 'note') {
        const title = content.slice(0, 40) + (content.length > 40 ? '...' : '')
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: { text: content }, tags: [] }),
        })
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        showToast('Captured as Note ✓')
      } else {
        const title = content.slice(0, 40) + (content.length > 40 ? '...' : '')
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: { text: content }, tags: ['idea'] }),
        })
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        showToast('Captured as Idea ✓')
      }
      close()
    } catch {
      showToast('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }, [text, close, queryClient, showToast])

  return (
    <>
      {/* FAB */}
      <button
        className="fab-button"
        onClick={() => setOpen(true)}
        aria-label="Quick capture (Q)"
        title="Quick Capture (Q)"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Modal */}
      {open ? (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="modal-card fade-in-up">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Quick Capture</span>
              <button onClick={close} className="workspace-button" style={{ padding: '4px 8px' }}>
                <X size={13} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="workspace-textarea workspace-scroll"
              placeholder="What's on your mind? (Ctrl+Enter to save as task)"
              style={{ minHeight: 120, resize: 'none', marginBottom: 14 }}
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => capture('task')}
                disabled={!text.trim() || saving}
                className="workspace-button workspace-button--primary"
                style={{ flex: 1 }}
              >
                + Task
              </button>
              <button
                onClick={() => capture('note')}
                disabled={!text.trim() || saving}
                className="workspace-button workspace-button--soft"
                style={{ flex: 1 }}
              >
                📝 Note
              </button>
              <button
                onClick={() => capture('idea')}
                disabled={!text.trim() || saving}
                className="workspace-button"
                style={{ flex: 1 }}
              >
                💡 Idea
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              Ctrl+Enter → Task &nbsp;·&nbsp; Esc → Close &nbsp;·&nbsp; Shortcut: Q
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div className="toast fade-in-up">
          {toast}
        </div>
      ) : null}
    </>
  )
}
