import { create } from 'zustand'
import type { Task, Note, PortfolioItem } from '@/types'

// ============================================================
// JARVIS Store — Global State via Zustand
// ============================================================

interface JarvisStore {
  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void

  // Notes
  notes: Note[]
  setNotes: (notes: Note[]) => void
  activeNoteId: string | null
  setActiveNoteId: (id: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => void

  // Portfolio
  portfolioItems: PortfolioItem[]
  setPortfolioItems: (items: PortfolioItem[]) => void

  // UI State
  isNewsRefreshing: boolean
  setIsNewsRefreshing: (v: boolean) => void
  lastNewsRefresh: Date | null
  setLastNewsRefresh: (d: Date) => void
}

export const useJarvisStore = create<JarvisStore>((set) => ({
  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  reorderTasks: (tasks) => set({ tasks }),

  // Notes
  notes: [],
  setNotes: (notes) => set({ notes }),
  activeNoteId: null,
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  // Portfolio
  portfolioItems: [],
  setPortfolioItems: (portfolioItems) => set({ portfolioItems }),

  // UI
  isNewsRefreshing: false,
  setIsNewsRefreshing: (v) => set({ isNewsRefreshing: v }),
  lastNewsRefresh: null,
  setLastNewsRefresh: (d) => set({ lastNewsRefresh: d }),
}))
