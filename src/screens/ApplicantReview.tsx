import { useMemo, useState } from 'react'
import {
  Page,
  Card,
  Badge,
  Button,
  ProgressBar,
  Eyebrow,
  ReliabilityScore,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Screen 3 — Applicant Review Dashboard (Recruiter, data table)      */
/* ------------------------------------------------------------------ */

type RowStatus = 'pending' | 'accepted' | 'declined'

// The company's published interview SLA for this track (hours). Every row's
// remaining SLA is derived from this single source of truth minus time elapsed
// since the application landed, so the numbers always reconcile.
const SLA_WINDOW_HOURS = 48

// Seats already filled from earlier intake rounds, before this review queue.
const FILLED_BEFORE = 41
const COHORT_CAP = 50

type Applicant = {
  id: string
  name: string
  initials: string
  year: number
  university: string
  match: number
  hoursAgo: number // time since application landed
}

const APPLICANTS: Applicant[] = [
  { id: 'a1', name: 'John Doe', initials: 'JD', year: 3, university: 'Sunway University', match: 94, hoursAgo: 38 },
  { id: 'a2', name: 'Daniel Lim Wei Jun', initials: 'DL', year: 3, university: 'Universiti Malaya', match: 88, hoursAgo: 36 },
  { id: 'a3', name: 'Tan Mei Xin', initials: 'TM', year: 2, university: "Taylor's University", match: 81, hoursAgo: 20 },
  { id: 'a4', name: 'Arjun Subramaniam', initials: 'AS', year: 4, university: 'Monash University Malaysia', match: 76, hoursAgo: 8 },
  { id: 'a5', name: 'Chloe Wong Sze Min', initials: 'CW', year: 1, university: 'Sunway University', match: 69, hoursAgo: 39 },
  { id: 'a6', name: 'Muhammad Faiz Azman', initials: 'MF', year: 3, university: 'Universiti Sains Malaysia', match: 64, hoursAgo: 4 },
  { id: 'a7', name: 'Priya Nair', initials: 'PN', year: 2, university: 'Universiti Malaya', match: 58, hoursAgo: 30 },
  { id: 'a8', name: 'Joshua Tay Chee Keong', initials: 'JT', year: 4, university: "Taylor's University", match: 52, hoursAgo: 12 },
]

const slaRemaining = (hoursAgo: number): number => Math.max(0, SLA_WINDOW_HOURS - hoursAgo)

const appliedLabel = (hoursAgo: number): string =>
  hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`

function matchTone(v: number): 'success' | 'gold' | 'danger' {
  return v >= 75 ? 'success' : v >= 55 ? 'gold' : 'danger'
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="4" y="5.5" width="16" height="14" rx="0" />
      <path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
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
  if (urgent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-danger/30 bg-danger-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-danger-ink tabular-nums">
        <ClockIcon />
        SLA: {hours}h Remaining
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-slate/30 bg-slate-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-ink tabular-nums">
      <ClockIcon />
      SLA: {hours}h
    </span>
  )
}

type SortKey = 'match-desc' | 'match-asc' | 'sla-asc'

export default function ApplicantReview() {
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({})
  const [sortKey, setSortKey] = useState<SortKey>('match-desc')

  const setStatus = (id: string, status: RowStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: status }))

  const statusOf = (id: string): RowStatus => statuses[id] ?? 'pending'

  const rows = useMemo(() => {
    const copy = [...APPLICANTS]
    copy.sort((a, b) => {
      if (sortKey === 'match-asc') return a.match - b.match
      if (sortKey === 'sla-asc') return slaRemaining(a.hoursAgo) - slaRemaining(b.hoursAgo)
      return b.match - a.match
    })
    return copy
  }, [sortKey])

  const total = APPLICANTS.length
  const cap = COHORT_CAP
  const accepted =
    FILLED_BEFORE + Object.values(statuses).filter((s) => s === 'accepted').length
  const slaAtRisk = APPLICANTS.filter(
    (a) => slaRemaining(a.hoursAgo) < 16 && statusOf(a.id) === 'pending',
  ).length

  return (
    <Page>
      {/* ---- Header strip ---- */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Applicant Review</Eyebrow>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Frontend Architecture Mentorship
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Cohort July 2026 · Talentbank · Reviewing incoming applications
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Company SLA Standing
            </div>
            <div className="text-xs font-medium text-ink-soft">Responses within 48h</div>
          </div>
          <ReliabilityScore value={98} />
        </div>
      </div>

      {/* ---- Stats row ---- */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Total Applicants
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">
            {total}
          </div>
          <p className="mt-1 text-xs text-ink-soft">Across all study years</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Cohort Capacity
            </div>
            <Badge tone="gold">Filling</Badge>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">
            {accepted} <span className="text-lg font-bold text-ink-faint">/ {cap}</span>
          </div>
          <ProgressBar value={accepted} max={cap} tone="gold" className="mt-3" />
        </Card>

        <Card className="border-danger/30 bg-danger-soft/40 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-danger-ink">
              SLA At Risk
            </div>
            <Badge tone="danger">Act Now</Badge>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-danger-ink">
            {slaAtRisk}
          </div>
          <p className="mt-1 text-xs font-medium text-danger-ink/80">
            Applicants under 16h to respond
          </p>
        </Card>
      </div>

      {/* ---- Table toolbar ---- */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">Application Queue</h2>
          <p className="text-xs text-ink-soft">
            Ranked by AI match potential against the track competency model.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Sort
          </span>
          <Button
            variant={sortKey === 'match-desc' ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={sortKey === 'match-desc'}
            onClick={() => setSortKey('match-desc')}
          >
            <SortIcon />
            Match: High
          </Button>
          <Button
            variant={sortKey === 'match-asc' ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={sortKey === 'match-asc'}
            onClick={() => setSortKey('match-asc')}
          >
            Match: Low
          </Button>
          <Button
            variant={sortKey === 'sla-asc' ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={sortKey === 'sla-asc'}
            onClick={() => setSortKey('sla-asc')}
          >
            SLA: Urgent
          </Button>
        </div>
      </div>

      {/* ---- Data table ---- */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper">
                <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Student
                </th>
                <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Study Status
                </th>
                <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  AI Match Potential
                </th>
                <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Applied
                </th>
                <th scope="col" className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Response SLA &amp; Decision
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const status = statusOf(a.id)
                const decided = status !== 'pending'
                return (
                  <tr
                    key={a.id}
                    className={`border-b border-line align-middle transition-colors duration-150 last:border-b-0 ${
                      status === 'accepted'
                        ? 'bg-success-soft/40'
                        : status === 'declined'
                          ? 'bg-paper/60'
                          : 'hover:bg-paper'
                    }`}
                  >
                    {/* Student */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Monogram initials={a.initials} />
                        <div className="min-w-0">
                          <div
                            className={`truncate text-sm font-bold text-ink ${
                              status === 'declined' ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {a.name}
                          </div>
                          <div className="mt-1">
                            <Badge tone="success">
                              <CheckIcon />
                              Verified Student
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Study status */}
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-ink">Year {a.year}</div>
                      <div className="text-xs text-ink-soft">{a.university}</div>
                    </td>

                    {/* AI match */}
                    <td className="px-5 py-4">
                      <div className="w-40">
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="text-sm font-bold tabular-nums text-ink">
                            {a.match}%
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                            {a.match >= 75 ? 'Strong' : a.match >= 55 ? 'Moderate' : 'Stretch'}
                          </span>
                        </div>
                        <ProgressBar value={a.match} tone={matchTone(a.match)} />
                      </div>
                    </td>

                    {/* Applied */}
                    <td className="px-5 py-4">
                      <span className="text-sm tabular-nums text-ink-soft">{appliedLabel(a.hoursAgo)}</span>
                    </td>

                    {/* SLA + actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        {decided ? (
                          status === 'accepted' ? (
                            <>
                              <Badge tone="success">
                                <CalendarIcon />
                                Interview Scheduled
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatus(a.id, 'pending')}
                              >
                                Undo
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge tone="neutral">Declined</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatus(a.id, 'pending')}
                              >
                                Undo
                              </Button>
                            </>
                          )
                        ) : (
                          <>
                            <SlaPill hours={slaRemaining(a.hoursAgo)} />
                            <Button size="sm" onClick={() => setStatus(a.id, 'accepted')}>
                              Accept &amp; Interview
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setStatus(a.id, 'declined')}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink-faint">
        Accepting an applicant opens an interview slot and pauses their countdown.
      </p>
    </Page>
  )
}
