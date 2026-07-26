'use client'

/* ------------------------------------------------------------------ */
/*  CapStoned — Role context (Career OS: three audiences)              */
/*                                                                      */
/*  Career OS is one platform for three audiences: Candidate, Employer, */
/*  and University. This context holds the active role and bridges to   */
/*  the legacy two-role vocabulary ('student' | 'recruiter') still used */
/*  by the existing /student and /recruiter routes and the Convex       */
/*  `users.role` field — so nothing downstream breaks.                  */
/* ------------------------------------------------------------------ */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  ROLES,
  fromLegacyRole,
  toLegacyRole,
  type LegacyRole,
  type Role,
} from './domain'

// Re-export the role vocabulary so consumers can import everything role-
// related from one module.
export {
  ROLES,
  fromLegacyRole,
  toLegacyRole,
  type LegacyRole,
  type Role,
} from './domain'

/** Presentation metadata for each Career OS audience. */
export interface RoleMeta {
  role: Role
  label: string
  /** The legacy role value, or null for audiences with no legacy route. */
  legacy: LegacyRole | null
  /** Home route for this audience. */
  home: string
  description: string
}

export const ROLE_META: Record<Role, RoleMeta> = {
  candidate: {
    role: 'candidate',
    label: 'Candidate',
    legacy: 'student',
    home: '/student/marketplace',
    description:
      'Experience careers before committing — explore companies through structured mentorship tracks.',
  },
  employer: {
    role: 'employer',
    label: 'Employer',
    legacy: 'recruiter',
    home: '/recruiter/dashboard',
    description:
      'Design tracks, review applicants, and cultivate talent through real, structured work.',
  },
  university: {
    role: 'university',
    label: 'University',
    legacy: null,
    home: '/university/dashboard',
    description:
      'See where your students explore, where they thrive, and the mismatches averted before graduation.',
  },
}

export interface RoleContextValue {
  role: Role
  meta: RoleMeta
  /** The legacy role value for the active role, or null (university). */
  legacyRole: LegacyRole | null
  setRole: (role: Role) => void
  /** Set the active role from a legacy value ('student' | 'recruiter'). */
  setLegacyRole: (legacy: LegacyRole) => void
  isRole: (role: Role) => boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({
  children,
  initialRole = 'candidate',
}: {
  children: ReactNode
  initialRole?: Role
}) {
  const [role, setRole] = useState<Role>(initialRole)

  const value = useMemo<RoleContextValue>(() => {
    return {
      role,
      meta: ROLE_META[role],
      legacyRole: toLegacyRole(role),
      setRole,
      setLegacyRole: (legacy: LegacyRole) => setRole(fromLegacyRole(legacy)),
      isRole: (candidate: Role) => candidate === role,
    }
  }, [role])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

/** Access the active role. Throws if used outside a {@link RoleProvider}. */
export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (ctx === null) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return ctx
}
