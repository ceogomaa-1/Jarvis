'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Priority, Task } from '@/types'

type TaskResponse = { tasks: Task[] }

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks', { cache: 'no-store' })
  if (res.status === 401) return []
  if (!res.ok) throw new Error('Failed to load tasks')
  const data = (await res.json()) as TaskResponse
  return data.tasks ?? []
}

export function TasksPanel() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), priority }),
      })
      if (!res.ok) throw new Error('Failed to create task')
      return res.json()
    },
    onSuccess: () => { setTitle(''); queryClient.invalidateQueries({ queryKey: ['tasks'] }) },
  })

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const updateTitle = useMutation({
    mutationFn: async ({ id, title: newTitle }: { id: string; title: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: newTitle }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const open = useMemo(() => tasks.filter((t) => !t.completed), [tasks])
  const done = useMemo(() => tasks.filter((t) => t.completed), [tasks])

  const cyclePriority = () => {
    setPriority((p) => p === 'normal' ? 'high' : p === 'high' ? 'critical' : 'normal')
  }

  return (
    <>
      {/* Add task row */}
      <div className="task-add">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          placeholder="Add a task — ⏎ to save"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) createTask.mutate() }}
        />
        <button className="tag-pick" onClick={cyclePriority}>{priority}</button>
        <button
          onClick={() => createTask.mutate()}
          disabled={!title.trim() || createTask.isPending}
          style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent)', color: 'var(--bg)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: !title.trim() ? 0.5 : 1 }}
        >
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span style={{ color: 'var(--text-mute)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="workspace-empty" style={{ minHeight: 120 }}>
          <span>No tasks yet — add one above.</span>
        </div>
      ) : (
        <>
          <div className="tasklist">
            {open.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={() => toggleTask.mutate(task)} onDel={() => deleteTask.mutate(task.id)} onRename={(t) => updateTitle.mutate({ id: task.id, title: t })} />
            ))}
          </div>
          {done.length > 0 && (
            <>
              <div style={{ marginTop: 18, marginBottom: 6, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Completed · {done.length}
              </div>
              <div className="tasklist">
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask.mutate(task)} onDel={() => deleteTask.mutate(task.id)} onRename={(t) => updateTitle.mutate({ id: task.id, title: t })} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

function TaskRow({ task, onToggle, onDel, onRename }: { task: Task; onToggle: () => void; onDel: () => void; onRename: (t: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const priClass = task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : 'normal'

  return (
    <div className="task-row">
      <button className={`task-check ${task.completed ? 'done' : ''}`} onClick={onToggle} aria-label="Toggle task">
        {task.completed && (
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft.trim()) onRename(draft.trim()); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) { onRename(draft.trim()); setEditing(false) }
            if (e.key === 'Escape') setEditing(false)
          }}
          style={{ flex: 1, fontSize: 13, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--accent-line)', borderRadius: 6, padding: '2px 8px', outline: 'none' }}
        />
      ) : (
        <span
          className={`task-title ${task.completed ? 'done' : ''}`}
          onDoubleClick={() => { setDraft(task.title); setEditing(true) }}
          title="Double-click to edit"
          style={{ cursor: 'text' }}
        >
          {task.title}
        </span>
      )}

      <span className={`task-pri ${priClass}`}>{task.priority}</span>
      <button className="task-del" onClick={onDel} aria-label="Delete task">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        </svg>
      </button>
    </div>
  )
}
