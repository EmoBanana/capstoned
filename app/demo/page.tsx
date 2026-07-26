'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { Page, Card, Button, Eyebrow } from '@/src/components/ui'

/* ------------------------------------------------------------------ */
/*  /demo — one-click demo login (hackathon login bypass).             */
/*                                                                     */
/*  Signs in a shared demo candidate. We first try `signIn` on the     */
/*  existing account; if that throws (account not created yet), we     */
/*  retry with `signUp` to create it. Assumes B's auth config is the   */
/*  same `password` provider used by /login, with a `role` field that  */
/*  accepts `'student'`.                                               */
/* ------------------------------------------------------------------ */

// Demo-only credentials — safe to commit; used solely for the hackathon
// login bypass. NOT a real user and NOT reused anywhere sensitive.
const DEMO_EMAIL = 'demo@capstoned.app'
const DEMO_PASSWORD = 'demo-capstoned-2026'
const DEMO_NAME = 'Demo Candidate'
const DEMO_ROLE = 'student'

type Status = 'pending' | 'error'

export default function DemoPage() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('pending')
  const startedRef = useRef(false)

  const attempt = useCallback(async () => {
    setStatus('pending')
    const base = { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME, role: DEMO_ROLE }
    try {
      // Existing account.
      await signIn('password', { ...base, flow: 'signIn' })
      router.push('/discover')
      return
    } catch {
      // Fall through to account creation.
    }
    try {
      await signIn('password', { ...base, flow: 'signUp' })
      router.push('/discover')
      return
    } catch {
      setStatus('error')
    }
  }, [signIn, router])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void attempt()
  }, [attempt])

  return (
    <Page width="max-w-md">
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <Card className="w-full px-8 py-10">
          <Eyebrow>Demo access</Eyebrow>
          {status === 'pending' ? (
            <>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                Signing you in…
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Setting up the demo candidate account. This only takes a moment.
              </p>
              <div className="mt-6 flex justify-center" aria-hidden="true">
                <span className="inline-flex gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink-faint" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink-faint [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink-faint [animation-delay:300ms]" />
                </span>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                Couldn&apos;t sign in
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The demo login didn&apos;t go through. This can happen if the auth
                service is still waking up — give it another try.
              </p>
              <Button className="mt-6" onClick={() => void attempt()}>
                Try again
              </Button>
            </>
          )}
        </Card>
      </div>
    </Page>
  )
}
