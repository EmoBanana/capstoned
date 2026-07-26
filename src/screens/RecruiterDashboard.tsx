'use client'

import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow, ReliabilityScore } from '../components/ui'
import { SkeletonGrid } from '../components/Skeleton'

/* ------------------------------------------------------------------ */
/*  Company home — real mentorship programs for the recruiter's org.    */
/* ------------------------------------------------------------------ */

type Status = 'draft' | 'open' | 'in-progress' | 'closed'
type Program = {
  id: string
  title: string
  status: Status
  intensity: 'light' | 'moderate' | 'intense'
  durationWeeks: number
  weeklyHours: number
  cap: number
  applicants: number
  enrolled: number
  avgFit: number | null
}

const STATUS_META: Record<Status, { label: string; tone: 'gold' | 'success' | 'neutral' | 'slate' }> = {
  'in-progress': { label: 'In progress', tone: 'gold' },
  open: { label: 'Open', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'slate' },
}

const commitmentLine = (p: Program) =>
  p.intensity === 'intense' ? `Full-time · ${p.durationWeeks} weeks` : `${p.weeklyHours} hrs/week · ${p.durationWeeks} weeks`

type Filter = 'all' | Status
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In progress' },
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

function ProgramCard({ program, onNavigate }: { program: Program; onNavigate?: (id: string) => void }) {
  const meta = STATUS_META[program.status]
  const fillPct = program.cap ? Math.round((program.applicants / program.cap) * 100) : 0
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {program.avgFit !== null && (
          <span className="text-xs text-ink-faint">
            Avg fit <span className="font-bold text-ink">{program.avgFit}%</span>
          </span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-ink">{program.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{commitmentLine(program)}</p>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-ink-faint">Applicants</span>
          <span className="text-sm font-semibold tabular-nums text-ink">{program.applicants}/{program.cap}</span>
        </div>
        <ProgressBar value={program.applicants} max={program.cap} tone={fillPct >= 90 ? 'danger' : 'slate'} height="h-1" />
      </div>

      <div className="mt-4 flex gap-6 text-xs text-ink-faint">
        <span><span className="font-bold text-ink">{program.enrolled}</span> enrolled</span>
        <span><span className="font-bold text-ink">{program.applicants}</span> applied</span>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-6">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => onNavigate?.('applicants')}>
          Review applicants
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('mentees')}>
          Mentees
        </Button>
      </div>
    </Card>
  )
}

export default function RecruiterDashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const data = useQuery(api.tracks.forOrgManage)
  const [filter, setFilter] = useState<Filter>('all')

  const programs = useMemo<Program[]>(() => (data?.programs ?? []) as Program[], [data])
  const visible = filter === 'all' ? programs : programs.filter((p) => p.status === filter)

  const activePrograms = programs.filter((p) => p.status === 'open' || p.status === 'in-progress').length
  const applicantsInReview = programs.reduce((s, p) => s + p.applicants, 0)
  const enrolledMentees = programs.reduce((s, p) => s + p.enrolled, 0)

  return (
    <Page>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Company · Dashboard</Eyebrow>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Your mentorship programs</h1>
          <p className="mt-3 text-sm text-ink-soft">{data?.org.name ?? '…'}</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => onNavigate?.('new-track')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Track
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active programs" value={String(activePrograms)} sub="Open or running now" />
        <Stat label="Applicants in review" value={String(applicantsInReview)} sub="Across your tracks" />
        <Stat label="Enrolled mentees" value={String(enrolledMentees)} sub="Currently mentoring" />
        <Card className="flex flex-col justify-between p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Company standing</div>
          <div className="mt-3"><ReliabilityScore value={data?.org.reliability ?? 95} /></div>
        </Card>
      </div>

      <div className="mt-8 mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = f.key === 'all' ? programs.length : programs.filter((p) => p.status === f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`border px-3.5 py-2 text-xs font-semibold tracking-tight rounded-[2px] transition-colors duration-150 ${
                active ? 'border-ink bg-ink text-cream' : 'border-line-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 tabular-nums ${active ? 'text-cream/60' : 'text-ink-faint'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {data === undefined ? (
        <SkeletonGrid count={4} className="sm:grid-cols-2" />
      ) : programs.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No tracks yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Publish your first mentorship track to start receiving applicants.</p>
          <div className="mt-5"><Button size="sm" onClick={() => onNavigate?.('new-track')}>Create a track</Button></div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-16 text-center"><p className="text-sm font-semibold text-ink">No programs in this state.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          {visible.map((p) => (
            <ProgramCard key={p.id} program={p} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </Page>
  )
}
