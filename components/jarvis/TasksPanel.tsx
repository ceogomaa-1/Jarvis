'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Flag,
  Calendar,
  GripVertical,
  X,
} from 'lucide-react'
import { PanelWrapper } from '@/components/jarvis/PanelWrapper'
import type { Task, Priority } from '@/types'

// ─── Mock initial tasks ──────────────────────────────────────────────────────

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowStr = tomorrow.toISOString().split('T')[0]

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    user_id: 'local',
    title: 'Review Q2 product roadmap',
    priority: 'critical',
    due_date: null,
    completed: false,
    position: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    user_id: 'local',
    title: 'Send invoice to Acme Corp',
    priority: 'high',
    due_date: null,
    completed: false,
    position: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    user_id: 'local',
    title: 'Refactor auth middleware',
    priority: 'normal',
    due_date: null,
    completed: false,
    position: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-4',
    user_id: 'local',
    title: 'Morning workout',
    priority: 'normal',
    due_date: null,
    completed: true,
    position: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-5',
    user_id: 'local',
    title: 'Weekly team sync prep',
    priority: 'high',
    due_date: tomorrowStr,
    completed: false,
    position: 4,
    created_at: new Date().toISOString(),
  },
]

// ─── Priority helpers ────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; emoji: string; bg: string; text: string; border: string }
> = {
  critical: {
    label: 'CRITICAL',
    emoji: '🔴',
    bg: 'rgba(239,68,68,0.15)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.35)',
  },
  high: {
    label: 'HIGH',
    emoji: '🟡',
    bg: 'rgba(234,179,8,0.15)',
    text: '#facc15',
    border: 'rgba(234,179,8,0.35)',
  },
  normal: {
    label: 'NORMAL',
    emoji: '🟢',
    bg: 'rgba(34,197,94,0.12)',
    text: '#4ade80',
    border: 'rgba(34,197,94,0.3)',
  },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase shrink-0"
      style={{
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span style={{ fontSize: 8 }}>{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}

function DueDateBadge({ dateStr }: { dateStr: string }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const isOverdue = due < today
  const isToday = due.getTime() === today.getTime()

  const label = isToday
    ? 'Today'
    : isOverdue
    ? `${Math.ceil((today.getTime() - due.getTime()) / 86400000)}d overdue`
    : due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] shrink-0"
      style={{
        color: isOverdue ? '#f87171' : 'rgba(0,212,255,0.55)',
      }}
    >
      <Calendar size={9} />
      {label}
    </span>
  )
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 28
  const stroke = 4
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const progress = total === 0 ? 0 : completed / total
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div className="flex items-center gap-3 px-1 py-0.5">
      <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
        {/* Track */}
        <svg
          width={radius * 2}
          height={radius * 2}
          className="absolute inset-0 -rotate-90"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(0,212,255,0.1)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="#00D4FF"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))',
            }}
          />
        </svg>
        <span className="font-hud text-sm font-bold" style={{ color: '#00D4FF' }}>
          {completed}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-hud text-[11px] font-semibold" style={{ color: '#00D4FF' }}>
          {completed}/{total} Completed
        </span>
        <span className="text-[10px]" style={{ color: 'rgba(0,212,255,0.45)' }}>
          {total === 0 ? 'No tasks' : progress === 1 ? 'All done!' : `${Math.round(progress * 100)}% done today`}
        </span>
      </div>
    </div>
  )
}

// ─── Task item ────────────────────────────────────────────────────────────────

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start gap-2 rounded px-2 py-2 group cursor-default select-none"
      style={{
        background: hovered ? 'rgba(0,212,255,0.04)' : 'transparent',
        borderBottom: '1px solid rgba(0,212,255,0.06)',
      }}
    >
      {/* Drag handle */}
      <motion.div
        animate={{ opacity: hovered ? 0.4 : 0 }}
        transition={{ duration: 0.15 }}
        className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing"
        style={{ color: 'rgba(0,212,255,0.5)' }}
      >
        <GripVertical size={14} />
      </motion.div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="mt-0.5 shrink-0 transition-all duration-150 hover:scale-110 focus:outline-none"
        style={{ color: task.completed ? '#00D4FF' : 'rgba(0,212,255,0.35)' }}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {task.completed ? (
            <motion.span
              key="checked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="block"
            >
              <CheckCircle2 size={16} />
            </motion.span>
          ) : (
            <motion.span
              key="unchecked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="block"
            >
              <Circle size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span
          className="text-[12px] leading-snug break-words"
          style={{
            color: task.completed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)',
            textDecoration: task.completed ? 'line-through' : 'none',
            transition: 'color 0.2s, text-decoration 0.2s',
          }}
        >
          {task.title}
        </span>
        <div className="flex items-center flex-wrap gap-1.5">
          <PriorityBadge priority={task.priority} />
          {task.due_date && <DueDateBadge dateStr={task.due_date} />}
        </div>
      </div>

      {/* Delete button */}
      <motion.button
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => onDelete(task.id)}
        className="mt-0.5 shrink-0 rounded p-0.5 focus:outline-none"
        style={{ color: 'rgba(239,68,68,0.6)' }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(239,68,68,0.6)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
        aria-label="Delete task"
      >
        <X size={13} />
      </motion.button>
    </motion.div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today')
  const [inputValue, setInputValue] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('normal')
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: press 't' to focus add input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (
        e.key === 't' &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Tab filtering
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'today') {
      // show tasks with no due date or due today/past
      if (!t.due_date) return true
      const due = new Date(t.due_date + 'T00:00:00')
      return due <= today
    } else {
      // upcoming: due after today
      if (!t.due_date) return false
      const due = new Date(t.due_date + 'T00:00:00')
      return due > today
    }
  })

  const completedCount = filteredTasks.filter((t) => t.completed).length
  const totalCount = filteredTasks.length

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addTask = useCallback(() => {
    const title = inputValue.trim()
    if (!title) return

    const newTask: Task = {
      id: `task-${Date.now()}`,
      user_id: 'local',
      title,
      priority: newPriority,
      due_date: activeTab === 'upcoming' ? tomorrowStr : null,
      completed: false,
      position: tasks.length,
      created_at: new Date().toISOString(),
    }
    setTasks((prev) => [...prev, newTask])
    setInputValue('')
  }, [inputValue, newPriority, activeTab, tasks.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTask()
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur()
      setInputValue('')
    }
  }

  return (
    <PanelWrapper
      title="MISSION QUEUE"
      icon={<CheckCircle2 size={13} />}
      noPad
    >
      <div className="flex flex-col h-full">
        {/* Progress ring + tabs row */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
        >
          <ProgressRing completed={completedCount} total={totalCount} />

          {/* Tab toggle */}
          <div
            className="flex rounded overflow-hidden text-[10px] font-semibold tracking-widest"
            style={{ border: '1px solid rgba(0,212,255,0.2)' }}
          >
            {(['today', 'upcoming'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 uppercase transition-colors duration-150 focus:outline-none"
                style={{
                  background: activeTab === tab ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: activeTab === tab ? '#00D4FF' : 'rgba(0,212,255,0.4)',
                  borderRight: tab === 'today' ? '1px solid rgba(0,212,255,0.2)' : undefined,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-1 py-1"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,212,255,0.2) transparent',
          }}
        >
          <AnimatePresence initial={false}>
            {filteredTasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-2"
              >
                <CheckCircle2 size={28} style={{ color: 'rgba(0,212,255,0.2)' }} />
                <span className="text-[11px]" style={{ color: 'rgba(0,212,255,0.35)' }}>
                  {activeTab === 'today' ? 'All clear, agent.' : 'No upcoming missions.'}
                </span>
              </motion.div>
            ) : (
              filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Quick-add input */}
        <div
          className="shrink-0 px-2 py-2 flex items-center gap-2"
          style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}
        >
          {/* Priority selector */}
          <div className="relative shrink-0">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="appearance-none text-[10px] font-semibold rounded px-2 py-1.5 pr-4 focus:outline-none cursor-pointer"
              style={{
                background: PRIORITY_CONFIG[newPriority].bg,
                color: PRIORITY_CONFIG[newPriority].text,
                border: `1px solid ${PRIORITY_CONFIG[newPriority].border}`,
              }}
              aria-label="Priority"
            >
              <option value="normal">🟢 NORMAL</option>
              <option value="high">🟡 HIGH</option>
              <option value="critical">🔴 CRITICAL</option>
            </select>
            <span
              className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[8px]"
              style={{ color: PRIORITY_CONFIG[newPriority].text }}
            >
              ▾
            </span>
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New mission… (press T)"
            className="flex-1 min-w-0 text-[12px] bg-transparent focus:outline-none placeholder:opacity-30"
            style={{
              color: 'rgba(255,255,255,0.85)',
              caretColor: '#00D4FF',
            }}
            aria-label="Add new task"
          />

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={addTask}
            disabled={!inputValue.trim()}
            className="shrink-0 rounded p-1.5 focus:outline-none transition-all duration-150 disabled:opacity-25"
            style={{
              background: inputValue.trim() ? 'rgba(0,212,255,0.15)' : 'transparent',
              border: '1px solid rgba(0,212,255,0.25)',
              color: '#00D4FF',
            }}
            aria-label="Add task"
          >
            <Plus size={14} />
          </motion.button>
        </div>
      </div>
    </PanelWrapper>
  )
}
