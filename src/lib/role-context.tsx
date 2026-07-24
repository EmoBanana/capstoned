'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role } from '@/src/screens/Login'

type RoleContextValue = {
  role: Role | null
  hydrated: boolean
  setRole: (role: Role) => void
  signOut: () => void
}

const RoleContext = createContext<RoleContextValue | null>(null)
const STORAGE_KEY = 'capstoned.role'

/**
 * Temporary client-side "auth" for the Next migration slice: role is chosen on
 * the login page and persisted to localStorage. Replaced by Convex auth +
 * middleware in a later slice.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'student' || stored === 'recruiter') setRoleState(stored)
    setHydrated(true)
  }, [])

  const setRole = (next: Role) => {
    localStorage.setItem(STORAGE_KEY, next)
    setRoleState(next)
  }

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRoleState(null)
  }

  return (
    <RoleContext.Provider value={{ role, hydrated, setRole, signOut }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
