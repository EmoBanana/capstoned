'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '@/convex/_generated/api'
import { Logo } from '@/src/components/ui'

const TABS = [
  { href: '/student/marketplace', label: 'Marketplace' },
  { href: '/student/applications', label: 'My Applications' },
  { href: '/student/mentorship', label: 'My Mentorship' },
  { href: '/student/assessment', label: 'AI Assessment' },
  { href: '/student/settings', label: 'Settings' },
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ST'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const candidate = useQuery(api.candidates.current, isAuthenticated ? {} : 'skip')
  const { signOut } = useAuthActions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/welcome')
      return
    }
    if (me && me.role === 'recruiter') { router.replace('/recruiter/dashboard'); return }
    // A student without a finished profile can't be matched — send them to onboarding.
    if (me && me.role !== 'recruiter' && candidate !== undefined && !candidate?.profileComplete) {
      router.replace('/onboarding')
    }
  }, [isLoading, isAuthenticated, me, candidate, router])

  if (isLoading || !isAuthenticated || me === undefined || me === null) return null
  if (me.role === 'recruiter') return null
  if (candidate === undefined || !candidate?.profileComplete) return null

  const name = me.name || 'Candidate'
  const sub = me.email || 'Candidate'
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9 text-gold" />
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-ink">CAPSTONED</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Candidate Workspace
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`border-b-2 px-1 py-2 text-sm transition-colors duration-150 ${
                  active(t.href)
                    ? 'border-gold font-semibold text-ink'
                    : 'border-transparent text-ink-soft hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-bold leading-tight text-ink">{name}</div>
              <div className="text-[11px] text-ink-faint">{sub}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold text-ink">
              {initialsOf(name)}
            </div>
            <button
              onClick={() => {
                void signOut()
                router.push('/welcome')
              }}
              className="px-1 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto border-t border-line px-6 py-2 lg:hidden">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border-b-2 px-1 py-1.5 text-xs transition-colors ${
                active(t.href)
                  ? 'border-gold font-semibold text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-ink-faint">
          <span>CapStoned — mentorship that starts years before graduation.</span>
          <span className="hidden sm:inline">{name}</span>
        </div>
      </footer>
    </div>
  )
}
