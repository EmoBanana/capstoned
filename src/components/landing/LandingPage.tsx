'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Logo } from '../ui'
import { Header } from './Header'
import { Hero } from './Hero'
import { Problem } from './Problem'
import { HowItWorks } from './HowItWorks'
import { Benefits } from './Benefits'
import { AnimalsTeaser } from './AnimalsTeaser'
import { Audiences } from './Audiences'
import { ClosingCTA } from './ClosingCTA'
import AuthPanel from './AuthPanel'

gsap.registerPlugin(ScrollTrigger)

/* SSR-safe isomorphic layout effect. */
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* ------------------------------------------------------------------ */
/*  CapStoned — marketing landing page + built-in front door.          */
/*                                                                      */
/*  Every CTA opens the built-in <AuthPanel> modal so people sign in or */
/*  register without leaving the page. "Get started" opens it in        */
/*  create-account mode; "Sign in" opens it in sign-in mode.            */
/*                                                                      */
/*  Still integration-agnostic: pass onGetStarted to override the       */
/*  primary CTA; without it, "Get started" opens the auth panel.        */
/*                                                                      */
/*  All GSAP work lives in one gsap.matchMedia() handler scoped to      */
/*  `root`, so every tween + ScrollTrigger is auto-reverted on unmount  */
/*  (and on Fast-Refresh) via mm.revert() — no leaks, no duplicates.    */
/*  Under (prefers-reduced-motion: reduce) the handler never runs, so   */
/*  no from()-tween is ever applied and all content stays visible.      */
/* ------------------------------------------------------------------ */

export type LandingPageProps = {
  /** Primary CTA override. If absent, "Get started" opens the auth panel. */
  onGetStarted?: () => void
  className?: string
}

export default function LandingPage({
  onGetStarted,
  className = '',
}: LandingPageProps) {
  const root = useRef<HTMLDivElement>(null)

  /* Built-in auth modal state. */
  const [auth, setAuth] = useState<{ open: boolean; mode: 'signin' | 'register' }>(
    { open: false, mode: 'signin' },
  )
  const openAuth = (mode: 'signin' | 'register') => setAuth({ open: true, mode })
  const closeAuth = () => setAuth((s) => ({ ...s, open: false }))

  /* Primary CTA: honor an explicit handler, else open the register panel. */
  const handleGetStarted = onGetStarted ?? (() => openAuth('register'))
  /* Header "Sign in": open the sign-in panel. */
  const handleSignIn = () => openAuth('signin')

  useIsoLayout(() => {
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* Hero entrance — masked headline lines slide up from behind a
         clean edge, then supporting elements settle in. */
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
      tl.from('[data-hero-eyebrow]', { y: 16, autoAlpha: 0, duration: 0.6 })
        .from('[data-hero-line]', { yPercent: 110, autoAlpha: 0, stagger: 0.12 }, '-=0.2')
        .from('[data-hero-sub]', { y: 20, autoAlpha: 0, duration: 0.7 }, '-=0.4')
        .from('[data-hero-cta]', { y: 20, autoAlpha: 0, stagger: 0.08 }, '-=0.4')
        .from(
          '[data-hero-visual]',
          { y: 40, autoAlpha: 0, scale: 0.98, duration: 0.9 },
          '-=0.8',
        )

      /* Scroll reveals — every [data-reveal] rises + fades as it enters. */
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 40,
          autoAlpha: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 82%' },
        })
      })

      /* The 12 Animals — staggered pop as the grid scrolls into view. */
      const grid = root.current?.querySelector('[data-animal-grid]')
      if (grid) {
        gsap.from('[data-animal]', {
          y: 24,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: { each: 0.05, from: 'start' },
          scrollTrigger: { trigger: grid, start: 'top 80%' },
        })
      }
    }, root) // scope selector strings to root; auto-revert on cleanup

    return () => mm.revert()
  }, [])

  return (
    <div ref={root} className={`bg-cream text-ink ${className}`}>
      <Header onGetStarted={handleGetStarted} onSignIn={handleSignIn} />

      <main>
        <Hero onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
        <Problem />
        <HowItWorks />
        <Benefits />
        <AnimalsTeaser />
        <Audiences />
        <ClosingCTA onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
      </main>

      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5 text-ink">
            <Logo className="h-5 w-5 text-gold" />
            <span className="text-sm font-black tracking-tight">CapStoned</span>
            <span className="text-sm text-ink-faint">· Experience careers before you commit.</span>
          </div>
          <p className="text-xs text-ink-faint">
            A talent-cultivation &amp; career-discovery platform ·{' '}
            <button
              type="button"
              onClick={handleSignIn}
              className="font-semibold text-ink-soft hover:text-ink"
            >
              Sign in
            </button>
          </p>
        </div>
      </footer>

      <AuthPanel open={auth.open} initialMode={auth.mode} onClose={closeAuth} />
    </div>
  )
}
