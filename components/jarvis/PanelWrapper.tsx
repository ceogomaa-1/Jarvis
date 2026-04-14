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
  const accent = amber ? 'var(--accent-warm)' : 'var(--accent)'

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: 'easeOut' }}
      className={`workspace-panel min-h-0 ${className}`}
    >
      <div className="workspace-panel__header">
        <div className="workspace-panel__title">
          {icon ? <span style={{ color: accent }}>{icon}</span> : null}
          <span>{title}</span>
        </div>
        {headerRight ? <div className="workspace-panel__actions">{headerRight}</div> : null}
      </div>

      <div className={noPad ? 'workspace-panel__body workspace-panel__body--flush' : 'workspace-panel__body'}>
        {children}
      </div>
    </motion.section>
  )
}
