import { Providers } from '@/components/Providers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JARVIS — Command Center',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      {children}
    </Providers>
  )
}
