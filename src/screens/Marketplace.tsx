'use client'

import { useMemo, useState } from 'react'
import {
  Page,
  Eyebrow,
  Card,
  Badge,
  Button,
  ProgressBar,
  ReliabilityScore,
  Input,
  Select,
  TalentbankLogo,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Screen 2 — The Student Marketplace                                 */
/*  Transparent, data-dense grid of open mentorship tracks with live   */
/*  applicant caps and guaranteed-interview SLAs.                      */
/* ------------------------------------------------------------------ */

type Commitment = 'Semester Break Sprint' | 'Concurrent Study Track'

type Track = {
  id: string
  company: string
  monogram: string
  reliability: number
  title: string
  commitment: Commitment
  commitmentLine: string
  skills: string[]
  applicants: number
  cap: number
  slaHours: 24 | 48 | 72
  closesInDays: number
  fitScore: number
}

const TRACKS: Track[] = [
  {
    id: 't1',
    company: 'Talentbank',
    monogram: 'TB',
    reliability: 98,
    title: 'Frontend Architecture Mentorship',
    commitment: 'Concurrent Study Track',
    commitmentLine: '10 hrs/week · Concurrent with Studies',
    skills: ['React', 'TypeScript', 'Design Systems'],
    applicants: 50,
    cap: 50,
    slaHours: 48,
    closesInDays: 3,
    fitScore: 91,
  },
  {
    id: 't2',
    company: 'Gamuda Digital',
    monogram: 'GA',
    reliability: 93,
    title: 'Civil-Tech Data Pipeline Sprint',
    commitment: 'Semester Break Sprint',
    commitmentLine: 'Full-time · 1-Month Sprint',
    skills: ['Python', 'ETL', 'GIS'],
    applicants: 50,
    cap: 50,
    slaHours: 72,
    closesInDays: 1,
    fitScore: 78,
  },
  {
    id: 't3',
    company: 'MoneyLion',
    monogram: 'ML',
    reliability: 88,
    title: 'Risk & Credit Modelling Track',
    commitment: 'Concurrent Study Track',
    commitmentLine: '8 hrs/week · Concurrent with Studies',
    skills: ['SQL', 'Statistics', 'Pandas'],
    applicants: 32,
    cap: 40,
    slaHours: 24,
    closesInDays: 6,
    fitScore: 84,
  },
  {
    id: 't4',
    company: 'Setel',
    monogram: 'ST',
    reliability: 71,
    title: 'Mobile Payments QA Automation',
    commitment: 'Semester Break Sprint',
    commitmentLine: 'Full-time · 6-Week Sprint',
    skills: ['Appium', 'Kotlin', 'CI/CD'],
    applicants: 12,
    cap: 35,
    slaHours: 48,
    closesInDays: 11,
    fitScore: 63,
  },
  {
    id: 't5',
    company: 'Mindvalley',
    monogram: 'MV',
    reliability: 90,
    title: 'Growth Experimentation & Analytics',
    commitment: 'Concurrent Study Track',
    commitmentLine: '6 hrs/week · Concurrent with Studies',
    skills: ['A/B Testing', 'SQL', 'Amplitude'],
    applicants: 28,
    cap: 30,
    slaHours: 24,
    closesInDays: 2,
    fitScore: 88,
  },
  {
    id: 't6',
    company: 'ServiceRocket',
    monogram: 'SR',
    reliability: 82,
    title: 'Platform Integrations Mentorship',
    commitment: 'Concurrent Study Track',
    commitmentLine: '10 hrs/week · Concurrent with Studies',
    skills: ['Node.js', 'REST APIs', 'Webhooks'],
    applicants: 19,
    cap: 45,
    slaHours: 72,
    closesInDays: 8,
    fitScore: 74,
  },
  {
    id: 't7',
    company: 'Monash Malaysia X-Lab',
    monogram: 'MX',
    reliability: 95,
    title: 'Applied Machine Learning Sprint',
    commitment: 'Semester Break Sprint',
    commitmentLine: 'Full-time · 1-Month Sprint',
    skills: ['PyTorch', 'NLP', 'MLOps'],
    applicants: 44,
    cap: 48,
    slaHours: 48,
    closesInDays: 4,
    fitScore: 86,
  },
  {
    id: 't8',
    company: 'Sunway iLabs',
    monogram: 'SI',
    reliability: 77,
    title: 'Product Design Foundations Track',
    commitment: 'Concurrent Study Track',
    commitmentLine: '8 hrs/week · Concurrent with Studies',
    skills: ['Figma', 'UX Research', 'Prototyping'],
    applicants: 9,
    cap: 25,
    slaHours: 72,
    closesInDays: 14,
    fitScore: 69,
  },
  {
    id: 't9',
    company: 'Maybank Tech',
    monogram: 'MB',
    reliability: 91,
    title: 'Cloud Security Engineering Sprint',
    commitment: 'Semester Break Sprint',
    commitmentLine: 'Full-time · 6-Week Sprint',
    skills: ['AWS', 'Terraform', 'IAM'],
    applicants: 38,
    cap: 42,
    slaHours: 24,
    closesInDays: 5,
    fitScore: 81,
  },
]

type FilterChip = 'All' | Commitment
const FILTERS: FilterChip[] = ['All', 'Semester Break Sprint', 'Concurrent Study Track']

type SortKey = 'closing' | 'applicants' | 'fit'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'closing', label: 'Closing soonest' },
  { key: 'applicants', label: 'Fewest applicants' },
  { key: 'fit', label: 'Best fit' },
]

/* small inline icons (sharp, currentColor) */
function ClockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="square" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="square" />
    </svg>
  )
}

function barTone(pct: number): 'success' | 'gold' | 'danger' {
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'gold'
  return 'success'
}

function TrackCard({ track }: { track: Track }) {
  const pct = Math.round((track.applicants / track.cap) * 100)
  const full = track.applicants >= track.cap
  const tone = barTone(pct)
  const closingSoon = track.closesInDays <= 2

  return (
    <Card className="flex flex-col p-5">
      {/* Header: monogram + company + reliability */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {track.company === 'Talentbank' ? (
            <div className="min-w-0">
              <TalentbankLogo className="text-[11px]" />
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                {track.commitment === 'Semester Break Sprint' ? 'Break Sprint' : 'Concurrent Track'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-paper text-sm font-black tracking-tight text-ink rounded-[2px]">
                {track.monogram}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{track.company}</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                  {track.commitment === 'Semester Break Sprint' ? 'Break Sprint' : 'Concurrent Track'}
                </p>
              </div>
            </>
          )}
        </div>
        <ReliabilityScore value={track.reliability} label="Rel" className="shrink-0" />
      </div>

      {/* Title */}
      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-ink">
        {track.title}
      </h3>

      {/* Commitment line */}
      <p className="mt-1.5 text-sm text-ink-soft">{track.commitmentLine}</p>

      {/* Skill tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {track.skills.map((s) => (
          <Badge key={s} tone="slate">
            {s}
          </Badge>
        ))}
      </div>

      {/* SLA badge — highly visible */}
      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 border border-gold/40 bg-gold-soft px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-gold-ink rounded-[2px]">
          <ClockIcon />
          SLA · Guaranteed Interview within {track.slaHours} Hrs
        </span>
      </div>

      {/* Applicants progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            Applicants
          </span>
          <span className="text-xs font-bold tabular-nums text-ink">
            {track.applicants}/{track.cap} <span className="text-ink-faint">(Cap)</span>
          </span>
        </div>
        <ProgressBar value={track.applicants} max={track.cap} tone={tone} />
        {full ? (
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-danger">
            Cap reached · waitlist only
          </p>
        ) : pct >= 90 ? (
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-danger">
            {track.cap - track.applicants} seats left · filling fast
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] tabular-nums text-ink-faint">
            {track.cap - track.applicants} of {track.cap} seats open
          </p>
        )}
      </div>

      {/* Footer: countdown + apply / waitlist */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            closingSoon ? 'text-danger' : 'text-ink-soft'
          }`}
        >
          <ClockIcon />
          {track.closesInDays === 1 ? 'Closes tomorrow' : `Closes in ${track.closesInDays} days`}
        </span>
        {full ? (
          <Button variant="secondary" size="sm" disabled>
            Join Waitlist
          </Button>
        ) : (
          <Button variant="primary" size="sm">
            Apply
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function Marketplace() {
  const [filter, setFilter] = useState<FilterChip>('All')
  const [query, setQuery] = useState<string>('')
  const [sort, setSort] = useState<SortKey>('closing')

  const visible = useMemo<Track[]>(() => {
    const q = query.trim().toLowerCase()
    const filtered = TRACKS.filter((t) => {
      const matchesFilter = filter === 'All' || t.commitment === filter
      const matchesQuery =
        q === '' ||
        t.title.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        t.skills.some((s) => s.toLowerCase().includes(q))
      return matchesFilter && matchesQuery
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'closing':
          return a.closesInDays - b.closesInDays
        case 'applicants':
          return a.applicants - b.applicants
        case 'fit':
          return b.fitScore - a.fitScore
        default:
          return 0
      }
    })
    return sorted
  }, [filter, query, sort])

  const openTracks = TRACKS.filter((t) => t.applicants < t.cap).length
  const avgSla = Math.round(
    TRACKS.reduce((sum, t) => sum + t.slaHours, 0) / TRACKS.length
  )
  const totalSeats = TRACKS.reduce((sum, t) => sum + (t.cap - t.applicants), 0)

  return (
    <Page>
      {/* Header */}
      <header className="mb-8">
        <Eyebrow>Student · Marketplace</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Tracks open for your semester break
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Apply based on your availability. Every track shows live seats and a guaranteed interview
          window, so you always know where you stand.
        </p>
      </header>

      {/* Stats strip */}
      <div className="mb-8 grid grid-cols-1 divide-y divide-line border border-line bg-white rounded-[2px] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Open tracks
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{openTracks}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Avg interview SLA
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{avgSla} hrs</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            Seats available
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{totalSeats}</p>
        </div>
      </div>

      {/* Filter / search / sort bar */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`border px-3.5 py-2 text-xs font-semibold tracking-tight rounded-[2px] transition-colors duration-150 ${
                  active
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {f}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
              <SearchIcon />
            </span>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, skills, companies"
              className="pl-9"
              aria-label="Search tracks"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="sm:w-48"
            aria-label="Sort tracks"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Result count */}
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
        Showing {visible.length} {visible.length === 1 ? 'track' : 'tracks'}
        {filter !== 'All' && <span className="text-ink-soft"> · {filter}</span>}
        {query.trim() !== '' && <span className="text-ink-soft"> · matching “{query.trim()}”</span>}
      </p>

      {/* Grid */}
      {visible.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No tracks match your filters.</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Try clearing the search or switching commitment type.
          </p>
          <div className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilter('All')
                setQuery('')
                setSort('closing')
              }}
            >
              Reset filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </Page>
  )
}
