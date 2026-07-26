'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import TrackAssistantConnected from './TrackAssistantConnected'

/* ------------------------------------------------------------------ */
/*  FloatingAssistant — global, always-on AI chat bubble.              */
/*                                                                     */
/*  A fixed bottom-right bubble toggles an expandable chat panel that  */
/*  hosts the live agentic assistant (TrackAssistantConnected). Panel  */
/*  scales in from the bubble corner with gsap, respects reduced       */
/*  motion, and is gated off marketing / auth / onboarding routes.     */
/* ------------------------------------------------------------------ */

/** Routes where the bubble must NOT appear (marketing / auth / onboarding). */
function isGatedRoute(pathname: string): boolean {
  if (pathname === '/') return true
  const gatedPrefixes = ['/welcome', '/login', '/onboarding', '/demo']
  return gatedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/* Sharp, 1.5px-stroke icons matching the house style. */

function SparkChatIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16v11H8l-4 3z" />
      <path className="text-gold" stroke="currentColor" d="M13 8.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  )
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export default function FloatingAssistant() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)

  const close = useCallback(() => setOpen(false), [])

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // Scoped gsap context for open/close tweens; reverted on cleanup.
  useLayoutEffect(() => {
    if (!rootRef.current) return
    ctxRef.current = gsap.context(() => {}, rootRef)
    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  // Animate the panel whenever it mounts (open) — scale + autoAlpha from the
  // bubble corner. Reduced motion: appear instantly, no tween.
  useLayoutEffect(() => {
    if (!mounted || !panelRef.current || !ctxRef.current) return
    const panel = panelRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ctxRef.current.add(() => {
      if (reduce) {
        gsap.set(panel, { autoAlpha: 1, scale: 1 })
        return
      }
      gsap.fromTo(
        panel,
        { autoAlpha: 0, scale: 0.85, transformOrigin: 'bottom right' },
        { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'power2.out' },
      )
    })
  }, [mounted])

  const handleToggle = useCallback(() => {
    if (open) {
      // Closing: reverse tween, then unmount. Reduced motion unmounts instantly.
      const panel = panelRef.current
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!panel || reduce || !ctxRef.current) {
        setOpen(false)
        return
      }
      ctxRef.current.add(() => {
        gsap.to(panel, {
          autoAlpha: 0,
          scale: 0.85,
          duration: 0.22,
          ease: 'power2.in',
          transformOrigin: 'bottom right',
          onComplete: () => setOpen(false),
        })
      })
    } else {
      setOpen(true)
    }
  }, [open])

  // Keep `mounted` in sync so the closing tween can play before unmount.
  useEffect(() => {
    if (open) setMounted(true)
    else setMounted(false)
  }, [open])

  if (isGatedRoute(pathname)) return null

  return (
    <div ref={rootRef}>
      {mounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Assistant"
          className="fixed bottom-20 right-5 z-50 flex w-[min(440px,calc(100vw-2.5rem))] flex-col overflow-hidden border border-line-strong bg-paper rounded-[2px] shadow-[0_8px_30px_rgba(26,26,26,0.12)] h-[640px] max-h-[80vh]"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-cream px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 text-gold">
                <SparkChatIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                  CapStoned Assistant
                </span>
                <span className="block text-xs text-ink-faint">Here to help</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Close assistant"
              className="inline-flex shrink-0 items-center justify-center border border-transparent p-1 text-ink-faint rounded-[2px] transition-colors duration-150 hover:border-line-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">
            <TrackAssistantConnected className="h-full" embedded />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center bg-ink text-cream rounded-full shadow-[0_6px_20px_rgba(26,26,26,0.25)] transition-transform duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : <SparkChatIcon className="h-6 w-6" />}
      </button>
    </div>
  )
}
