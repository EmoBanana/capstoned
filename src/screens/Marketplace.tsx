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
  Button,
  ProgressBar,
  Input,
  Select,
  Field,
  Textarea,
} from '../components/ui'
import { CompanyLogo } from '../components/CompanyLogo'
import { errorText } from '../components/errors'
import { useDialog } from '../components/useDialog'
import { SkeletonGrid } from '../components/Skeleton'

const AVAILABILITY = ['Immediately', 'Within 2 weeks', 'Within a month', 'Flexible']

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
  objectives: string[]
  deliverables: string[]
  milestones: { id: string; week: number; title: string; detail: string }[]
  slaHours: number
  closesInDays: number
  reliability: number
  reliabilityDisplay: number | null
  logoUrl: string | null
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

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="square" />
    </svg>
  )
}

function fitTone(pct: number): 'success' | 'gold' | 'danger' {
  return pct >= 75 ? 'success' : pct >= 55 ? 'gold' : 'danger'
}

function TrackCard({
  track,
  fit,
  applied,
  onApply,
  onView,
}: {
  track: TrackRow
  fit: number | null
  applied: boolean
  onApply: () => void
  onView: () => void
}) {
  const full = track.applicants >= track.cap
  const seatsLeft = Math.max(0, track.cap - track.applicants)
  const closesLabel = track.closesInDays === 1 ? 'closes tomorrow' : `${track.closesInDays}d left`

  return (
    <Card className="flex cursor-pointer flex-col p-6 transition-colors hover:border-line-strong" onClick={onView}>
      <div className="flex items-center gap-3">
        <CompanyLogo slug={track.orgSlug} name={track.org} logoUrl={track.logoUrl} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{track.org}</p>
          <p className="truncate text-xs text-ink-faint">
            {INTENSITY_LABEL[track.intensity]} · {track.reliabilityDisplay === null ? 'New' : `${track.reliabilityDisplay}% reliable`}
          </p>
        </div>
      </div>

      <h3 className="mt-5 text-lg font-bold leading-snug tracking-tight text-ink">{track.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{commitmentLine(track)}</p>
      <p className="mt-2 truncate text-xs text-ink-faint">
        {track.requiredSkills.slice(0, 3).map((s) => s.name).join('  ·  ')}
      </p>

      {fit !== null && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs text-ink-faint">Your fit</span>
            <span className="text-sm font-semibold tabular-nums text-ink">{fit}%</span>
          </div>
          <ProgressBar value={fit} tone={fitTone(fit)} height="h-1" />
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div className="min-w-0 text-xs leading-relaxed text-ink-faint">
          <div>Interview within {track.slaHours}h</div>
          <div>
            {full ? 'Waitlist only' : `${seatsLeft} seats left`}
            <span className={closesLabel === 'closes tomorrow' ? ' text-gold-ink' : ''}> · {closesLabel}</span>
          </div>
        </div>
        {applied ? (
          <span className="shrink-0 text-xs font-semibold text-success-ink">✓ Applied</span>
        ) : full ? (
          <Button variant="secondary" size="sm" disabled>
            Waitlist
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onApply() }}>
            Apply
          </Button>
        )}
      </div>
    </Card>
  )
}

function ApplyModal({
  track,
  fit,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  track: TrackRow
  fit: number | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (note: string, availability: string, hours: number) => void
}) {
  const [note, setNote] = useState('')
  const [availability, setAvailability] = useState(AVAILABILITY[0])
  const [hours, setHours] = useState(track.weeklyHours)
  const valid = note.trim().length >= 40
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Apply to ${track.title}`}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-line-strong bg-cream rounded-t-[6px] focus:outline-none sm:rounded-[4px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line px-6 py-5">
          <CompanyLogo slug={track.orgSlug} name={track.org} logoUrl={track.logoUrl} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{track.org}</p>
            <h3 className="text-base font-bold leading-snug tracking-tight text-ink">{track.title}</h3>
            <p className="mt-0.5 text-xs text-ink-soft">{commitmentLine(track)}</p>
          </div>
          {fit !== null && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Your fit</div>
              <div className="text-lg font-black tabular-nums text-ink">{fit}%</div>
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 border border-gold/40 bg-gold-soft px-3 py-2 text-xs text-gold-ink rounded-[2px]">
            Applying here guarantees a real interview within <b>{track.slaHours}h</b>. Your profile and reliability
            score are shared with {track.org}.
          </div>

          <Field label="Why you're a strong fit" hint={`${note.trim().length}/40 min`} required>
            <Textarea
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What draws you to this track, and what relevant experience or drive would you bring? The mentor reads this."
            />
          </Field>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Earliest availability">
              <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
                {AVAILABILITY.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </Field>
            <Field label="Weekly hours" hint={`track expects ${track.weeklyHours}`}>
              <Input
                type="number"
                min={1}
                max={60}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          {error && <span className="mr-auto text-xs font-medium text-danger">{error}</span>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || submitting} onClick={() => onSubmit(note.trim(), availability, hours)}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>
        </div>
      </div>
    </div>
  )
}

type Match = { overall: number; factors: { key: string; label: string; score: number; weight: number; rationale: string }[] }

function TrackDetailModal({
  track,
  match,
  applied,
  onApply,
  onClose,
}: {
  track: TrackRow
  match: Match | null
  applied: boolean
  onApply: () => void
  onClose: () => void
}) {
  const full = track.applicants >= track.cap
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={track.title} tabIndex={-1} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden border border-line-strong bg-cream rounded-t-[6px] focus:outline-none sm:rounded-[4px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-line px-6 py-5">
          <CompanyLogo slug={track.orgSlug} name={track.org} logoUrl={track.logoUrl} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{track.org} · {track.department}</p>
            <h3 className="text-lg font-bold leading-snug tracking-tight text-ink">{track.title}</h3>
            <p className="mt-0.5 text-xs text-ink-soft">{commitmentLine(track)} · Interview within {track.slaHours}h</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">✕</button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-ink-soft">{track.summary}</p>

          {match && (
            <section className="mt-6">
              <div className="flex items-baseline justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Why you match</h4>
                <span className="text-sm font-bold tabular-nums text-ink">{match.overall}% overall</span>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {match.factors.map((f) => (
                  <div key={f.key}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-ink">{f.label} <span className="font-normal text-ink-faint">· {Math.round(f.weight * 100)}% weight</span></span>
                      <span className="font-semibold tabular-nums text-ink">{f.score}%</span>
                    </div>
                    <ProgressBar value={f.score} tone={fitTone(f.score)} height="h-1" />
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{f.rationale}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">What you'll do</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                {track.objectives.map((o, i) => <li key={i} className="flex gap-2"><span className="text-gold">·</span>{o}</li>)}
              </ul>
            </section>
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Deliverables</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                {track.deliverables.map((d, i) => <li key={i} className="flex gap-2"><span className="text-gold">·</span>{d}</li>)}
              </ul>
            </section>
          </div>

          {track.milestones.length > 0 && (
            <section className="mt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Milestones</h4>
              <ol className="mt-2 space-y-2">
                {track.milestones.map((m) => (
                  <li key={m.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 shrink-0 rounded-[2px] border border-line-strong bg-paper px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-ink-soft">Wk {m.week}</span>
                    <span className="text-ink-soft"><span className="font-semibold text-ink">{m.title}.</span> {m.detail}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Required skills</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {track.requiredSkills.map((s) => (
                <span key={s.name} className="border border-line-strong bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft rounded-[2px]">{s.name}</span>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <span className="text-xs text-ink-faint">{full ? 'Waitlist only' : `${Math.max(0, track.cap - track.applicants)} of ${track.cap} seats open`}</span>
          {applied ? (
            <span className="text-xs font-semibold text-success-ink">✓ Applied</span>
          ) : full ? (
            <Button variant="secondary" disabled>Waitlist</Button>
          ) : (
            <Button onClick={onApply}>Apply to this track</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [filter, setFilter] = useState<FilterChip>('All')
  const [query, setQuery] = useState<string>('')
  const [sort, setSort] = useState<SortKey>('fit')
  const [applyTrack, setApplyTrack] = useState<TrackRow | null>(null)
  const [detailTrack, setDetailTrack] = useState<TrackRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

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
        <Eyebrow>Candidate · Marketplace</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Tracks open now
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          Ranked by your real fit — a weighted match across your skills, interests, aspirations, and
          work style. Every track shows live seats and a guaranteed interview window.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-x-10 gap-y-4 border-b border-line pb-6">
        {[
          { label: 'Open tracks', value: openTracks },
          { label: 'Avg interview SLA', value: `${avgSla} hrs` },
          { label: 'Seats available', value: totalSeats },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-black tabular-nums text-ink">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{s.label}</p>
          </div>
        ))}
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
        <SkeletonGrid count={6} />
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
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              fit={fitById.get(track.id) ?? null}
              applied={appliedSet.has(track.id)}
              onApply={() => { setApplyError(null); setApplyTrack(track) }}
              onView={() => setDetailTrack(track)}
            />
          ))}
        </div>
      )}

      {detailTrack && (
        <TrackDetailModal
          track={detailTrack}
          applied={appliedSet.has(detailTrack.id)}
          match={
            candidate
              ? computeMatch(candidate as unknown as CandidateProfile, detailTrack as unknown as DomainTrack)
              : null
          }
          onClose={() => setDetailTrack(null)}
          onApply={() => { const t = detailTrack; setDetailTrack(null); setApplyError(null); setApplyTrack(t) }}
        />
      )}

      {applyTrack && (
        <ApplyModal
          track={applyTrack}
          fit={fitById.get(applyTrack.id) ?? null}
          submitting={submitting}
          error={applyError}
          onClose={() => setApplyTrack(null)}
          onSubmit={async (note, availability, hours) => {
            setSubmitting(true)
            setApplyError(null)
            try {
              await apply({
                trackId: applyTrack.id as Id<'tracks'>,
                matchScore: fitById.get(applyTrack.id) ?? 0,
                note,
                availability,
                hoursPerWeek: hours,
              })
              setApplyTrack(null)
            } catch (e) {
              setApplyError(errorText(e))
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </Page>
  )
}
