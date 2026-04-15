// ============================================================
// JARVIS COMMAND CENTER — TypeScript Types
// ============================================================

// --- Task ---
export type Priority = 'critical' | 'high' | 'normal'

export interface Task {
  id: string
  user_id: string
  title: string
  priority: Priority
  due_date: string | null
  completed: boolean
  position: number
  created_at: string
}

// --- Note ---
export interface Note {
  id: string
  user_id: string
  title: string
  content: Record<string, unknown>
  tags: string[]
  created_at: string
  updated_at: string
}

// --- Portfolio ---
export type AssetType = 'stock' | 'crypto' | 'manual'

export interface PortfolioItem {
  id: string
  user_id: string
  ticker: string
  type: AssetType
  name: string | null
  quantity: number
  manual_value: number | null
  created_at: string
  // Runtime-computed (not in DB)
  currentPrice?: number
  change24h?: number
  totalValue?: number
  sparkline?: number[]
}

// --- Net Worth ---
export interface NetWorthSnapshot {
  id: string
  user_id: string
  total_value: number
  snapshot_date: string
  created_at: string
}

// --- Email Filter ---
export interface EmailFilter {
  id: string
  user_id: string
  keyword: string
  created_at: string
}

// --- News ---
export interface NewsArticle {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  description: string | null
  category: NewsCategory
  imageUrl?: string | null
}

export type NewsCategory = 'all' | 'llms' | 'tools' | 'research'

// --- Finance API ---
export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
}

export interface CryptoQuote {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  sparkline_in_7d?: { price: number[] }
  market_cap?: number
}

// --- Weather ---
export interface WeatherData {
  city: string
  temp: number
  feels_like: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
}

// --- Calendar ---
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  color: string
  location?: string | null
  meetingUrl?: string | null
  description?: string | null
}

// --- Email ---
export interface EmailMessage {
  id: string
  threadId: string
  from: string
  fromEmail: string
  subject: string
  preview: string
  receivedAt: string
  isRead: boolean
  isImportant: boolean
  gmailUrl: string
}

// --- Planner ---
export interface PlannerEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  notes?: string
}

// --- AI Suggestions ---
export interface AISuggestion {
  type: 'idea' | 'next_step' | 'related_topic' | 'question'
  content: string
}

// --- Dashboard State ---
export interface DashboardState {
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
  } | null
  isInitializing: boolean
}

// --- Day Score ---
export interface DayScore {
  id: string
  user_id: string
  score: number
  note: string | null
  date: string
  created_at: string
}

// --- Finance Profile ---
export interface FinanceExpense {
  id: string
  name: string
  amount: number
  category: 'Housing' | 'Food' | 'Transport' | 'Subscriptions' | 'Debt' | 'Other'
}

export interface FinanceProfile {
  id: string
  user_id: string
  income: number
  income_frequency: 'weekly' | 'biweekly' | 'monthly'
  expenses: FinanceExpense[]
}

// --- Finance Goals ---
export interface FinanceGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_saved: number
  deadline: string | null
  created_at: string
}

// --- Finance Chat ---
export interface FinanceChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// --- Email Smart Filter ---
export interface EmailFilterConfig {
  id: string
  user_id: string
  keywords: string[]
  filter_enabled: boolean
}
