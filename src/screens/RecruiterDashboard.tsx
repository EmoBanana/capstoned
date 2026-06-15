import { useState } from 'react'
import {
  Page,
  Card,
  Badge,
  Button,
  ProgressBar,
  Eyebrow,
  ReliabilityScore,
  TalentbankLogo,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Recruiter home — Mentorship Programs Dashboard                     */
/* ------------------------------------------------------------------ */

type Status = 'in-progress' | 'open' | 'draft'

type Program = {
  id: string
  title: string
  commitment: string
  status: Status
  week?: number
  totalWeeks?: number
  applicants?: number
  cap?: number
  enrolled: number
  avgFit?: number
}

const PROGRAMS: Program[] = [
  {
    id: 'p1',
    title: 'Frontend Architecture Mentorship',
    commitment: 'Concurrent · 10 hrs/week',
    status: 'in-progress',
    week: 8,
    totalWeeks: 12,
    applicants: 47,
    cap: 50,
    enrolled: 6,
    avgFit: 83,
  },
  {
    id: 'p2',
    title: 'Mobile Growth Analytics Track',
    commitment: 'Semester Break Sprint · 1 Month',
    status: 'open',
    applicants: 32,
    cap: 40,
    enrolled: 0,
  },
  {
    id: 'p3',
    title: 'Backend Reliability Sprint',
    commitment: 'Full-time · 6-Week Sprint',
    status: 'in-progress',
    week: 3,
    totalWeeks: 6,
    enrolled: 4,
    avgFit: 80,
  },
  {
    id: 'p4',
    title: 'Data Platform Mentorship',
    commitment: 'Concurrent · 8 hrs/week',
    status: 'draft',
    enrolled: 0,
  },
]

const STATUS_META: Record<Status, { label: string; tone: 'gold' | 'success' | 'neutral' }> = {
  'in-progress': { label: 'In progress', tone: 'gold' },
  open: { label: 'Open', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
}

type Filter = 'all' | Status
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'open', label: 'Open' },
  { key: 'draft', label: 'Draft' },
]

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </Card>
  )
}

function ProgramCard({
  program,
  onNavigate,
}: {
  program: Program
  onNavigate?: (id: string) => void
}) {
  const meta = STATUS_META[program.status]
  const fillPct =
    program.applicants !== undefined && program.cap
      ? Math.round((program.applicants / program.cap) * 100)
      : 0

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {program.avgFit !== undefined && (
          <span className="text-xs font-semibold tabular-nums text-ink-soft">
            Avg fit <span className="font-bold text-ink">{program.avgFit}%</span>
          </span>
        )}
      </div>

      <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-ink">{program.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{program.commitment}</p>

      {/* In-progress: week tracker */}
      {program.status === 'in-progress' && program.week && program.totalWeeks && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">Progress</span>
            <span className="text-xs font-semibold tabular-nums text-ink">
              Week {program.week} / {program.totalWeeks}
            </span>
          </div>
          <ProgressBar value={program.week} max={program.totalWeeks} tone="gold" />
        </div>
      )}

      {/* Open: applicant fill */}
      {program.status === 'open' && program.applicants !== undefined && program.cap && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">Applicants</span>
            <span className="text-xs font-bold tabular-nums text-ink">
              {program.applicants}/{program.cap}
            </span>
          </div>
          <ProgressBar value={program.applicants} max={program.cap} tone={fillPct >= 90 ? 'danger' : 'slate'} />
        </div>
      )}

      {/* Draft note */}
      {program.status === 'draft' && (
        <p className="mt-4 border-l-2 border-line-strong bg-cream px-3 py-2 text-xs text-ink-soft">
          Not yet published. Finish setup to open it to applicants.
        </p>
      )}

      {/* meta grid */}
      <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line rounded-[2px] text-center">
        <div className="bg-white px-3 py-3">
          <div className="text-base font-bold tabular-nums text-ink">{program.enrolled}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Enrolled
          </div>
        </div>
        <div className="bg-white px-3 py-3">
          <div className="text-base font-bold tabular-nums text-ink">
            {program.applicants !== undefined ? program.applicants : '—'}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Applicants
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-line pt-4">
        {program.status === 'draft' ? (
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onNavigate?.('new-track')}>
            Finish setup
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => onNavigate?.('applicants')}
            >
              View applicants
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('mentees')}>
              Manage
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

export default function RecruiterDashboard({
  onNavigate,
}: {
  onNavigate?: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? PROGRAMS : PROGRAMS.filter((p) => p.status === filter)

  const activePrograms = PROGRAMS.filter((p) => p.status !== 'draft').length
  const applicantsInReview = PROGRAMS.reduce((sum, p) => sum + (p.applicants ?? 0), 0)
  const enrolledMentees = PROGRAMS.reduce((sum, p) => sum + p.enrolled, 0)

  return (
    <Page>
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Recruiter · Dashboard</Eyebrow>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Your mentorship programs
          </h1>
          <div className="mt-3 flex items-center gap-2.5">
            <TalentbankLogo className="text-xs" />
            <span className="text-sm text-ink-soft">Talent Team</span>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={() => onNavigate?.('new-track')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Program
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active programs" value={String(activePrograms)} sub="Open or running now" />
        <Stat label="Applicants in review" value={String(applicantsInReview)} sub="Awaiting your review" />
        <Stat label="Enrolled mentees" value={String(enrolledMentees)} sub="Currently mentoring" />
        <Card className="flex flex-col justify-between p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Company standing
          </div>
          <div className="mt-3">
            <ReliabilityScore value={98} />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mt-8 mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count =
            f.key === 'all' ? PROGRAMS.length : PROGRAMS.filter((p) => p.status === f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`border px-3.5 py-2 text-xs font-semibold tracking-tight rounded-[2px] transition-colors duration-150 ${
                active
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 tabular-nums ${active ? 'text-cream/60' : 'text-ink-faint'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Programs grid */}
      {visible.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No programs in this state.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {visible.map((p) => (
            <ProgramCard key={p.id} program={p} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </Page>
  )
}
