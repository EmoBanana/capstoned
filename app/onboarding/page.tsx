'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import StudentOnboarding from '@/src/screens/StudentOnboarding'

/* Top-level onboarding route (outside the student layout's profile gate, so it
   can't redirect-loop). Auth-gates itself and skips ahead if already done. */
export default function OnboardingPage() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const candidate = useQuery(api.candidates.current, isAuthenticated ? {} : 'skip')
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.replace('/login'); return }
    if (me && me.role === 'recruiter') { router.replace('/recruiter/dashboard'); return }
    if (candidate && candidate.profileComplete) router.replace('/student/marketplace')
  }, [isLoading, isAuthenticated, me, candidate, router])

  if (isLoading || !isAuthenticated || me === undefined || candidate === undefined) return null
  if (me?.role === 'recruiter' || candidate?.profileComplete) return null

  return <StudentOnboarding />
}
