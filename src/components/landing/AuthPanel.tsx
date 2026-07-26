'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import gsap from 'gsap'
import { Button, Field, Logo, inputClass } from '../ui'

/* ------------------------------------------------------------------ */
/*  AuthPanel — the built-in sign-in / create-account experience.      */
/*                                                                      */
/*  Rendered as a centered modal over a scrim, opened from the landing */
/*  page CTAs. It calls Convex Auth's password provider exactly the    */
/*  way app/login does (same provider, same fields, same flow), and on */
/*  success routes to '/' so app/page.tsx can send the user onward.    */
/*                                                                      */
/*  Career-OS labels ("Candidate" / "Employer") front the underlying   */
/*  'student' | 'recruiter' role values, which are submitted verbatim. */
/* ------------------------------------------------------------------ */

type Mode = 'signin' | 'register'
type Role = 'student' | 'recruiter'

export type AuthPanelProps = {
  open: boolean
  initialMode?: Mode
  onClose: () => void
}

/* SSR-safe isomorphic layout effect (mirrors LandingPage). */
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const ROLES: { id: Role; label: string; desc: string }[] = [
  {
    id: 'student',
    label: 'Candidate',
    desc: 'Discover your work-style, join real tracks, and build evidence of what you do well.',
  },
  {
    id: 'recruiter',
    label: 'Employer',
    desc: 'Author milestone-driven tracks and observe how people really work over weeks.',
  },
]

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function AuthPanel({
  open,
  initialMode = 'signin',
  onClose,
}: AuthPanelProps) {
  const { signIn } = useAuthActions()
  const router = useRouter()

  const rootRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>(initialMode)
  const [role, setRole] = useState<Role>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /* Adopt the requested mode + clear transient state each time we open. */
  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setError(null)
    setPending(false)
  }, [open, initialMode])

  /* Graceful close — a quick fade out, then hand control back to parent.
     Reduced motion (or a missing panel) closes instantly. */
  const requestClose = useCallback(() => {
    if (prefersReducedMotion() || !rootRef.current) {
      onClose()
      return
    }
    gsap.to(rootRef.current, {
      autoAlpha: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: onClose,
    })
  }, [onClose])

  /* Entrance animation — scoped + reverted via gsap.context.
     Transform aliases + autoAlpha only; instant under reduced motion. */
  useIsoLayout(() => {
    if (!open) return
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set([scrimRef.current, panelRef.current], { autoAlpha: 1 })
        gsap.set(panelRef.current, { y: 0, scale: 1 })
        return
      }
      gsap
        .timeline({ defaults: { ease: 'power2.out' } })
        .fromTo(
          scrimRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.25 },
        )
        .fromTo(
          panelRef.current,
          { autoAlpha: 0, y: 16, scale: 0.98 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 },
          '-=0.15',
        )
    }, rootRef)
    return () => ctx.revert()
  }, [open])

  /* Esc to close. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  /* Lock body scroll while open. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  /* Focus the first field on open (and when the first field changes). */
  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      const target = mode === 'register' ? nameRef.current : emailRef.current
      target?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, mode])

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signIn('password', {
        email,
        password,
        name,
        role,
        flow: mode === 'register' ? 'signUp' : 'signIn',
      })
      router.push('/')
    } catch {
      setError(
        mode === 'register'
          ? 'Could not create account — the email may already be registered, or the password is too short.'
          : 'Could not sign in. Check your email and password.',
      )
      setPending(false)
    }
  }

  if (!open) return null

  const activeRoleLabel = role === 'student' ? 'Candidate' : 'Employer'

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-panel-title"
    >
      {/* scrim */}
      <div
        ref={scrimRef}
        onClick={requestClose}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* panel */}
      <div
        ref={panelRef}
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto border border-line-strong bg-white rounded-[2px]"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center border border-line-strong bg-cream text-gold rounded-[2px]">
              <Logo className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <h2
                id="auth-panel-title"
                className="text-lg font-black tracking-tight text-ink"
              >
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-xs text-ink-soft">
                {mode === 'signin'
                  ? 'Sign in to pick up where you left off.'
                  : 'Step into CapStoned in seconds.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-ink-faint rounded-[2px] transition-colors duration-150 hover:border-line-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6">
          {/* mode toggle */}
          <div className="inline-flex w-full border border-line-strong rounded-[2px]">
            {(['signin', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                  mode === m
                    ? 'bg-ink text-cream'
                    : 'bg-white text-ink-soft hover:text-ink'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {mode === 'register' && (
              <Field label="Full name" htmlFor="auth-name" required>
                <input
                  ref={nameRef}
                  id="auth-name"
                  name="name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </Field>
            )}

            <Field label="Email" htmlFor="auth-email" required>
              <input
                ref={emailRef}
                id="auth-email"
                name="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Password"
              htmlFor="auth-password"
              required
              hint={mode === 'register' ? 'At least 8 characters' : undefined}
            >
              <input
                id="auth-password"
                name="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'register' ? 'Create a password' : 'Your password'
                }
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                required
              />
            </Field>

            {/* role selection */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink">I am a</span>
                <span className="text-xs text-ink-faint">choose one</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => {
                  const active = role === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      aria-pressed={active}
                      className={`flex flex-col gap-1.5 border p-3.5 text-left rounded-[2px] transition-colors duration-150 ${
                        active
                          ? 'border-ink bg-paper'
                          : 'border-line-strong bg-white hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-ink">
                          {r.label}
                        </span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            active ? 'border-ink bg-ink' : 'border-line-strong'
                          }`}
                        >
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cream" />
                          )}
                        </span>
                      </div>
                      <span className="text-xs leading-relaxed text-ink-soft">
                        {r.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending
                ? 'Please wait…'
                : `${
                    mode === 'signin' ? 'Sign in' : 'Create account'
                  } as ${activeRoleLabel}`}
            </Button>

            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-center">
            <p className="text-xs text-ink-faint">
              {mode === 'signin'
                ? 'New to CapStoned? '
                : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
                className="font-semibold text-ink underline underline-offset-2"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
            <Link
              href="/demo"
              className="text-xs font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Skip — explore the live demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
