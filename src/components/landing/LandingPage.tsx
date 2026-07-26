'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Logo } from '../ui'
import { Header } from './Header'
import { Hero } from './Hero'
import { Problem } from './Problem'
import { HowItWorks } from './HowItWorks'
import { AnimalsTeaser } from './AnimalsTeaser'
import { Audiences } from './Audiences'
import { ClosingCTA } from './ClosingCTA'

gsap.registerPlugin(ScrollTrigger)

/* SSR-safe isomorphic layout effect. */
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* ------------------------------------------------------------------ */
/*  CapStoned — marketing landing page.                                */
/*                                                                      */
/*  Self-contained, integration-agnostic React component. Pass         */
/*  onGetStarted / onExplore to wire the CTAs; without handlers the     */
/*  CTAs fall back to a next/link to /login.                           */
/*                                                                      */
/*  All GSAP work lives in one gsap.matchMedia() handler scoped to      */
/*  `root`, so every tween + ScrollTrigger is auto-reverted on unmount  */
/*  (and on Fast-Refresh) via mm.revert() — no leaks, no duplicates.    */
/*  Under (prefers-reduced-motion: reduce) the handler never runs, so   */
/*  no from()-tween is ever applied and all content stays visible.      */
/* ------------------------------------------------------------------ */

export type LandingPageProps = {
  /** Primary CTA. If absent, the CTA is a next/link to '/login'. */
  onGetStarted?: () => void
  /** Secondary CTA. If absent, the CTA is a next/link to '/login'. */
  onExplore?: () => void
  className?: string
}

export default function LandingPage({
  onGetStarted,
  onExplore,
  className = '',
}: LandingPageProps) {
  const root = useRef<HTMLDivElement>(null)

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
      <Header onGetStarted={onGetStarted} />

      <main>
        <Hero onGetStarted={onGetStarted} onExplore={onExplore} />
        <Problem />
        <HowItWorks />
        <AnimalsTeaser />
        <Audiences />
        <ClosingCTA onGetStarted={onGetStarted} onExplore={onExplore} />
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
            <Link href="/login" className="font-semibold text-ink-soft hover:text-ink">
              Sign in
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
