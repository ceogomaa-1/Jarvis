'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Smartphone, QrCode, ArrowRight, Home, CheckSquare, Mail, CalendarDays, Newspaper, TrendingUp, Target, Moon, LogOut, Settings, Zap, Timer } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BriefingPanel } from '@/components/jarvis/BriefingPanel'
import { TasksPanel } from '@/components/jarvis/TasksPanel'
import { NewsPanel } from '@/components/jarvis/NewsPanel'
import { FinancePanel } from '@/components/jarvis/FinancePanel'
import { EmailPanel } from '@/components/jarvis/EmailPanel'
import { MyGoalPanel } from '@/components/jarvis/MyGoalPanel'
import { SubscriptionsPanel } from '@/components/jarvis/SubscriptionsPanel'
import { GoogleCalendarPanel } from '@/components/jarvis/GoogleCalendarPanel'
import { HUDTopBar } from '@/components/jarvis/HUDTopBar'
import { QuickCapture } from '@/components/jarvis/QuickCapture'
import { DayScore } from '@/components/jarvis/DayScore'
import { NotesPanel } from '@/components/jarvis/NotesPanel'
import { FinanceAgentPanel } from '@/components/jarvis/FinanceAgentPanel'

interface UserInfo {
  id: string
  email: string
  name?: string
}

interface MfaState {
  needsSetup: boolean
  needsVerification: boolean
  qrCode: string | null
  factorId: string | null
  secret: string | null
  error: string | null
  loading: boolean
}

async function persistGoogleProviderTokens(providerToken?: string | null, providerRefreshToken?: string | null) {
  if (!providerToken && !providerRefreshToken) return
  await fetch('/api/email-digest/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerToken, providerRefreshToken }),
  }).catch(() => null)
}

function SecurityGate({
  state, code, onCodeChange, onEnroll, onVerify,
}: {
  state: MfaState; code: string; onCodeChange: (v: string) => void; onEnroll: () => void; onVerify: () => void
}) {
  const title = state.needsSetup ? 'Add Microsoft Authenticator' : 'Verify Microsoft Authenticator'
  const description = state.needsSetup
    ? 'Scan the QR code with Microsoft Authenticator, then enter the 6-digit code to finish securing your account.'
    : 'Enter the 6-digit code from Microsoft Authenticator to continue to your dashboard.'

  return (
    <div className="workspace-shell flex min-h-screen items-center justify-center p-6">
      <div className="workspace-panel" style={{ maxWidth: 560, width: '100%' }}>
        <div className="workspace-panel__body">
          <div className="flex flex-col gap-5">
            <div className="workspace-badge workspace-badge--warm" style={{ width: 'fit-content' }}>
              <ShieldCheck size={14} /> Security step
            </div>
            <div>
              <h1 className="font-display" style={{ fontSize: 36, lineHeight: 1 }}>{title}</h1>
              <p style={{ marginTop: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>{description}</p>
            </div>
            {state.needsSetup ? (
              <>
                {!state.qrCode ? (
                  <button onClick={onEnroll} className="workspace-button workspace-button--primary">
                    <QrCode size={16} /> Generate QR code
                  </button>
                ) : (
                  <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                    <div className="workspace-card flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={state.qrCode} alt="Authenticator QR code" style={{ width: '100%', maxWidth: 180 }} />
                    </div>
                    <div className="workspace-card p-4">
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Use the Microsoft Authenticator app</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7 }}>
                        1. Open Microsoft Authenticator on your phone.<br />
                        2. Tap add account and scan the QR code.<br />
                        3. Enter the current 6-digit code below.
                      </div>
                      {state.secret ? (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
                          Backup secret: <span style={{ fontWeight: 700, color: 'var(--text)' }}>{state.secret}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="workspace-card flex items-center gap-3 p-4">
                <Smartphone size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 700 }}>Open Microsoft Authenticator</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>Use the code for your Jarvis account to unlock the dashboard.</div>
                </div>
              </div>
            )}
            {(state.qrCode || state.needsVerification) ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="workspace-input"
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
                <button onClick={onVerify} className="workspace-button workspace-button--primary" disabled={code.length !== 6 || state.loading}>
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            ) : null}
            {state.error ? (
              <div className="workspace-badge workspace-badge--danger" style={{ width: 'fit-content' }}>{state.error}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

type WorkspaceTab = 'tasks' | 'signals' | 'finance' | 'notes' | 'financeai'
type NavSection = 'today' | 'tasks' | 'inbox' | 'signals' | 'finance' | 'goals' | 'notes'

const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'signals', label: 'Signals' },
  { id: 'finance', label: 'Finance' },
  { id: 'notes', label: 'Notes' },
  { id: 'financeai', label: 'Finance AI' },
]

function WorkspacePanel({ defaultTab }: { defaultTab?: WorkspaceTab }) {
  const [tab, setTab] = useState<WorkspaceTab>(defaultTab ?? 'tasks')
  return (
    <div className="workspace">
      <div className="workspace-tabs">
        {WORKSPACE_TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div className="spacer" />
      </div>
      <div className="workspace-body workspace-scroll">
        {tab === 'tasks' && <TasksPanel />}
        {tab === 'signals' && <NewsPanel />}
        {tab === 'finance' && <FinancePanel />}
        {tab === 'notes' && <NotesPanel />}
        {tab === 'financeai' && <FinanceAgentPanel />}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaCode, setMfaCode] = useState('')
  const [navActive, setNavActive] = useState<NavSection>('today')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mfaState, setMfaState] = useState<MfaState>({
    needsSetup: false, needsVerification: false, qrCode: null,
    factorId: null, secret: null, error: null, loading: false,
  })

  const securityLabel = useMemo(() => {
    if (mfaState.needsSetup) return 'MFA setup required'
    if (mfaState.needsVerification) return 'Awaiting MFA'
    return 'MFA ready'
  }, [mfaState.needsSetup, mfaState.needsVerification])

  useEffect(() => {
    const supabase = getSupabaseClient()
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const currentUser = session.user
      await persistGoogleProviderTokens(session.provider_token, session.provider_refresh_token)
      setUser({ id: currentUser.id, email: currentUser.email ?? '', name: currentUser.user_metadata?.full_name ?? currentUser.user_metadata?.name ?? '' })
      const [{ data: aalData }, { data: factorsData }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ])
      const hasTotpFactor = (factorsData?.totp ?? []).length > 0
      const mustVerify = aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2'
      setMfaState((c) => ({ ...c, needsSetup: !hasTotpFactor, needsVerification: mustVerify, error: null }))
      setLoading(false)
    }
    syncSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.push('/login'); return }
      persistGoogleProviderTokens(session.provider_token, session.provider_refresh_token)
    })
    return () => subscription.unsubscribe()
  }, [router])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut()
    router.push('/login')
  }

  const enrollMfa = async () => {
    setMfaState((c) => ({ ...c, loading: true, error: null }))
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Microsoft Authenticator' })
    if (error || !data?.totp) {
      setMfaState((c) => ({ ...c, loading: false, error: error?.message ?? 'Could not generate QR code.' }))
      return
    }
    setMfaState((c) => ({ ...c, loading: false, qrCode: data.totp.qr_code, factorId: data.id, secret: data.totp.secret, error: null }))
  }

  const verifyMfa = async () => {
    const supabase = getSupabaseClient()
    const factorId = mfaState.factorId ?? (await supabase.auth.mfa.listFactors()).data?.totp?.[0]?.id
    if (!factorId) { setMfaState((c) => ({ ...c, error: 'No authenticator factor found yet.' })); return }
    setMfaState((c) => ({ ...c, loading: true, error: null }))
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !data?.id) {
      setMfaState((c) => ({ ...c, loading: false, error: challengeError?.message ?? 'Could not create MFA challenge.' }))
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: data.id, code: mfaCode })
    if (verifyError) { setMfaState((c) => ({ ...c, loading: false, error: verifyError.message })); return }
    setMfaCode('')
    setMfaState({ needsSetup: false, needsVerification: false, qrCode: null, factorId, secret: null, error: null, loading: false })
  }

  const hour = new Date().getHours()
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const greetingMap = { morning: 'Good morning,', afternoon: 'Good afternoon,', evening: 'Winding down,' }

  const navItems: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <Home size={15} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={15} /> },
    { id: 'inbox', label: 'Inbox', icon: <Mail size={15} /> },
    { id: 'signals', label: 'Signals', icon: <Newspaper size={15} /> },
    { id: 'finance', label: 'Finance', icon: <TrendingUp size={15} /> },
    { id: 'goals', label: 'Goals', icon: <Target size={15} /> },
    { id: 'notes', label: 'Notes', icon: <CalendarDays size={15} /> },
  ]

  const userName = user?.name || user?.email?.split('@')[0] || 'Mohamed'
  const userInitial = userName.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="workspace-shell flex min-h-screen items-center justify-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <span className="dot-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          Loading your workspace...
        </div>
      </div>
    )
  }

  if (mfaState.needsSetup || mfaState.needsVerification) {
    return (
      <SecurityGate state={mfaState} code={mfaCode} onCodeChange={setMfaCode} onEnroll={enrollMfa} onVerify={verifyMfa} />
    )
  }

  return (
    <>
      <div className="ambient" />
      <div className="shell">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark" />
            <div>
              <div className="brand-word">Jarvis</div>
              <div className="brand-sub">v4 · Personal OS</div>
            </div>
          </div>

          <div>
            <div className="nav-section-label">Workspace</div>
            <nav className="nav-list">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${navActive === item.id ? 'active' : ''}`}
                  onClick={() => setNavActive(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div>
            <div className="nav-section-label">Ambient</div>
            <nav className="nav-list">
              <button className="nav-item"><Zap size={15} /> <span>Quick capture</span></button>
              <button className="nav-item"><Timer size={15} /> <span>Focus mode</span></button>
              <button className="nav-item"><Moon size={15} /> <span>Wind-down</span></button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="user-chip">
              <div className="avatar">{userInitial}</div>
              <div className="user-meta">
                <span className="user-name">{userName}</span>
                <span className="user-role">{securityLabel}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="nav-item"
              style={{ color: 'var(--text-faint)', fontSize: 12, padding: '5px 4px' }}
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── Canvas ───────────────────────────────────────── */}
        <div className="canvas">
          {/* Main column */}
          <main className="main-col workspace-scroll">
            {/* Top bar */}
            <HUDTopBar
              userName={userName}
              tod={tod}
              greeting={greetingMap[tod]}
              onOpenCmd={() => setCmdOpen(true)}
            />

            {/* Briefing hero */}
            <BriefingPanel />

            {/* Workspace tabs */}
            <div className="section-head" style={{ marginTop: 4 }}>
              <h2>Workspace</h2>
              <span className="hint">tasks · signals · finance · notes</span>
            </div>
            <WorkspacePanel />
          </main>

          {/* Right rail */}
          <aside className="rail workspace-scroll">
            <div className="rail-section">
              <div className="rail-head">
                <span className="rail-title">Today's Schedule</span>
              </div>
              <GoogleCalendarPanel />
            </div>

            <div className="rail-section">
              <div className="rail-head">
                <span className="rail-title">Goal</span>
              </div>
              <MyGoalPanel />
            </div>

            <div className="rail-section">
              <div className="rail-head">
                <span className="rail-title">Inbox</span>
              </div>
              <EmailPanel />
            </div>

            <div className="rail-section">
              <div className="rail-head">
                <span className="rail-title">Subscriptions</span>
              </div>
              <SubscriptionsPanel />
            </div>
          </aside>
        </div>
      </div>

      {/* FAB — opens quick capture */}
      <QuickCapture cmdOpen={cmdOpen} onCmdClose={() => setCmdOpen(false)} />
    </>
  )
}
