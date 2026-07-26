'use client'

import { useState, type FormEvent } from 'react'
import { Logo, Button, Field, Input } from '../components/ui'

export type Role = 'student' | 'recruiter'
type Mode = 'signin' | 'register'

export type LoginValues = {
  mode: Mode
  role: Role
  name: string
  email: string
  password: string
}

const ROLES: { id: Role; label: string; desc: string }[] = [
  {
    id: 'student',
    label: 'Student',
    desc: 'Browse mentorship tracks, apply, and track your progress and feedback.',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    desc: 'Design programs, review applicants, and mentor your enrolled talent.',
  },
]

const VALUE_PROPS: string[] = [
  'Flexible tracks that set their own duration and weekly commitment.',
  'Live applicant counts and guaranteed interview windows.',
  'AI assessments both sides can see.',
]

export default function Login({
  onSubmit,
  error,
  pending = false,
}: {
  onSubmit: (values: LoginValues) => void
  error?: string | null
  pending?: boolean
}) {
  const [mode, setMode] = useState<Mode>('signin')
  const [role, setRole] = useState<Role>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    onSubmit({ mode, role, name, email, password })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ---- Brand panel ---- */}
      <div className="relative hidden flex-col justify-between bg-ink px-12 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-11 text-gold" />
          <div className="leading-none">
            <div className="text-lg font-black tracking-tight text-cream">CAPSTONED</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/50">
              Mentorship Marketplace
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-cream">
            Get industry-ready, years before graduation.
          </h1>
          <ul className="mt-8 space-y-4">
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-start gap-3 text-sm text-cream/70">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[2px] border border-gold/40 text-gold">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                    <path d="M5 12.5l4.2 4.2L19 6" strokeLinecap="square" />
                  </svg>
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-cream/40">
          Mentorship that starts years before graduation.
        </p>
      </div>

      {/* ---- Auth form ---- */}
      <div className="flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md">
          {/* compact brand for small screens */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-10 w-10 text-gold" />
            <div className="leading-none">
              <div className="text-lg font-black tracking-tight text-ink">CAPSTONED</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Mentorship Marketplace
              </div>
            </div>
          </div>

          {/* mode toggle */}
          <div className="mb-7 inline-flex border border-line-strong rounded-[2px]">
            {(['signin', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-ink text-cream' : 'bg-white text-ink-soft hover:text-ink'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-black tracking-tight text-ink">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            {mode === 'signin'
              ? 'Sign in to pick up where you left off.'
              : 'Set up your CapStoned profile in seconds.'}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            {mode === 'register' && (
              <Field label="Full name" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              hint={mode === 'register' ? 'At least 8 characters' : undefined}
            >
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Create a password' : 'Your password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
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
                      className={`flex flex-col gap-1.5 border p-4 text-left rounded-[2px] transition-colors ${
                        active
                          ? 'border-ink bg-paper'
                          : 'border-line-strong bg-white hover:border-ink/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-ink">{r.label}</span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            active ? 'border-ink bg-ink' : 'border-line-strong'
                          }`}
                        >
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-cream" />}
                        </span>
                      </div>
                      <span className="text-xs leading-relaxed text-ink-soft">{r.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending
                ? 'Please wait…'
                : `${mode === 'signin' ? 'Sign in' : 'Create account'} as ${
                    role === 'student' ? 'Student' : 'Recruiter'
                  }`}
            </Button>

            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
          </form>

          <p className="mt-5 text-center text-xs text-ink-faint">
            {mode === 'signin' ? 'New to CapStoned? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
              className="font-semibold text-ink underline underline-offset-2"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
