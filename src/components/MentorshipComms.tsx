'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button, Badge, Textarea } from './ui'
import { errorText } from './errors'

/* ------------------------------------------------------------------ */
/*  Shared mentor ↔ mentee communication: a live chat thread and a      */
/*  propose/confirm meeting scheduler. Used on both the company Mentees  */
/*  view and the candidate's My Mentorship view, scoped by enrollment.   */
/* ------------------------------------------------------------------ */

/** Live chat thread for one enrollment. Bubbles align to the viewer. */
export function ChatThread({ enrollmentId, counterpartLabel }: { enrollmentId: string; counterpartLabel: string }) {
  const id = enrollmentId as Id<'enrollments'>
  const messages = useQuery(api.messages.list, { enrollmentId: id })
  const send = useMutation(api.messages.send)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const submit = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await send({ enrollmentId: id, body: text })
      setDraft('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-[2px] border border-line bg-paper">
      <div className="max-h-72 min-h-[8rem] overflow-y-auto px-4 py-4">
        {messages === undefined ? (
          <p className="py-6 text-center text-xs font-medium text-ink-faint">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-faint">
            No messages yet. Say hello to {counterpartLabel}.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-[2px] px-3 py-2 ${m.mine ? 'bg-ink text-cream' : 'border border-line bg-white text-ink'}`}>
                  {!m.mine && (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <div className="border-t border-line p-3">
        {error && <p className="mb-2 text-xs font-medium text-danger-ink">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder={`Message ${counterpartLabel}…`}
            aria-label="Message"
          />
          <Button size="sm" disabled={!draft.trim() || sending} onClick={() => void submit()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

const toLocalInputValue = (ms: number) => {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Propose/confirm meeting scheduler for one enrollment. */
export function MeetingScheduler({ enrollmentId, counterpartLabel }: { enrollmentId: string; counterpartLabel: string }) {
  const id = enrollmentId as Id<'enrollments'>
  const meetings = useQuery(api.meetings.forEnrollment, { enrollmentId: id })
  const propose = useMutation(api.meetings.propose)
  const confirm = useMutation(api.meetings.confirm)
  const cancel = useMutation(api.meetings.cancel)

  // Default the picker to tomorrow, same time.
  const [when, setWhen] = useState(() => toLocalInputValue(Date.now() + 24 * 3600 * 1000))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latest = (meetings ?? []).find((m) => m.status !== 'cancelled')

  const submitPropose = async () => {
    const at = new Date(when).getTime()
    if (!Number.isFinite(at)) { setError('Pick a valid date and time'); return }
    setBusy(true)
    setError(null)
    try {
      await propose({ enrollmentId: id, at, note: note.trim() || undefined })
      setNote('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[2px] border border-line bg-paper p-4">
      {latest ? (
        <div className={`mb-4 rounded-[2px] border px-3 py-2.5 ${latest.status === 'confirmed' ? 'border-success/40 bg-success-soft/50' : 'border-gold/40 bg-gold-soft/40'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={latest.status === 'confirmed' ? 'success' : 'gold'}>
                  {latest.status === 'confirmed' ? 'Confirmed' : 'Proposed'}
                </Badge>
                <span className="text-sm font-bold tabular-nums text-ink">{latest.whenText}</span>
              </div>
              {latest.note && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{latest.note}</p>}
              {latest.status === 'proposed' && (
                <p className="mt-1 text-[11px] font-medium text-ink-faint">
                  {latest.mineProposed ? `Waiting for ${counterpartLabel} to confirm.` : `${counterpartLabel} proposed this time.`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {latest.status === 'proposed' && !latest.mineProposed && (
                <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); setError(null); try { await confirm({ meetingId: latest.id as Id<'meetings'> }) } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }}>
                  Confirm
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); try { await cancel({ meetingId: latest.id as Id<'meetings'> }) } finally { setBusy(false) } }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs text-ink-faint">No meeting scheduled yet.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            {latest && latest.status === 'proposed' ? 'Propose a different time' : 'Propose a time'}
          </label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full border border-line-strong bg-cream px-2.5 py-2 text-sm text-ink rounded-[2px] focus:border-ink focus:outline-none"
            aria-label="Meeting time"
          />
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void submitPropose()}>
          Propose
        </Button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Agenda (optional)"
        className="mt-2 w-full border border-line-strong bg-cream px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint rounded-[2px] focus:border-ink focus:outline-none"
        aria-label="Meeting agenda"
      />
      {error && <p className="mt-2 text-xs font-medium text-danger-ink">{error}</p>}
    </div>
  )
}
