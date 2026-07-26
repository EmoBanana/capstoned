'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { computeMatch } from '@/src/lib/matching'
import type { CandidateProfile, Track as DomainTrack } from '@/src/lib/domain'
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
} from '../components/ui'
import { CompanyLogo } from '../components/CompanyLogo'

/* ------------------------------------------------------------------ */
/*  Student Marketplace — live Convex tracks, real per-candidate fit   */
/*  computed with Session A's weighted decision matrix (matching.ts).  */
/* ------------------------------------------------------------------ */

type Intensity = 'light' | 'moderate' | 'intense'

type TrackRow = {
  id: string
  title: string
  org: string
  orgSlug: string
  department: string
  summary: string
  durationWeeks: number
  intensity: Intensity
  weeklyHours: number
  cap: number
  applicants: number
  requiredSkills: { name: string; weight: number; targetLevel: number }[]
  slaHours: number
  closesInDays: number
  reliability: number
  // (plus domain fields used only by computeMatch — passed through)
  [key: string]: unknown
}

const INTENSITY_LABEL: Record<Intensity, string> = {
  light: 'Light',
  moderate: 'Moderate',
  intense: 'Intense',
}

type FilterChip = 'All' | Intensity
const FILTERS: FilterChip[] = ['All', 'light', 'moderate', 'intense']

type SortKey = 'fit' | 'closing' | 'applicants'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'fit', label: 'Best fit for you' },
  { key: 'closing', label: 'Closing soonest' },
  { key: 'applicants', label: 'Fewest applicants' },
]

function commitmentLine(t: TrackRow): string {
  return t.intensity === 'intense'
    ? `Full-time · ${t.durationWeeks} weeks`
    : `${t.weeklyHours} hrs/week · ${t.durationWeeks} weeks`
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="square" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
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
function fitTone(pct: number): 'success' | 'gold' | 'danger' {
  return pct >= 75 ? 'success' : pct >= 55 ? 'gold' : 'danger'
}

function TrackCard({
  track,
  fit,
  applied,
  onApply,
}: {
  track: TrackRow
  fit: number | null
  applied: boolean
  onApply: () => void
}) {
  const pct = Math.round((track.applicants / track.cap) * 100)
  const full = track.applicants >= track.cap
  const closingSoon = track.closesInDays <= 2

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo slug={track.orgSlug} name={track.org} className="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{track.org}</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              {INTENSITY_LABEL[track.intensity]}
            </p>
          </div>
        </div>
        <ReliabilityScore value={track.reliability} label="Rel" className="shrink-0" />
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-ink">{track.title}</h3>
      <p className="mt-1.5 text-sm text-ink-soft">{commitmentLine(track)}</p>

      {/* Your fit — real weighted-matrix result */}
      {fit !== null && (
        <div className="mt-3 border border-line bg-paper px-3 py-2 rounded-[2px]">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Your fit
            </span>
            <span className="text-sm font-bold tabular-nums text-ink">{fit}%</span>
          </div>
          <ProgressBar value={fit} tone={fitTone(fit)} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {track.requiredSkills.slice(0, 3).map((s) => (
          <Badge key={s.name} tone="slate">
            {s.name}
          </Badge>
        ))}
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 border border-gold/40 bg-gold-soft px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-gold-ink rounded-[2px]">
          <ClockIcon />
          SLA · Guaranteed Interview within {track.slaHours} Hrs
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">Applicants</span>
          <span className="text-xs font-bold tabular-nums text-ink">
            {track.applicants}/{track.cap} <span className="text-ink-faint">(Cap)</span>
          </span>
        </div>
        <ProgressBar value={track.applicants} max={track.cap} tone={barTone(pct)} />
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

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            closingSoon ? 'text-danger' : 'text-ink-soft'
          }`}
        >
          <ClockIcon />
          {track.closesInDays === 1 ? 'Closes tomorrow' : `Closes in ${track.closesInDays} days`}
        </span>
        {applied ? (
          <Button variant="secondary" size="sm" disabled>
            ✓ Applied
          </Button>
        ) : full ? (
          <Button variant="secondary" size="sm" disabled>
            Join Waitlist
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onApply}>
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
  const [sort, setSort] = useState<SortKey>('fit')

  const trackData = useQuery(api.tracks.list)
  const candidate = useQuery(api.candidates.current)
  const myTrackIds = useQuery(api.applications.myTrackIds)
  const apply = useMutation(api.applications.apply)
  const appliedSet = useMemo(() => new Set(myTrackIds ?? []), [myTrackIds])
  const loading = trackData === undefined || candidate === undefined

  const tracks = useMemo<TrackRow[]>(() => (trackData ?? []) as TrackRow[], [trackData])

  // Real weighted-matrix fit per track, keyed by id.
  const fitById = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    if (!candidate) return m
    for (const t of tracks) {
      m.set(t.id, computeMatch(candidate as unknown as CandidateProfile, t as unknown as DomainTrack).overall)
    }
    return m
  }, [tracks, candidate])

  const visible = useMemo<TrackRow[]>(() => {
    const q = query.trim().toLowerCase()
    const filtered = tracks.filter((t) => {
      const matchesFilter = filter === 'All' || t.intensity === filter
      const matchesQuery =
        q === '' ||
        t.title.toLowerCase().includes(q) ||
        t.org.toLowerCase().includes(q) ||
        t.requiredSkills.some((s) => s.name.toLowerCase().includes(q))
      return matchesFilter && matchesQuery
    })
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'fit':
          return (fitById.get(b.id) ?? 0) - (fitById.get(a.id) ?? 0)
        case 'closing':
          return a.closesInDays - b.closesInDays
        case 'applicants':
          return a.applicants - b.applicants
        default:
          return 0
      }
    })
    return sorted
  }, [tracks, filter, query, sort, fitById])

  const openTracks = tracks.filter((t) => t.applicants < t.cap).length
  const avgSla = tracks.length
    ? Math.round(tracks.reduce((s, t) => s + t.slaHours, 0) / tracks.length)
    : 0
  const totalSeats = tracks.reduce((s, t) => s + Math.max(0, t.cap - t.applicants), 0)

  return (
    <Page>
      <header className="mb-8">
        <Eyebrow>Student · Marketplace</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Tracks open now
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Ranked by your real fit — a weighted match across your skills, interests, aspirations, and
          work style. Every track shows live seats and a guaranteed interview window.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 divide-y divide-line border border-line bg-white rounded-[2px] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Open tracks</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{openTracks}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Avg interview SLA</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{avgSla} hrs</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">Seats available</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-ink">{totalSeats}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f
            const label = f === 'All' ? 'All' : INTENSITY_LABEL[f]
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
                {label}
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
            className="sm:w-52"
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

      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {loading ? (
          'Loading tracks…'
        ) : (
          <>
            Showing {visible.length} {visible.length === 1 ? 'track' : 'tracks'}
            {filter !== 'All' && <span className="text-ink-soft"> · {INTENSITY_LABEL[filter]}</span>}
            {query.trim() !== '' && (
              <span className="text-ink-soft"> · matching “{query.trim()}”</span>
            )}
          </>
        )}
      </p>

      {loading ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading open tracks…</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No tracks match your filters.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Try clearing the search or switching intensity.</p>
          <div className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilter('All')
                setQuery('')
                setSort('fit')
              }}
            >
              Reset filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              fit={fitById.get(track.id) ?? null}
              applied={appliedSet.has(track.id)}
              onApply={() =>
                void apply({
                  trackId: track.id as Id<'tracks'>,
                  matchScore: fitById.get(track.id) ?? 0,
                })
              }
            />
          ))}
        </div>
      )}
    </Page>
  )
}
