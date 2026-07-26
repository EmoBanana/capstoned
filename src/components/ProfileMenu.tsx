'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '@/convex/_generated/api'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '•'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function ProfileMenu({ className }: { className?: string }) {
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
  const label = name || me?.email || ''

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold text-ink transition-colors hover:bg-cream"
      >
        {initialsOf(name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[2px] border border-line-strong bg-white shadow-lg"
        >
          {label && (
            <div className="truncate border-b border-line px-3 py-2 text-[11px] font-semibold text-ink-faint">
              {label}
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
              router.replace('/welcome')
            }}
            className="w-full px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-cream"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
