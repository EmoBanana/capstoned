'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow } from '../components/ui'
import { CompanyLogo } from '../components/CompanyLogo'
import { SkeletonGrid } from '../components/Skeleton'
import { errorText } from '../components/errors'

/* ------------------------------------------------------------------ */
/*  Student · My Applications — live status + a real interview          */
/*  negotiation once accepted.                                          */
/* ------------------------------------------------------------------ */

type Party = 'company' | 'candidate'
type App = {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  enrolledHere: boolean
  closedByMentorship: boolean
  matchScore: number
  appliedAt: number
  slaDueAt: number
  note: string
  availability: string
  hoursPerWeek: number
  interviewAt: number | null
  interviewProposedBy: Party | null
  interviewStatus: 'proposed' | 'confirmed' | null
  trackTitle: string
  org: string
  orgSlug: string
  logoUrl: string | null
}

const STATUS_META: Record<App['status'], { label: string; tone: 'gold' | 'success' | 'neutral' }> = {
  pending: { label: 'Under review', tone: 'gold' },
  accepted: { label: 'Interviewing', tone: 'success' },
  declined: { label: 'Not moving forward', tone: 'neutral' },
}
const matchTone = (v: number): 'success' | 'gold' | 'danger' => (v >= 75 ? 'success' : v >= 55 ? 'gold' : 'danger')

const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The candidate's side of the interview negotiation for an accepted app. */
function InterviewPanel({ app, onAccept, onCounter }: { app: App; onAccept: () => void; onCounter: (ms: number) => Promise<unknown> }) {
  const [countering, setCountering] = useState(false)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = app.interviewStatus === 'confirmed'
  const iProposed = app.interviewStatus === 'proposed' && app.interviewProposedBy === 'candidate'
  const theyProposed = app.interviewStatus === 'proposed' && app.interviewProposedBy === 'company'

  const send = async () => {
    const ms = new Date(val).getTime()
    if (!ms || Number.isNaN(ms) || ms < Date.now()) { setError('Pick a future time.'); return }
    setBusy(true)
    setError(null)
    try { await onCounter(ms); setCountering(false); setVal('') } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="mt-4 rounded-[2px] border border-gold/40 bg-gold-soft/40 px-3 py-3">
      {app.interviewAt == null ? (
        <p className="text-xs text-ink">Accepted — {app.org} will propose an interview time shortly.</p>
      ) : confirmed ? (
        <p className="text-xs font-semibold text-success-ink">✓ Interview confirmed · {fmtWhen(app.interviewAt)}</p>
      ) : iProposed ? (
        <p className="text-xs text-ink">You proposed <b>{fmtWhen(app.interviewAt)}</b> — waiting on {app.org} to confirm.</p>
      ) : theyProposed && !countering ? (
        <div>
          <p className="text-xs text-ink">{app.org} proposed <b>{fmtWhen(app.interviewAt)}</b>.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={onAccept}>Accept time</Button>
            <Button size="sm" variant="secondary" onClick={() => { setCountering(true); setVal(toInput(app.interviewAt ?? Date.now())) }}>Can't make it</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold text-ink">Propose a time that works for you</p>
          <input type="datetime-local" value={val} min={toInput(Date.now())} onChange={(e) => setVal(e.target.value)} className="w-full border border-line-strong bg-cream px-2.5 py-1.5 text-xs text-ink rounded-[2px] focus:border-ink focus:outline-none" />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" disabled={busy} onClick={send}>Send this time</Button>
            <Button size="sm" variant="ghost" onClick={() => setCountering(false)}>Cancel</Button>
            {error && <span className="text-[11px] font-medium text-danger">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentApplications() {
  const apps = useQuery(api.applications.mine) as App[] | undefined
  const withdraw = useMutation(api.applications.withdraw)
  const confirmInterview = useMutation(api.applications.confirmInterview)
  const proposeInterview = useMutation(api.applications.proposeInterview)
  const now = Date.now()

  const appliedLabel = (ms: number) => {
    const h = Math.max(0, Math.round((now - ms) / 3_600_000))
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
  }
  const remaining = (ms: number) => Math.max(0, Math.round((ms - now) / 3_600_000))

  return (
    <Page>
      <header className="mb-8">
        <Eyebrow>Candidate · My Applications</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Your applications</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Every track you've applied to, with its live status and guaranteed-interview countdown.
        </p>
      </header>

      {apps === undefined ? (
        <SkeletonGrid count={4} className="sm:grid-cols-2" />
      ) : apps.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">You haven't applied to any tracks yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Browse the marketplace and apply to your best matches.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          {apps.map((a) => {
            const badge = a.enrolledHere
              ? { label: 'Enrolled', tone: 'success' as const }
              : a.closedByMentorship
                ? { label: 'Closed', tone: 'neutral' as const }
                : STATUS_META[a.status]
            const rem = remaining(a.slaDueAt)
            return (
              <Card key={a.id} className="flex flex-col p-6">
                <div className="flex items-start gap-3">
                  <CompanyLogo slug={a.orgSlug} name={a.org} logoUrl={a.logoUrl} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{a.org}</p>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    <h3 className="mt-1 text-base font-bold leading-snug tracking-tight text-ink">{a.trackTitle}</h3>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-ink-faint">Your fit</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">{a.matchScore}%</span>
                  </div>
                  <ProgressBar value={a.matchScore} tone={matchTone(a.matchScore)} height="h-1" />
                </div>

                {a.note && (
                  <p className="mt-4 line-clamp-2 text-xs italic leading-relaxed text-ink-soft">"{a.note}"</p>
                )}
                {(a.availability || a.hoursPerWeek > 0) && (
                  <p className="mt-2 text-xs text-ink-faint">
                    {[a.availability, a.hoursPerWeek > 0 ? `${a.hoursPerWeek} hrs/wk` : ''].filter(Boolean).join('  ·  ')}
                  </p>
                )}

                {a.enrolledHere ? (
                  <div className="mt-4 rounded-[2px] border border-success/30 bg-success-soft px-3 py-2.5">
                    <p className="text-xs font-semibold text-success-ink">You're mentoring here — track it in My Mentorship.</p>
                  </div>
                ) : a.closedByMentorship ? (
                  <div className="mt-4 rounded-[2px] border border-line bg-paper px-3 py-2.5">
                    <p className="text-xs text-ink-soft">Closed — you joined another mentorship, and you can only hold one at a time.</p>
                  </div>
                ) : a.status === 'accepted' ? (
                  <InterviewPanel
                    app={a}
                    onAccept={() => void confirmInterview({ applicationId: a.id as Id<'applications'> })}
                    onCounter={(ms) => proposeInterview({ applicationId: a.id as Id<'applications'>, at: ms })}
                  />
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs">
                  <span className="text-ink-faint">Applied {appliedLabel(a.appliedAt)}</span>
                  {a.enrolledHere ? (
                    <span className="font-medium text-success-ink">Active mentorship</span>
                  ) : a.closedByMentorship ? (
                    <span className="text-ink-faint">Closed</span>
                  ) : a.status === 'pending' ? (
                    <div className="flex items-center gap-3">
                      <span className={`${rem < 16 ? 'text-gold-ink font-medium' : 'text-ink-faint'}`}>
                        Interview within {rem}h
                      </span>
                      <button
                        type="button"
                        onClick={() => void withdraw({ applicationId: a.id as Id<'applications'> })}
                        className="font-semibold text-ink-faint transition-colors hover:text-danger"
                      >
                        Withdraw
                      </button>
                    </div>
                  ) : a.status === 'declined' ? (
                    <span className="text-ink-faint">Closed</span>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}
