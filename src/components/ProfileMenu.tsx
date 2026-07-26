'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '@/convex/_generated/api'

// Curated, on-brand-adjacent palette for the Notion-style default avatar.
const AVATAR_COLORS = [
  '#b23a2e',
  '#c1662f',
  '#b8902b',
  '#5f7a3a',
  '#2f7d6b',
  '#37698f',
  '#4a5aa8',
  '#7a4a9c',
  '#a8477e',
  '#8a6d3b',
] as const

// Deterministic per-user color: hash a stable key so each user keeps the same
// distinct avatar color across sessions, matching the Notion default-avatar look.
function avatarColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function initialOf(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed[0].toUpperCase()
}

export default function ProfileMenu({
  profileHref,
  className,
}: {
  profileHref: string
  className?: string
}) {
  const me = useQuery(api.users.currentUser)
  const { signOut } = useAuthActions()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const name = me?.name ?? ''
  const email = me?.email ?? ''
  const colorKey = me?._id ?? email ?? name
  const initial = initialOf(name)

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-[2px] border border-line-strong bg-white px-2.5 py-1.5 text-left transition-colors hover:bg-cream"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: avatarColor(colorKey) }}
        >
          {initial || '•'}
        </span>
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-[13px] font-bold text-ink">{name || 'Account'}</span>
          {email && <span className="truncate text-[11px] text-ink-faint">{email}</span>}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-[2px] border border-line-strong bg-white shadow-lg"
        >
          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream"
          >
            My Profile
          </Link>
          <div className="h-px bg-line-strong" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
              router.replace('/welcome')
            }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
