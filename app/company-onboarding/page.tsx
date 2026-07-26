'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import CompanyOnboarding from '@/src/screens/CompanyOnboarding'

/* Top-level company-onboarding route (outside the recruiter layout's org gate,
   so it can't redirect-loop). Auth-gates itself; skips ahead if already set up. */
export default function CompanyOnboardingPage() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  const org = useQuery(api.organizations.mine, isAuthenticated ? {} : 'skip')
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.replace('/welcome'); return }
    if (me && me.role === 'student') { router.replace('/student/marketplace'); return }
    if (org) router.replace('/recruiter/dashboard')
  }, [isLoading, isAuthenticated, me, org, router])

  if (isLoading || !isAuthenticated || me === undefined || org === undefined) return null
  if (me?.role === 'student' || org) return null

  return <CompanyOnboarding />
}
