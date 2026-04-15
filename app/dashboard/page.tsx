'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Smartphone, QrCode, ArrowRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { HUDTopBar } from '@/components/jarvis/HUDTopBar'
import { NewsPanel } from '@/components/jarvis/NewsPanel'
import { FinancePanel } from '@/components/jarvis/FinancePanel'
import { TasksPanel } from '@/components/jarvis/TasksPanel'
import { NotesPanel } from '@/components/jarvis/NotesPanel'
import { CalendarPanel } from '@/components/jarvis/CalendarPanel'
import { EmailPanel } from '@/components/jarvis/EmailPanel'

interface UserInfo {
  id: string
  email: string
  name?: string
}

type ThemeMode = 'light' | 'dark'

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      providerToken,
      providerRefreshToken,
    }),
  }).catch(() => null)
}

function SecurityGate({
  state,
  code,
  onCodeChange,
  onEnroll,
  onVerify,
}: {
  state: MfaState
  code: string
  onCodeChange: (value: string) => void
  onEnroll: () => void
  onVerify: () => void
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
              <ShieldCheck size={14} />
              Security step
            </div>

            <div>
              <h1 className="font-display" style={{ fontSize: 44, lineHeight: 0.95 }}>
                {title}
              </h1>
              <p style={{ marginTop: 12, color: 'var(--text-soft)', lineHeight: 1.7 }}>{description}</p>
            </div>

            {state.needsSetup ? (
              <>
                {!state.qrCode ? (
                  <button onClick={onEnroll} className="workspace-button workspace-button--primary">
                    <QrCode size={16} />
                    Generate QR code
                  </button>
                ) : (
                  <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                    <div className="workspace-card flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={state.qrCode} alt="Authenticator QR code" style={{ width: '100%', maxWidth: 180 }} />
                    </div>
                    <div className="workspace-card p-4">
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>Use the Microsoft Authenticator app</div>
                      <div style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.7 }}>
                        1. Open Microsoft Authenticator on your phone.
                        <br />
                        2. Tap add account and scan the QR code.
                        <br />
                        3. Enter the current 6-digit code below.
                      </div>
                      {state.secret ? (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-soft)' }}>
                          Backup secret: <span style={{ fontWeight: 800, color: 'var(--text)' }}>{state.secret}</span>
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
                  <div style={{ fontWeight: 800 }}>Open Microsoft Authenticator</div>
                  <div style={{ color: 'var(--text-soft)', fontSize: 14 }}>
                    Use the code for your Jarvis account to unlock the dashboard.
                  </div>
                </div>
              </div>
            )}

            {(state.qrCode || state.needsVerification) ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={code}
                  onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="workspace-input"
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
                <button onClick={onVerify} className="workspace-button workspace-button--primary" disabled={code.length !== 6 || state.loading}>
                  Continue
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : null}

            {state.error ? (
              <div className="workspace-badge workspace-badge--danger" style={{ width: 'fit-content' }}>
                {state.error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaCode, setMfaCode] = useState('')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [mfaState, setMfaState] = useState<MfaState>({
    needsSetup: false,
    needsVerification: false,
    qrCode: null,
    factorId: null,
    secret: null,
    error: null,
    loading: false,
  })

  const securityLabel = useMemo(() => {
    if (mfaState.needsSetup) return 'MFA setup required'
    if (mfaState.needsVerification) return 'Awaiting MFA'
    return 'MFA ready'
  }, [mfaState.needsSetup, mfaState.needsVerification])

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('jarvis-theme')
    const nextTheme: ThemeMode = savedTheme === 'dark' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const currentUser = session.user
      await persistGoogleProviderTokens(session.provider_token, session.provider_refresh_token)

      setUser({
        id: currentUser.id,
        email: currentUser.email ?? '',
        name: currentUser.user_metadata?.full_name ?? currentUser.user_metadata?.name ?? '',
      })

      const [{ data: aalData }, { data: factorsData }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ])

      const hasTotpFactor = (factorsData?.totp ?? []).length > 0
      const mustVerify = aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2'

      setMfaState((current) => ({
        ...current,
        needsSetup: !hasTotpFactor,
        needsVerification: mustVerify,
        error: null,
      }))

      setLoading(false)
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
        return
      }

      persistGoogleProviderTokens(session.provider_token, session.provider_refresh_token)
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('jarvis-theme', theme)
  }, [theme])

  const enrollMfa = async () => {
    setMfaState((current) => ({ ...current, loading: true, error: null }))
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Microsoft Authenticator',
    })

    if (error || !data?.totp) {
      setMfaState((current) => ({
        ...current,
        loading: false,
        error: error?.message ?? 'Could not generate the authenticator QR code.',
      }))
      return
    }

    setMfaState((current) => ({
      ...current,
      loading: false,
      qrCode: data.totp.qr_code,
      factorId: data.id,
      secret: data.totp.secret,
      error: null,
    }))
  }

  const verifyMfa = async () => {
    const supabase = getSupabaseClient()
    const factorId = mfaState.factorId ?? (await supabase.auth.mfa.listFactors()).data?.totp?.[0]?.id

    if (!factorId) {
      setMfaState((current) => ({ ...current, error: 'No authenticator factor found yet.' }))
      return
    }

    setMfaState((current) => ({ ...current, loading: true, error: null }))
    const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })

    if (challengeError || !data?.id) {
      setMfaState((current) => ({
        ...current,
        loading: false,
        error: challengeError?.message ?? 'Could not create an MFA challenge.',
      }))
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: data.id,
      code: mfaCode,
    })

    if (verifyError) {
      setMfaState((current) => ({
        ...current,
        loading: false,
        error: verifyError.message,
      }))
      return
    }

    setMfaCode('')
    setMfaState({
      needsSetup: false,
      needsVerification: false,
      qrCode: null,
      factorId,
      secret: null,
      error: null,
      loading: false,
    })
  }

  if (loading) {
    return (
      <div className="workspace-shell flex min-h-screen items-center justify-center">
        <div className="workspace-badge workspace-badge--info">Loading your workspace...</div>
      </div>
    )
  }

  if (mfaState.needsSetup || mfaState.needsVerification) {
    return (
      <SecurityGate
        state={mfaState}
        code={mfaCode}
        onCodeChange={setMfaCode}
        onEnroll={enrollMfa}
        onVerify={verifyMfa}
      />
    )
  }

  return (
    <div className="workspace-shell lg:h-screen lg:overflow-hidden">
      <HUDTopBar
        userEmail={user?.email}
        userName={user?.name}
        securityLabel={securityLabel}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <main className="px-4 pb-4 pt-2 md:px-5 lg:h-[calc(100vh-74px)] lg:overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-h-0 xl:col-span-5">
            <NewsPanel />
          </div>
          <div className="min-h-0 xl:col-span-3">
            <FinancePanel />
          </div>
          <div className="min-h-0 xl:col-span-4">
            <EmailPanel />
          </div>

          <div className="min-h-0 xl:col-span-3">
            <TasksPanel />
          </div>
          <div className="min-h-0 xl:col-span-5">
            <NotesPanel />
          </div>
          <div className="min-h-0 xl:col-span-4">
            <CalendarPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
