# JARVIS Command Center

> *"Sometimes you gotta run before you can walk."*

A personal AI-powered productivity dashboard — Tony Stark's HUD meets a premium dark-mode SaaS tool. Built with Next.js 14, TypeScript, Tailwind CSS, Supabase, and real external APIs.

---

## 🖥️ What You Get

| Panel | Description | API |
|-------|-------------|-----|
| 📰 **AI Intel Feed** | Top AI/ML news, filtered by category | HN Algolia (free) / NewsAPI |
| 💰 **Net Worth** | Crypto + stocks + portfolio tracker with charts | CoinGecko (free) / Alpha Vantage |
| ✅ **Mission Queue** | Task manager with priorities, due dates, drag-sort | Supabase |
| 📝 **Neural Notes** | Rich text notes with AI idea generation | Supabase + Anthropic |
| 📅 **Timeline** | Calendar with today's events + mini month view | Google Calendar API |
| 📧 **Comms Incoming** | Filtered email digest by keywords | Gmail API |

---

## ⚡ Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` — see API Keys Setup below.

### 3. Set up Supabase database

1. Create a project at https://supabase.com
2. Go to **SQL Editor** and paste `supabase/migrations/001_initial_schema.sql`
3. Click **Run**
4. Copy your project URL and anon key into `.env.local`

### 4. Enable Google OAuth in Supabase

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add your Google Client ID and Secret
4. Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 — you'll land on the login page with the boot sequence animation.

---

## 🔑 API Keys Setup

### Supabase (Required for auth + data persistence)
1. Create project at https://supabase.com
2. Settings → API → copy Project URL and anon public key
3. Also copy the service_role key (keep secret — server-side only)

### OpenWeatherMap (Weather Widget)
1. Register at https://openweathermap.org/api
2. Free tier: 1,000 calls/day
3. Set NEXT_PUBLIC_WEATHER_CITY to your city name (e.g., Cairo, London, New York)

### NewsAPI (AI News Panel)
1. Register at https://newsapi.org/register
2. Free tier: 100 requests/day
3. Note: Without this key, the panel uses HN Algolia API (completely free, no key needed)

### Alpha Vantage (Stock Quotes)
1. Get free key at https://www.alphavantage.co/support/#api-key
2. Free tier: 25 requests/day
3. Note: CoinGecko (crypto prices) works without any API key

### Anthropic (AI Notes Suggestions)
1. Get API key at https://console.anthropic.com/
2. Without this key, mock AI suggestions are returned

### Google OAuth Setup (Calendar + Gmail)

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable APIs: Google Calendar API + Gmail API
4. OAuth Consent Screen:
   - User Type: External
   - Add scopes: email, profile, calendar.readonly, gmail.readonly
   - Add yourself as a test user
5. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - http://localhost:3000/auth/callback (development)
     - https://yourdomain.com/auth/callback (production)
6. Copy Client ID and Client Secret to .env.local

---

## 🗄️ Database Schema

Tables created by the migration:

- tasks — Task manager with priorities, due dates, positions
- notes — Rich text notes (TipTap JSON) with tags
- portfolio_items — Stock/crypto/manual portfolio entries
- net_worth_snapshots — Historical net worth for trend chart
- email_filters — User-configured email filter keywords

All tables have Row Level Security (RLS) — users only access their own data.

---

## 🏗️ Project Structure

```
jarvis-dashboard/
├── app/
│   ├── api/
│   │   ├── news/route.ts          # HN Algolia + NewsAPI
│   │   ├── finance/route.ts       # CoinGecko + Alpha Vantage
│   │   ├── weather/route.ts       # OpenWeatherMap
│   │   ├── tasks/route.ts         # Supabase CRUD
│   │   ├── notes/ai/route.ts      # Anthropic AI suggestions
│   │   └── email-digest/route.ts  # Gmail API (mock ready)
│   ├── auth/callback/route.ts     # Supabase OAuth callback
│   ├── dashboard/
│   │   ├── layout.tsx             # React Query provider
│   │   └── page.tsx               # Main 12-column dashboard
│   ├── login/page.tsx             # Boot sequence + Google OAuth
│   ├── globals.css                # HUD design system
│   └── layout.tsx
├── components/
│   ├── jarvis/
│   │   ├── HUDTopBar.tsx          # Live clock, weather, avatar
│   │   ├── PanelWrapper.tsx       # Shared HUD panel shell
│   │   ├── NewsPanel.tsx
│   │   ├── FinancePanel.tsx
│   │   ├── TasksPanel.tsx
│   │   ├── NotesPanel.tsx
│   │   ├── CalendarPanel.tsx
│   │   └── EmailPanel.tsx
│   └── Providers.tsx
├── lib/
│   ├── supabase.ts                # Browser client
│   ├── supabase-server.ts         # Server client
│   └── mockData.ts                # Fallback data
├── store/index.ts                 # Zustand state
├── types/index.ts                 # TypeScript types
└── supabase/migrations/001_initial_schema.sql
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | #080A0F | Page background |
| Surface | #0D1117 | Panel backgrounds |
| Cyan | #00D4FF | Primary accent, borders, headings |
| Amber | #FFB830 | Finance panel, alerts |
| Success | #00FF88 | Positive values, completions |
| Danger | #FF3B5C | Errors, negative values |
| Font Display | Orbitron | JARVIS logo, large numbers |
| Font HUD | Rajdhani | Panel titles, labels |
| Font Body | Sora | Content, descriptions |

---

## 🔧 Development Notes

- All panels work without API keys using realistic mock data
- If NEXT_PUBLIC_SUPABASE_URL is not configured, dashboard loads without auth for dev
- React Query caches: news 15min, weather 30min, finance 60s
- AI notes requires Anthropic key; returns smart mocks without it

---

## 🚀 Deployment (Vercel)

```bash
npx vercel
```

Add all environment variables in Vercel dashboard → Settings → Environment Variables.
Update OAuth redirect URIs to include your production domain.

---

*Built for one Commander. Designed to feel like a sci-fi movie.*
