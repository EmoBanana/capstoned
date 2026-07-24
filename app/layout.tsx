import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RoleProvider } from '@/src/lib/role-context'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'CapStoned — Proactive Mentorship Marketplace',
  description:
    'CapStoned — mentorship that starts years before graduation. Companies design flexible, milestone-driven tracks; students apply, get matched, and are mentored to job-readiness.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  )
}
