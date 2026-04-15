'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, ListTodo, Plus, Trash2 } from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { Priority, Task } from '@/types'

type TaskResponse = { tasks: Task[] }

const priorityStyles: Record<Priority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'workspace-badge workspace-badge--danger' },
  high: { label: 'High', className: 'workspace-badge workspace-badge--warm' },
  normal: { label: 'Normal', className: 'workspace-badge workspace-badge--success' },
}

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

  const completed = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])

  return (
    <PanelWrapper
      title="Tasks"
      icon={<ListTodo size={14} />}
      headerRight={<div className="workspace-badge workspace-badge--info">{completed}/{tasks.length || 0} done</div>}
      className="h-full"
    >
      {/* add row — always pinned */}
      <div className="flex flex-shrink-0 gap-2 pb-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) createTask.mutate() }}
          className="workspace-input"
          placeholder="Add a task"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="workspace-select"
          style={{ width: 100 }}
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={() => createTask.mutate()}
          disabled={!title.trim() || createTask.isPending}
          className="workspace-button workspace-button--primary"
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="workspace-empty h-full"><span>Loading tasks...</span></div>
        ) : tasks.length === 0 ? (
          <div className="workspace-empty h-full">
            <CheckCircle2 size={18} />
            <span>No tasks yet.</span>
          </div>
        ) : (
          <div className="workspace-list">
            {tasks.map((task) => {
              const badge = priorityStyles[task.priority]
              return (
                /* single-row task: ~42px tall */
                <div
                  key={task.id}
                  className="workspace-card flex items-center gap-2 px-3 py-2"
                  style={{ opacity: task.completed ? 0.6 : 1 }}
                >
                  <button
                    onClick={() => toggleTask.mutate(task)}
                    className="flex-shrink-0"
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed
                      ? <CheckCircle2 size={16} color="var(--success)" />
                      : <Circle size={16} color="var(--text-muted)" />}
                  </button>

                  <span
                    className="min-w-0 flex-1 truncate-1"
                    style={{ fontSize: 13, fontWeight: 700, textDecoration: task.completed ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </span>

                  <span className={badge.className} style={{ flexShrink: 0 }}>{badge.label}</span>

                  {task.due_date ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  ) : null}

                  <button
                    onClick={() => deleteTask.mutate(task.id)}
                    className="workspace-button workspace-button--danger flex-shrink-0"
                    style={{ padding: '4px 8px' }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PanelWrapper>
  )
}
