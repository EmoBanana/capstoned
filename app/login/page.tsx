'use client'

import { useRouter } from 'next/navigation'
import Login from '@/src/screens/Login'
import { useRole } from '@/src/lib/role-context'

export default function LoginPage() {
  const router = useRouter()
  const { setRole } = useRole()

  return (
    <Login
      onSelect={(role) => {
        setRole(role)
        router.push(role === 'student' ? '/student/marketplace' : '/recruiter/dashboard')
      }}
    />
  )
}
