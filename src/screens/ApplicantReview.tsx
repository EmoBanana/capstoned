'use client'

import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow, ReliabilityScore } from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Applicant Review (Recruiter) — live Convex applications, real      */
/*  weighted-match scores, server-persisted accept / decline.          */
/* ------------------------------------------------------------------ */

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—'
const appliedLabel = (hoursAgo: number) =>
  hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`
const matchTone = (v: number): 'success' | 'gold' | 'danger' =>
  v >= 75 ? 'success' : v >= 55 ? 'gold' : 'danger'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="0" />
      <path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  )
}
function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M7 4.5v15M7 19.5l-3-3M7 19.5l3-3M17 19.5v-15M17 4.5l-3 3M17 4.5l3 3" />
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

function SlaPill({ hours }: { hours: number }) {
  const urgent = hours < 16
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] tabular-nums ${
        urgent
          ? 'border-danger/30 bg-danger-soft text-danger-ink'
          : 'border-slate/30 bg-slate-soft text-slate-ink'
      }`}
    >
      <ClockIcon />
      SLA: {hours}h{urgent ? ' Remaining' : ''}
    </span>
  )
}

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
  name: string
  university: string
  program: string
  animalKey: string
  reliability: number
}

export default function ApplicantReview() {
  const org = useQuery(api.organizations.mine)
  const orgSlug = org?.slug
  const data = useQuery(api.applications.forOrg, orgSlug ? { orgSlug } : 'skip')
  const orgRel = useQuery(api.reliability.orgScore, orgSlug ? { orgSlug } : 'skip')
  const setStatus = useMutation(api.applications.setStatus)
  const [sortKey, setSortKey] = useState<SortKey>('match-desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
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

  const rows = useMemo(() => {
    const copy = [...applicants]
    copy.sort((a, b) => {
      if (sortKey === 'match-asc') return a.matchScore - b.matchScore
      if (sortKey === 'sla-asc') return a.slaDueAt - b.slaDueAt
      return b.matchScore - a.matchScore
    })
    return copy
  }, [applicants, sortKey])

  const total = applicants.length
  const accepted = applicants.filter((a) => a.status === 'accepted').length
  const slaAtRisk = applicants.filter(
    (a) => a.status === 'pending' && remainingHours(a.slaDueAt) < 16,
  ).length

  const setRow = (id: string, status: 'pending' | 'accepted' | 'declined') =>
    void setStatus({ applicationId: id as Id<'applications'>, status })

  return (
    <Page>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Applicant Review</Eyebrow>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {data?.trackTitle ?? 'Frontend Architecture Mentorship'}
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            {org?.name ?? '…'} · Reviewing incoming applications
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Company SLA Standing
            </div>
            <div className="text-xs font-medium text-ink-soft">Responses within {data?.slaHours ?? 48}h</div>
          </div>
          <ReliabilityScore value={orgRel?.score ?? 98} />
        </div>
      </div>

      {orgRel && orgRel.events.length > 0 && (
        <p className="mt-3 text-xs text-ink-faint">
          Reliability {orgRel.score}% (base {orgRel.base}) ·{' '}
          {orgRel.events.map((e, i) => (
            <span key={i} className={e.delta < 0 ? 'text-danger' : 'text-success'}>
              {e.delta > 0 ? '+' : ''}{e.delta} {e.reason}
              {i < orgRel.events.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Total Applicants</div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">{total}</div>
          <p className="mt-1 text-xs text-ink-soft">In this review queue</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Accepted</div>
            <Badge tone="gold">of {cap} cap</Badge>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">
            {accepted} <span className="text-lg font-bold text-ink-faint">/ {cap}</span>
          </div>
          <ProgressBar value={accepted} max={cap} tone="gold" className="mt-3" />
        </Card>
        <Card className="border-danger/30 bg-danger-soft/40 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-danger-ink">SLA At Risk</div>
            <Badge tone="danger">Act Now</Badge>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-danger-ink">{slaAtRisk}</div>
          <p className="mt-1 text-xs font-medium text-danger-ink/80">Applicants under 16h to respond</p>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">Application Queue</h2>
          <p className="text-xs text-ink-soft">Ranked by weighted match against the track competency model.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Sort</span>
          {([['match-desc', 'Match: High'], ['match-asc', 'Match: Low'], ['sla-asc', 'SLA: Urgent']] as const).map(
            ([key, label]) => (
              <Button
                key={key}
                variant={sortKey === key ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={sortKey === key}
                onClick={() => setSortKey(key)}
              >
                {key === 'match-desc' && <SortIcon />}
                {label}
              </Button>
            ),
          )}
        </div>
      </div>

      {data === undefined ? (
        <Card className="mt-4 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading applicants…</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-4 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No applicants yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">New applications will appear here as candidates apply.</p>
        </Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-paper">
                  {['Candidate', 'Study Status', 'Match Potential', 'Applied'].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Response SLA &amp; Decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const decided = a.status !== 'pending'
                  const isOpen = expanded.has(a.id)
                  return (
                    <Fragment key={a.id}>
                    <tr
                      className={`border-b border-line align-middle transition-colors duration-150 ${isOpen ? '' : 'border-b'} ${
                        a.status === 'accepted' ? 'bg-success-soft/40' : a.status === 'declined' ? 'bg-paper/60' : 'hover:bg-paper'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Monogram initials={initialsOf(a.name)} />
                          <div className="min-w-0">
                            <div className={`truncate text-sm font-bold text-ink ${a.status === 'declined' ? 'line-through opacity-60' : ''}`}>
                              {a.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggle(a.id)}
                              className="mt-1 text-[11px] font-semibold text-slate hover:text-ink"
                              aria-expanded={isOpen}
                            >
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
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                              {a.matchScore >= 75 ? 'Strong' : a.matchScore >= 55 ? 'Moderate' : 'Stretch'}
                            </span>
                          </div>
                          <ProgressBar value={a.matchScore} tone={matchTone(a.matchScore)} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm tabular-nums text-ink-soft">{appliedLabel(hoursAgo(a.appliedAt))}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {decided ? (
                            a.status === 'accepted' ? (
                              <>
                                <Badge tone="success">
                                  <CalendarIcon />
                                  Interview Scheduled
                                </Badge>
                                <Button size="sm" variant="ghost" onClick={() => setRow(a.id, 'pending')}>
                                  Undo
                                </Button>
                              </>
                            ) : (
                              <>
                                <Badge tone="neutral">Declined</Badge>
                                <Button size="sm" variant="ghost" onClick={() => setRow(a.id, 'pending')}>
                                  Undo
                                </Button>
                              </>
                            )
                          ) : (
                            <>
                              <SlaPill hours={remainingHours(a.slaDueAt)} />
                              <Button size="sm" onClick={() => setRow(a.id, 'accepted')}>
                                Accept &amp; Interview
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setRow(a.id, 'declined')}>
                                Decline
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={`border-b border-line ${a.status === 'accepted' ? 'bg-success-soft/20' : 'bg-paper/40'}`}>
                        <td colSpan={5} className="px-5 pb-5 pt-0">
                          <div className="rounded-[2px] border border-line bg-white p-4">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
                              <span><span className="font-semibold text-ink-faint">Availability:</span> {a.availability || '—'}</span>
                              <span><span className="font-semibold text-ink-faint">Commits:</span> {a.hoursPerWeek || '—'} hrs/week</span>
                              <span><span className="font-semibold text-ink-faint">Reliability:</span> {a.reliability}%</span>
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
      )}

      <p className="mt-4 text-xs text-ink-faint">
        Accepting an applicant opens an interview slot and pauses their countdown.
      </p>
    </Page>
  )
}
