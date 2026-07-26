'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Logo } from '@/src/components/ui'
import ProfileMenu from '@/src/components/ProfileMenu'

const TABS = [
  { href: '/recruiter/dashboard', label: 'Dashboard' },
  { href: '/recruiter/new-track', label: 'New Track' },
  { href: '/recruiter/applicants', label: 'Applicants' },
  { href: '/recruiter/mentees', label: 'Mentees' },
  { href: '/recruiter/assessment', label: 'AI Assessment' },
  { href: '/recruiter/settings', label: 'Settings' },
]

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const org = useQuery(api.organizations.mine, isAuthenticated ? {} : 'skip')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/welcome')
      return
    }
    if (me && me.role === 'student') { router.replace('/student/marketplace'); return }
    // A recruiter with no company yet can't manage anything — set it up first.
    if (me && me.role === 'recruiter' && org !== undefined && org === null) {
      router.replace('/company-onboarding')
    }
  }, [isLoading, isAuthenticated, me, org, router])

  if (isLoading || !isAuthenticated || me === undefined || me === null) return null
  if (me.role === 'student') return null
  if (org === undefined || org === null) return null

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
                Company Workspace
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
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="h-2.5 w-2.5 rounded-[1px]" style={{ backgroundColor: `#${org.brandColor}` }} />
              <span className="text-[13px] font-bold text-ink">{org.name}</span>
            </span>
            <ProfileMenu />
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
          <span className="hidden sm:inline">{org.name}</span>
        </div>
      </footer>
    </div>
  )
}
