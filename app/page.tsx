'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Home() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')
  // Only queried for students, to decide their landing page.
  const mentorship = useQuery(
    api.enrollments.myMentorship,
    isAuthenticated && me?.role !== 'recruiter' ? {} : 'skip',
  )

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/welcome')
      return
    }
    if (me === undefined) return
    if (me?.role === 'recruiter') {
      router.replace('/recruiter/dashboard')
      return
    }
    // A student in an active mentorship lands there; wait for that query first.
    if (mentorship === undefined) return
    router.replace(mentorship ? '/student/mentorship' : '/student/marketplace')
  }, [isLoading, isAuthenticated, me, mentorship, router])

  return null
}
