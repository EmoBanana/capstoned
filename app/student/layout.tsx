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
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ST'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const { signOut } = useAuthActions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (me && me.role === 'recruiter') router.replace('/recruiter/dashboard')
  }, [isLoading, isAuthenticated, me, router])

  if (isLoading || !isAuthenticated || me === undefined || me === null) return null
  if (me.role === 'recruiter') return null

  const name = me.name || 'Student'
  const sub = me.email || 'Student'
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
                Student Workspace
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`border px-3.5 py-2 text-[13px] font-semibold rounded-[2px] transition-colors duration-150 ${
                  active(t.href)
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line text-ink-soft hover:border-ink/40 hover:text-ink'
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
                router.push('/login')
              }}
              className="border border-line px-3 py-2 text-xs font-semibold text-ink-soft rounded-[2px] transition-colors hover:border-ink hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors ${
                active(t.href) ? 'border-ink bg-ink text-cream' : 'border-line text-ink-soft'
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
