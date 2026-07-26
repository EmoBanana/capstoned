'use client'

import { Logo } from '../ui'
import { Cta } from './Cta'

/* ------------------------------------------------------------------ */
/*  Closing CTA — return to the thesis and send people into the app.   */
/* ------------------------------------------------------------------ */

export function ClosingCTA({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted?: () => void
  onSignIn?: () => void
}) {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
        <div
          data-reveal
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <Logo className="h-11 w-11 text-gold" />
          <h2 className="mt-7 text-3xl font-black leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Stop guessing. Start experiencing.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Meet your work-style, step into a real track, and make your next career
            decision with evidence behind it.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta
              variant="primary"
              label="Get started"
              onClick={onGetStarted}
            />
            <Cta
              variant="secondary"
              label="Sign in"
              onClick={onSignIn}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
