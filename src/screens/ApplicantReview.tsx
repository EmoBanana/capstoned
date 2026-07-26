'use client'

import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow, ReliabilityScore } from '../components/ui'
import { useDialog } from '../components/useDialog'
import { errorText } from '../components/errors'

/* ------------------------------------------------------------------ */
/*  Applicant Review (Recruiter) — a Queue of new applicants to accept  */
/*  or decline, and an Interviews tab where a real interview time is     */
/*  negotiated before anyone is enrolled as a mentee.                    */
/* ------------------------------------------------------------------ */

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—'
const appliedLabel = (hoursAgo: number) =>
  hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`
const matchTone = (v: number): 'success' | 'gold' | 'danger' => (v >= 75 ? 'success' : v >= 55 ? 'gold' : 'danger')

const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  )
}
function Monogram({ initials }: { initials: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold tracking-tight text-ink">
      {initials}
    </div>
  )
}

type Party = 'company' | 'candidate'
type SortKey = 'match-desc' | 'match-asc' | 'sla-asc'
type Applicant = {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  matchScore: number
  appliedAt: number
  slaDueAt: number
  note: string
  availability: string
  hoursPerWeek: number
  interviewAt: number | null
  interviewProposedBy: Party | null
  interviewStatus: 'proposed' | 'confirmed' | null
  enrolled: boolean
  enrolledElsewhere: boolean
  elsewhereLabel: string | null
  name: string
  university: string
  program: string
  animalKey: string
  reliability: number
  reliabilityDisplay: number | null
}

/** Reusable calendar/time picker for proposing or counter-proposing a slot. */
function ScheduleModal({
  title,
  initialMs,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string
  initialMs: number
  submitLabel: string
  onClose: () => void
  onSubmit: (atMs: number) => Promise<void>
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const [val, setVal] = useState(toInput(initialMs))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const ms = new Date(val).getTime()
    if (!ms || Number.isNaN(ms)) { setError('Pick a date and time.'); return }
    if (ms < Date.now()) { setError('Pick a time in the future.'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(ms)
      onClose()
    } catch (e) {
      setError(errorText(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="w-full max-w-md border border-line-strong bg-cream rounded-t-[6px] focus:outline-none sm:rounded-[4px]" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Interview</p>
          <h3 className="text-base font-black tracking-tight text-ink">{title}</h3>
        </div>
        <div className="px-6 py-5">
          <label className="mb-2 block text-sm font-semibold text-ink">Date &amp; time</label>
          <input
            type="datetime-local"
            value={val}
            min={toInput(Date.now())}
            onChange={(e) => setVal(e.target.value)}
            className="w-full border border-line-strong bg-cream px-3.5 py-2.5 text-sm text-ink rounded-[2px] focus:border-ink focus:bg-white focus:outline-none"
          />
          <p className="mt-2 text-xs text-ink-faint">The candidate can accept this or counter with a time that works for them.</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          {error && <span className="mr-auto text-xs font-medium text-danger">{error}</span>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={submit}>{saving ? 'Sending…' : submitLabel}</Button>
        </div>
      </div>
    </div>
  )
}

/** A card in the Interviews & Decisions tab — the scheduling negotiation. */
function DecisionCard({
  a,
  onSchedule,
  onCounter,
  onConfirm,
  onEnroll,
  onDecline,
  onReopen,
}: {
  a: Applicant
  onSchedule: () => void
  onCounter: () => void
  onConfirm: () => void
  onEnroll: () => void
  onDecline: () => void
  onReopen: () => void
}) {
  const declined = a.status === 'declined'
  const confirmed = a.interviewStatus === 'confirmed'
  const proposed = a.interviewStatus === 'proposed'
  const theyProposed = proposed && a.interviewProposedBy === 'candidate'
  const weProposed = proposed && a.interviewProposedBy === 'company'

  return (
    <Card className={`p-5 ${declined ? 'bg-paper/50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Monogram initials={initialsOf(a.name)} />
          <div className="min-w-0">
            <div className={`text-sm font-bold text-ink ${declined && !a.enrolledElsewhere ? 'line-through opacity-60' : ''}`}>{a.name}</div>
            <div className="text-xs text-ink-soft">{a.program} · {a.university}</div>
            <div className="mt-1 text-xs text-ink-faint">{a.matchScore}% fit · available {a.availability || '—'}</div>
          </div>
        </div>
        {a.enrolled ? (
          <Badge tone="success"><CheckIcon /> Enrolled</Badge>
        ) : a.enrolledElsewhere ? (
          <Badge tone="neutral">In mentorship elsewhere</Badge>
        ) : declined ? (
          <Badge tone="neutral">Declined</Badge>
        ) : confirmed ? (
          <Badge tone="success">Interview set</Badge>
        ) : (
          <Badge tone="gold">Interviewing</Badge>
        )}
      </div>

      {a.enrolledElsewhere && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs text-ink-soft">
            Already in an active mentorship{a.elsewhereLabel ? ` · ${a.elsewhereLabel}` : ' elsewhere'}. A candidate can hold only one at a time, so this application is on hold until they finish or leave it.
          </p>
        </div>
      )}

      {!declined && !a.enrolledElsewhere && (
        <div className="mt-4 border-t border-line pt-4">
          {/* Interview state + controls */}
          {a.interviewAt == null ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-soft">No interview time proposed yet.</span>
              <Button size="sm" onClick={onSchedule}>Propose a time</Button>
            </div>
          ) : confirmed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-success-ink">✓ Interview confirmed · {fmtWhen(a.interviewAt)}</span>
              {a.enrolled ? (
                <span className="text-xs text-ink-faint">Now a mentee</span>
              ) : (
                <Button size="sm" onClick={onEnroll}>Enroll as mentee</Button>
              )}
            </div>
          ) : theyProposed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink">{a.name.split(' ')[0]} proposed <b>{fmtWhen(a.interviewAt)}</b></span>
              <div className="flex gap-2">
                <Button size="sm" onClick={onConfirm}>Accept time</Button>
                <Button size="sm" variant="secondary" onClick={onCounter}>Propose another</Button>
              </div>
            </div>
          ) : weProposed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-soft">Proposed <b className="text-ink">{fmtWhen(a.interviewAt)}</b> — awaiting {a.name.split(' ')[0]}'s response.</span>
              <Button size="sm" variant="secondary" onClick={onCounter}>Change time</Button>
            </div>
          ) : null}

          <div className="mt-3">
            <button type="button" onClick={onDecline} className="text-xs font-semibold text-ink-faint transition-colors hover:text-danger">
              Decline instead
            </button>
          </div>
        </div>
      )}

      {declined && !a.enrolledElsewhere && (
        <div className="mt-3">
          <button type="button" onClick={onReopen} className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink">
            Reopen application
          </button>
        </div>
      )}
    </Card>
  )
}

export default function ApplicantReview() {
  const org = useQuery(api.organizations.mine)
  const orgSlug = org?.slug
  const manage = useQuery(api.tracks.forOrgManage)
  const tracks = manage?.programs ?? []
  const [trackId, setTrackId] = useState<string | null>(null)
  const data = useQuery(
    api.applications.forOrg,
    orgSlug ? { orgSlug, trackId: trackId ? (trackId as Id<'tracks'>) : undefined } : 'skip',
  )
  const setStatus = useMutation(api.applications.setStatus)
  const propose = useMutation(api.applications.proposeInterview)
  const confirm = useMutation(api.applications.confirmInterview)
  const enroll = useMutation(api.applications.enroll)

  const [tab, setTab] = useState<'queue' | 'interviews'>('queue')
  const [sortKey, setSortKey] = useState<SortKey>('match-desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [schedule, setSchedule] = useState<{ id: string; mode: 'accept' | 'counter'; at: number } | null>(null)
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const now = Date.now()
  const applicants: Applicant[] = data?.applicants ?? []
  const cap = data?.cap ?? 50

  const remainingHours = (slaDueAt: number) => Math.max(0, Math.round((slaDueAt - now) / 3_600_000))
  const hoursAgo = (appliedAt: number) => Math.max(0, Math.round((now - appliedAt) / 3_600_000))

  const pending = useMemo(() => {
    // Candidates already in a mentorship elsewhere can't be enrolled here, so
    // keep them out of the active queue (they show in the decided tab).
    const copy = applicants.filter((a) => a.status === 'pending' && !a.enrolledElsewhere)
    copy.sort((a, b) => {
      if (sortKey === 'match-asc') return a.matchScore - b.matchScore
      if (sortKey === 'sla-asc') return a.slaDueAt - b.slaDueAt
      return b.matchScore - a.matchScore
    })
    return copy
  }, [applicants, sortKey])

  const decided = useMemo(
    () => applicants.filter((a) => a.status !== 'pending' || a.enrolledElsewhere).sort((a, b) => (b.interviewAt ?? 0) - (a.interviewAt ?? 0)),
    [applicants],
  )

  const slaAtRisk = pending.filter((a) => remainingHours(a.slaDueAt) < 16).length
  const enrolledCount = applicants.filter((a) => a.enrolled).length
  const interviewingCount = applicants.filter((a) => a.status === 'accepted' && !a.enrolled).length

  const setRow = (id: string, status: 'pending' | 'accepted' | 'declined') =>
    void setStatus({ applicationId: id as Id<'applications'>, status })
  const defaultSlot = () => { const d = new Date(now + 2 * 86400_000); d.setMinutes(0, 0, 0); return d.getTime() }

  return (
    <Page>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Applicant Review</Eyebrow>
          {tracks.length > 1 ? (
            <select
              value={trackId ?? tracks[0]?.id ?? ''}
              onChange={(e) => setTrackId(e.target.value)}
              aria-label="Choose a track to review"
              className="mt-2 max-w-full border border-line-strong bg-cream px-2.5 py-1.5 text-2xl font-black tracking-tight text-ink rounded-[2px] focus:border-ink focus:outline-none sm:text-3xl"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          ) : (
            <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {data?.trackTitle ?? 'Your track'}
            </h1>
          )}
          <p className="mt-1 text-sm font-medium text-ink-soft">{org?.name ?? '…'} · Review, interview, then enrol</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Company standing</div>
            <div className="text-xs font-medium text-ink-soft">Responses within {data?.slaHours ?? 48}h</div>
          </div>
          <ReliabilityScore value={org?.reliabilityDisplay ?? null} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">In the queue</div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">{pending.length}</div>
          <p className="mt-1 text-xs text-ink-soft">Awaiting your decision</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Interviewing</div>
            <Badge tone="gold">{enrolledCount}/{cap} enrolled</Badge>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">{interviewingCount}</div>
          <p className="mt-1 text-xs text-ink-soft">Scheduling before enrolment</p>
        </Card>
        <Card className={`p-5 ${slaAtRisk > 0 ? 'border-danger/30 bg-danger-soft/40' : ''}`}>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">SLA at risk</div>
          <div className={`mt-2 text-3xl font-black tabular-nums tracking-tight ${slaAtRisk > 0 ? 'text-danger-ink' : 'text-ink'}`}>{slaAtRisk}</div>
          <p className="mt-1 text-xs text-ink-soft">Under 16h to respond</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-6 border-b border-line">
        {([['queue', `Queue (${pending.length})`], ['interviews', `Interviews & decisions (${decided.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 py-2.5 text-sm transition-colors ${tab === key ? 'border-gold font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <Card className="mt-6 px-6 py-16 text-center"><p className="text-sm font-semibold text-ink-soft">Loading applicants…</p></Card>
      ) : tab === 'queue' ? (
        pending.length === 0 ? (
          <Card className="mt-6 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-ink">Queue is clear.</p>
            <p className="mt-1.5 text-sm text-ink-soft">New applications appear here. Decided ones move to Interviews &amp; decisions.</p>
          </Card>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-end gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Sort</span>
              {([['match-desc', 'Match: High'], ['match-asc', 'Match: Low'], ['sla-asc', 'SLA: Urgent']] as const).map(([key, label]) => (
                <Button key={key} variant={sortKey === key ? 'primary' : 'secondary'} size="sm" onClick={() => setSortKey(key)}>{label}</Button>
              ))}
            </div>
            <Card className="mt-3 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-paper">
                      {['Candidate', 'Study Status', 'Match Potential', 'Applied'].map((h) => (
                        <th key={h} scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">{h}</th>
                      ))}
                      <th scope="col" className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Response SLA &amp; Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((a) => {
                      const isOpen = expanded.has(a.id)
                      return (
                        <Fragment key={a.id}>
                          <tr className="border-b border-line align-middle transition-colors duration-150 hover:bg-paper">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Monogram initials={initialsOf(a.name)} />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-ink">{a.name}</div>
                                  <button type="button" onClick={() => toggle(a.id)} className="mt-1 text-[11px] font-semibold text-slate hover:text-ink" aria-expanded={isOpen}>
                                    {isOpen ? 'Hide application ▴' : 'View application ▾'}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-sm font-semibold text-ink">{a.program}</div>
                              <div className="text-xs text-ink-soft">{a.university}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="w-40">
                                <div className="mb-1.5 flex items-baseline justify-between">
                                  <span className="text-sm font-bold tabular-nums text-ink">{a.matchScore}%</span>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">{a.matchScore >= 75 ? 'Strong' : a.matchScore >= 55 ? 'Moderate' : 'Stretch'}</span>
                                </div>
                                <ProgressBar value={a.matchScore} tone={matchTone(a.matchScore)} />
                              </div>
                            </td>
                            <td className="px-5 py-4"><span className="text-sm tabular-nums text-ink-soft">{appliedLabel(hoursAgo(a.appliedAt))}</span></td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-end gap-3">
                                <span className={`text-xs font-bold tabular-nums ${remainingHours(a.slaDueAt) < 16 ? 'text-danger-ink' : 'text-ink-soft'}`}>SLA {remainingHours(a.slaDueAt)}h</span>
                                <Button size="sm" onClick={() => setSchedule({ id: a.id, mode: 'accept', at: defaultSlot() })}>Accept &amp; schedule</Button>
                                <Button size="sm" variant="secondary" onClick={() => setRow(a.id, 'declined')}>Decline</Button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line bg-paper/40">
                              <td colSpan={5} className="px-5 pb-5 pt-0">
                                <div className="rounded-[2px] border border-line bg-white p-4">
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
                                    <span><span className="font-semibold text-ink-faint">Availability:</span> {a.availability || '—'}</span>
                                    <span><span className="font-semibold text-ink-faint">Commits:</span> {a.hoursPerWeek || '—'} hrs/week</span>
                                    <span><span className="font-semibold text-ink-faint">Reliability:</span> {a.reliabilityDisplay === null ? 'New' : `${a.reliabilityDisplay}%`}</span>
                                  </div>
                                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Why they're a fit</p>
                                  <p className="mt-1 text-sm leading-relaxed text-ink">{a.note || 'No note provided.'}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      ) : decided.length === 0 ? (
        <Card className="mt-6 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No interviews or decisions yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Accept someone from the queue to schedule an interview.</p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-6 lg:grid-cols-2">
          {decided.map((a) => (
            <DecisionCard
              key={a.id}
              a={a}
              onSchedule={() => setSchedule({ id: a.id, mode: 'counter', at: defaultSlot() })}
              onCounter={() => setSchedule({ id: a.id, mode: 'counter', at: a.interviewAt ?? defaultSlot() })}
              onConfirm={() => void confirm({ applicationId: a.id as Id<'applications'> })}
              onEnroll={() => void enroll({ applicationId: a.id as Id<'applications'> })}
              onDecline={() => setRow(a.id, 'declined')}
              onReopen={() => setRow(a.id, 'pending')}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-ink-faint">Accepting schedules an interview — candidates only become mentees after you enrol them.</p>

      {schedule && (
        <ScheduleModal
          title={schedule.mode === 'accept' ? 'Propose an interview time' : 'Propose another time'}
          initialMs={schedule.at}
          submitLabel={schedule.mode === 'accept' ? 'Accept & propose' : 'Send new time'}
          onClose={() => setSchedule(null)}
          onSubmit={async (at) => {
            if (schedule.mode === 'accept') {
              await setStatus({ applicationId: schedule.id as Id<'applications'>, status: 'accepted', interviewAt: at })
              setTab('interviews')
            } else {
              await propose({ applicationId: schedule.id as Id<'applications'>, at })
            }
          }}
        />
      )}
    </Page>
  )
}
