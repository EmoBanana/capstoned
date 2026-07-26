'use client'

import Link from 'next/link'
import { Logo } from '../ui'
import { Cta } from './Cta'

/* ------------------------------------------------------------------ */
/*  Landing header — brand mark + a single primary way in. Sticky and  */
/*  translucent so the cream page reads through it.                    */
/* ------------------------------------------------------------------ */

export function Header({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="CapStoned home">
          <Logo className="h-6 w-6 text-gold" />
          <span className="text-base font-black tracking-tight">CapStoned</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden px-3 py-2 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Cta variant="primary" label="Get started" onClick={onGetStarted} />
        </div>
      </div>
    </header>
  )
}
