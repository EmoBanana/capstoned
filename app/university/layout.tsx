import Link from 'next/link'
import { Logo } from '@/src/components/ui'

/* ------------------------------------------------------------------ */
/*  University insights shell — READ-ONLY. No auth gating, no          */
/*  sign-out: this is a public aggregate view for the demo. Same house  */
/*  style as the Candidate and Company workspaces, with a borderless    */
/*  nav to signal that nothing here is an action.                       */
/* ------------------------------------------------------------------ */

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9 text-gold" />
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-ink">CAPSTONED</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                University Insights
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-7 text-sm">
            <Link
              href="/university/dashboard"
              className="font-semibold text-ink transition-colors hover:text-gold"
            >
              Insights
            </Link>
            <Link
              href="/"
              className="text-ink-soft transition-colors hover:text-ink"
            >
              Back to CapStoned
            </Link>
          </nav>

          <span className="hidden items-center gap-2 border border-line-strong bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft rounded-[2px] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-slate" aria-hidden="true" />
            Read only
          </span>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-ink-faint">
          <span>CapStoned — insight for universities, never a gate.</span>
          <span className="hidden sm:inline">Aggregate cohort view</span>
        </div>
      </footer>
    </div>
  )
}
