'use client'

import { useRouter } from 'next/navigation'
import RecruiterDashboard from '@/src/screens/RecruiterDashboard'

export default function Page() {
  const router = useRouter()
  return <RecruiterDashboard onNavigate={(id) => router.push(`/recruiter/${id}`)} />
}
