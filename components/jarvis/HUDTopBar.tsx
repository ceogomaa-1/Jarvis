'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, LogOut, Wifi, WifiOff } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { WeatherData } from '@/types'

const WEATHER_ICONS: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

interface HUDTopBarProps {
  userEmail?: string
  userName?: string
  userAvatar?: string
}

export function HUDTopBar({ userEmail, userName, userAvatar }: HUDTopBarProps) {
  const [time, setTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Online status
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Fetch weather
  const { data: weather } = useQuery<WeatherData>({
    queryKey: ['weather'],
    queryFn: () => fetch('/api/weather').then((r) => r.json()),
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 30,
  })

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase()

  const displayName = userName || userEmail?.split('@')[0] || 'Commander'
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative flex items-center justify-between px-5 py-2 shrink-0"
      style={{
        background: 'linear-gradient(90deg, rgba(13,17,23,0.98) 0%, rgba(17,24,39,0.96) 50%, rgba(13,17,23,0.98) 100%)',
        borderBottom: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.5), 0 1px 0 rgba(0,212,255,0.05)',
      }}
    >
      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }}
      />

      {/* LEFT — Logo */}
      <div className="flex items-center gap-3">
        <div>
          <div className="font-display font-black tracking-[0.2em] leading-none"
            style={{
              fontSize: 20,
              color: '#00D4FF',
              textShadow: '0 0 15px rgba(0,212,255,0.5), 0 0 30px rgba(0,212,255,0.2)',
            }}>
            JARVIS
          </div>
          <div className="font-hud text-[9px] tracking-[0.25em] leading-none mt-0.5"
            style={{ color: 'rgba(0,212,255,0.5)' }}>
            COMMAND CENTER
          </div>
        </div>

        <div className="h-8 w-px mx-2" style={{ background: 'rgba(0,212,255,0.15)' }} />

        {/* System status */}
        <div className="flex items-center gap-1.5">
          <div style={{ color: isOnline ? '#00FF88' : '#FF3B5C' }}>
            {isOnline
              ? <Wifi size={11} />
              : <WifiOff size={11} />
            }
          </div>
          <span className="font-hud text-[9px] tracking-[0.15em] uppercase"
            style={{ color: isOnline ? '#00FF88' : '#FF3B5C' }}>
            {isOnline ? 'SYS ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Greeting */}
        <div className="hidden lg:block h-8 w-px ml-1 mr-3" style={{ background: 'rgba(0,212,255,0.1)' }} />
        <div className="hidden lg:block font-hud text-xs tracking-wide" style={{ color: '#7A9BAE' }}>
          {getGreeting()}, <span style={{ color: '#E8F4F8' }}>{displayName}</span>
        </div>
      </div>

      {/* CENTER — Clock & Date */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <div className="flex items-baseline gap-1 justify-center">
          <span className="font-display font-bold tabular-nums"
            style={{
              fontSize: 22,
              color: '#E8F4F8',
              textShadow: '0 0 10px rgba(0,212,255,0.2)',
              letterSpacing: '0.05em',
            }}>
            {hours}:{minutes}
          </span>
          <motion.span
            className="font-display font-bold tabular-nums"
            style={{ fontSize: 14, color: 'rgba(0,212,255,0.7)', letterSpacing: '0.05em' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            :{seconds}
          </motion.span>
        </div>
        <div className="font-hud text-[9px] tracking-[0.2em] text-center"
          style={{ color: 'rgba(0,212,255,0.45)' }}>
          {dateStr}
        </div>
      </div>

      {/* RIGHT — Weather, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        {/* Weather */}
        {weather && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-sm"
            style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
            <span style={{ fontSize: 14 }}>
              {WEATHER_ICONS[weather.icon] ?? '🌡️'}
            </span>
            <div>
              <div className="font-hud text-xs font-semibold" style={{ color: '#E8F4F8' }}>
                {weather.temp}°C
              </div>
              <div className="font-hud text-[9px] tracking-wide" style={{ color: '#7A9BAE' }}>
                {weather.city}
              </div>
            </div>
          </div>
        )}

        <div className="h-6 w-px" style={{ background: 'rgba(0,212,255,0.1)' }} />

        {/* Notification bell */}
        <button
          className="relative p-1.5 rounded-sm transition-colors"
          style={{ color: 'rgba(0,212,255,0.5)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#00D4FF' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.5)' }}
        >
          <Bell size={15} />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#FF3B5C', boxShadow: '0 0 4px rgba(255,59,92,0.6)' }}
          />
        </button>

        {/* Avatar + Logout */}
        <div className="flex items-center gap-2">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={displayName}
              className="w-7 h-7 rounded-full"
              style={{ border: '1px solid rgba(0,212,255,0.3)' }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-hud text-xs font-bold"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: '#00D4FF',
              }}>
              {initials}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-sm transition-all"
            title="Logout"
            style={{ color: 'rgba(0,212,255,0.4)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#FF3B5C'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,59,92,0.08)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.4)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </motion.header>
  )
}
