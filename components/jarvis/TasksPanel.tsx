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

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  })

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
    onSuccess: () => {
      setTitle('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const completed = useMemo(() => tasks.filter((task) => task.completed).length, [tasks])

  const headerRight = (
    <div className="workspace-badge workspace-badge--info">
      {completed}/{tasks.length || 0} done
    </div>
  )

  return (
    <PanelWrapper title="Tasks" icon={<ListTodo size={16} />} headerRight={headerRight} className="h-full">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && title.trim()) createTask.mutate()
            }}
            className="workspace-input"
            placeholder="Add a task"
          />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className="workspace-select"
            style={{ width: 120 }}
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
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="workspace-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="workspace-empty">
              <span>Loading your tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="workspace-empty">
              <CheckCircle2 size={20} />
              <span>No tasks yet.</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Create your first task and it will show up here.
              </span>
            </div>
          ) : (
            <div className="workspace-list">
              {tasks.map((task) => {
                const badge = priorityStyles[task.priority]

                return (
                  <div
                    key={task.id}
                    className="workspace-card flex items-start gap-3 p-5"
                    style={{ opacity: task.completed ? 0.65 : 1 }}
                  >
                    <button
                      onClick={() => toggleTask.mutate(task)}
                      className="mt-0.5"
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.completed ? (
                        <CheckCircle2 size={18} color="var(--success)" />
                      ) : (
                        <Circle size={18} color="var(--text-muted)" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          textDecoration: task.completed ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className={badge.className}>{badge.label}</span>
                        {task.due_date ? (
                          <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask.mutate(task.id)}
                      className="workspace-button workspace-button--danger"
                      style={{ padding: 10 }}
                      aria-label="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PanelWrapper>
  )
}
