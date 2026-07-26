'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Home() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : 'skip')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/welcome')
      return
    }
    if (me === undefined) return
    router.replace(me?.role === 'recruiter' ? '/recruiter/dashboard' : '/student/marketplace')
  }, [isLoading, isAuthenticated, me, router])

  return null
}
