'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

/* ------------------------------------------------------------------ */
/*  Header notification bell — the per-user event feed. Opening it       */
/*  marks everything read; each item deep-links to where it happened.   */
/* ------------------------------------------------------------------ */

type Note = { id: string; kind: string; body: string; href: string | null; read: boolean; createdAt: number }

function relTime(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

export default function NotificationBell() {
  const items = useQuery(api.notifications.mine) as Note[] | undefined
  const markAllRead = useMutation(api.notifications.markAllRead)
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const list = items ?? []
  const unread = list.filter((n) => !n.read).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) void markAllRead()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-9 w-9 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-ink transition-colors hover:border-ink"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold tabular-nums text-gold-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden border border-line-strong bg-cream rounded-[3px] shadow-xl">
            <div className="border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Notifications
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              {list.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-faint">You're all caught up.</p>
              ) : (
                list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { setOpen(false); if (n.href) router.push(n.href) }}
                    className="block w-full border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-paper"
                  >
                    <p className="text-sm leading-snug text-ink">{n.body}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">{relTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
