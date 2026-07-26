'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import Login from '@/src/screens/Login'

export default function LoginPage() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <Login
      error={error}
      pending={pending}
      onSubmit={async ({ mode, role, name, email, password }) => {
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
      }}
    />
  )
}
