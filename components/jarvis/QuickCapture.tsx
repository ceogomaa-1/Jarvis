'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type Destination = 'task' | 'note' | 'idea'

interface QuickCaptureProps {
  cmdOpen?: boolean
  onCmdClose?: () => void
}

export function QuickCapture({ cmdOpen, onCmdClose }: QuickCaptureProps) {
  const queryClient = useQueryClient()
  const [captureOpen, setCaptureOpen] = useState(false)
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

  const closeCapture = useCallback(() => { setCaptureOpen(false); setText('') }, [])

  // Q key shortcut for quick capture
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); setCaptureOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Escape closes everything
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (captureOpen) closeCapture()
        if (cmdOpen) onCmdClose?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [captureOpen, cmdOpen, closeCapture, onCmdClose])

  // Ctrl+Enter to save as task
  useEffect(() => {
    if (!captureOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) capture('task')
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [captureOpen, text]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (captureOpen) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [captureOpen])

  const capture = useCallback(async (dest: Destination) => {
    const content = text.trim()
    if (!content) return
    setSaving(true)
    try {
      if (dest === 'task') {
        await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: content, priority: 'normal' }) })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        showToast('Captured as Task ✓')
      } else if (dest === 'note') {
        const title = content.slice(0, 40) + (content.length > 40 ? '...' : '')
        await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content: { text: content }, tags: [] }) })
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        showToast('Captured as Note ✓')
      } else {
        const title = content.slice(0, 40) + (content.length > 40 ? '...' : '')
        await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content: { text: content }, tags: ['idea'] }) })
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        showToast('Captured as Idea ✓')
      }
      closeCapture()
    } catch {
      showToast('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }, [text, closeCapture, queryClient, showToast])

  return (
    <>
      {/* FAB */}
      <button
        className="fab"
        onClick={() => setCaptureOpen(true)}
        aria-label="Quick capture (Q)"
        title="Quick Capture (Q)"
      >
        +
      </button>

      {/* ⌘K Command palette */}
      {cmdOpen && (
        <div className="cmdk-overlay" onClick={onCmdClose}>
          <div className="cmdk" onClick={(e) => e.stopPropagation()}>
            <div className="cmdk-input">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input autoFocus placeholder="Ask Jarvis, jump to, or run a command…" />
              <span className="esc">ESC</span>
            </div>
            <div className="cmdk-list">
              <div className="cmdk-section-label">Actions</div>
              {[
                { label: 'New task', shortcut: 'T' },
                { label: 'New note', shortcut: 'N' },
                { label: 'Quick capture', shortcut: 'Q' },
              ].map((item) => (
                <button key={item.label} className="cmdk-item" onClick={() => { onCmdClose?.(); if (item.label === 'Quick capture') setCaptureOpen(true) }}>
                  <span>+</span>
                  <span>{item.label}</span>
                  <span className="shortcut">{item.shortcut}</span>
                </button>
              ))}
              <div className="cmdk-section-label">Ask Jarvis</div>
              <button className="cmdk-item" onClick={onCmdClose}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8L12 3z"/>
                </svg>
                <span>Summarize today in one sentence</span>
                <span className="shortcut">⏎</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick capture modal */}
      {captureOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCapture() }}>
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="modal-title">Quick Capture</span>
              <button onClick={closeCapture} className="modal-close">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="modal-textarea"
              placeholder="What's on your mind? (Ctrl+Enter to save as task)"
            />

            <div className="modal-actions">
              <button onClick={() => capture('task')} disabled={!text.trim() || saving} className="modal-btn primary">
                + Task
              </button>
              <button onClick={() => capture('note')} disabled={!text.trim() || saving} className="modal-btn">
                📝 Note
              </button>
              <button onClick={() => capture('idea')} disabled={!text.trim() || saving} className="modal-btn">
                💡 Idea
              </button>
            </div>

            <div className="modal-hint">Ctrl+Enter → Task &nbsp;·&nbsp; Esc → Close &nbsp;·&nbsp; Shortcut: Q</div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast fade-in-up">{toast}</div>}
    </>
  )
}
