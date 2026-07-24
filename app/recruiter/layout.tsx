'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo, TalentbankLogo } from '@/src/components/ui'
import { useRole } from '@/src/lib/role-context'

const TABS = [
  { href: '/recruiter/dashboard', label: 'Dashboard' },
  { href: '/recruiter/new-track', label: 'New Track' },
  { href: '/recruiter/applicants', label: 'Applicants' },
  { href: '/recruiter/mentees', label: 'Mentees' },
  { href: '/recruiter/assessment', label: 'AI Assessment' },
]

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { role, hydrated, signOut } = useRole()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (hydrated && role !== 'recruiter') router.replace('/login')
  }, [hydrated, role, router])

  if (!hydrated || role !== 'recruiter') return null

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
                Recruiter Workspace
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
            <span className="hidden sm:inline-flex">
              <TalentbankLogo className="text-[12px]" />
            </span>
            <button
              onClick={() => {
                signOut()
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
          <span className="hidden sm:inline">Talentbank · Talent Team</span>
        </div>
      </footer>
    </div>
  )
}
