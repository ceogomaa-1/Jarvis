'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PanelWrapperProps {
  title: string
  icon?: ReactNode
  headerRight?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
  amber?: boolean
  noPad?: boolean
}

export function PanelWrapper({
  title,
  icon,
  headerRight,
  children,
  className = '',
  delay = 0,
  amber = false,
  noPad = false,
}: PanelWrapperProps) {
  const accentColor = amber ? 'rgba(255, 184, 48, 0.3)' : 'rgba(0, 212, 255, 0.2)'
  const accentBright = amber ? 'rgba(255, 184, 48, 0.6)' : 'rgba(0, 212, 255, 0.5)'
  const accentVar = amber ? '#FFB830' : '#00D4FF'
  const glowColor = amber ? 'rgba(255, 184, 48, 0.06)' : 'rgba(0, 212, 255, 0.06)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`relative flex flex-col overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(13,17,23,0.97) 0%, rgba(17,24,39,0.93) 100%)',
        border: `1px solid ${accentColor}`,
        borderRadius: '2px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.04)`,
      }}
      whileHover={{
        borderColor: accentBright,
        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 25px ${glowColor}, inset 0 1px 0 rgba(0,212,255,0.06)`,
        scale: 1.002,
        transition: { duration: 0.2 },
      }}
    >
      {/* Corner brackets — top-left */}
      <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none z-10"
        style={{ borderTop: `2px solid ${accentVar}`, borderLeft: `2px solid ${accentVar}` }}
      />
      {/* Corner brackets — bottom-right */}
      <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none z-10"
        style={{ borderBottom: `2px solid ${accentVar}`, borderRight: `2px solid ${accentVar}` }}
      />
      {/* Corner brackets — top-right (dim) */}
      <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none z-10"
        style={{ borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }}
      />
      {/* Corner brackets — bottom-left (dim) */}
      <div className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none z-10"
        style={{ borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }}
      />

      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{
          borderBottom: `1px solid ${accentColor}`,
          background: `linear-gradient(90deg, ${glowColor} 0%, transparent 80%)`,
        }}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="opacity-80" style={{ color: accentVar, fontSize: 13 }}>
              {icon}
            </span>
          )}
          <span className="font-hud text-xs font-semibold tracking-[0.18em] uppercase"
            style={{ color: accentVar }}>
            {title}
          </span>
        </div>
        {headerRight && (
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        )}
      </div>

      {/* Panel body */}
      <div className={`flex-1 overflow-hidden ${noPad ? '' : 'p-3'}`}>
        {children}
      </div>
    </motion.div>
  )
}
