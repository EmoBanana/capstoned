'use client'

import { useRouter } from 'next/navigation'
import StudentMentorship from '@/src/screens/StudentMentorship'

export default function Page() {
  const router = useRouter()
  return <StudentMentorship onNavigate={(id) => router.push(`/student/${id}`)} />
}
