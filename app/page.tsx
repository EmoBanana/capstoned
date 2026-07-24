'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/src/lib/role-context'

export default function Home() {
  const router = useRouter()
  const { role, hydrated } = useRole()

  useEffect(() => {
    if (!hydrated) return
    if (role === 'student') router.replace('/student/marketplace')
    else if (role === 'recruiter') router.replace('/recruiter/dashboard')
    else router.replace('/login')
  }, [hydrated, role, router])

  return null
}
