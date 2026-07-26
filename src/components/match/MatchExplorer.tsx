'use client'

/* ------------------------------------------------------------------ */
/*  CapStoned — Match Explorer (connected)                             */
/*                                                                      */
/*  The real end-to-end weighted-matrix feature: live Convex candidate  */
/*  + tracks, ranked by Session A's `computeMatch`, with a real apply   */
/*  mutation. Left = ranked tracks, right = the in-depth MatchReport.   */
/*  Mount inside a ConvexProvider (same context as Marketplace).        */
/* ------------------------------------------------------------------ */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { computeMatch } from '@/src/lib/matching'
import { toCandidateProfile, toTrack } from '@/src/lib/convex-adapters'
import type { CandidateProfile, Track } from '@/src/lib/domain'
import { Page, Eyebrow, Card, Badge, Button, ProgressBar } from '../ui'
import MatchReport from './MatchReport'

/* ---- Ranked-track view model ------------------------------------- */

type Ranked = {
  /** Convex Id — kept intact for the apply mutation. */
  id: Id<'tracks'>
  track: Track
  overall: number
}

function fitTone(pct: number): 'success' | 'gold' | 'danger' {
  return pct >= 75 ? 'success' : pct >= 55 ? 'gold' : 'danger'
}

// useLayoutEffect on the client (pre-paint, no flash), useEffect on SSR.
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type ApplyState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

export default function MatchExplorer() {
  const candidateDoc = useQuery(api.candidates.current)
  const trackDocs = useQuery(api.tracks.list)
  const myTrackIds = useQuery(api.applications.myTrackIds)
  const mentorship = useQuery(api.enrollments.myMentorship)
  const apply = useMutation(api.applications.apply)

  const [selectedId, setSelectedId] = useState<Id<'tracks'> | null>(null)
  const [applyState, setApplyState] = useState<ApplyState>({ kind: 'idle' })

  const appliedSet = useMemo(() => new Set(myTrackIds ?? []), [myTrackIds])

  const candidate: CandidateProfile | null = useMemo(
    () => (candidateDoc ? toCandidateProfile(candidateDoc) : null),
    [candidateDoc],
  )

  // The candidate's current mentorship track, if any — it anchors the report.
  const mentorshipTrackId = mentorship?.trackId ?? null

  // Map + score every track, then rank DESC by overall match. When the
  // candidate is in a mentorship, that track is pinned to the top — the
  // assessment prioritises the company they're actually mentoring with.
  const ranked = useMemo<Ranked[]>(() => {
    if (!candidate || !trackDocs) return []
    const scored = trackDocs
      .map((doc) => {
        const track = toTrack(doc)
        return {
          id: doc.id as Id<'tracks'>,
          track,
          overall: computeMatch(candidate, track).overall,
        }
      })
      .sort((a, b) => b.overall - a.overall)
    if (!mentorshipTrackId) return scored
    const pinned = scored.filter((r) => (r.id as string) === mentorshipTrackId)
    const rest = scored.filter((r) => (r.id as string) !== mentorshipTrackId)
    return [...pinned, ...rest]
  }, [candidate, trackDocs, mentorshipTrackId])

  // Default selection = the mentorship track if any, else top match; keep the
  // user's pick if still present.
  const selected = useMemo<Ranked | null>(() => {
    if (ranked.length === 0) return null
    if (selectedId) return ranked.find((r) => r.id === selectedId) ?? ranked[0]
    if (mentorshipTrackId) return ranked.find((r) => (r.id as string) === mentorshipTrackId) ?? ranked[0]
    return ranked[0]
  }, [ranked, selectedId, mentorshipTrackId])

  const loading =
    candidateDoc === undefined || trackDocs === undefined || myTrackIds === undefined

  // Ranked list entrance: stagger the items in once tracks first arrive.
  // Scoped to the list container via gsap.context and reverted on cleanup;
  // keyed on `rankedReady` so it runs a single time when data loads.
  const listRef = useRef<HTMLDivElement>(null)
  const rankedReady = ranked.length > 0
  useIso(() => {
    const el = listRef.current
    if (!el) return
    if (prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      gsap.from('.js-rank-item', {
        y: 16,
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.05,
      })
    }, el)

    return () => ctx.revert()
  }, [rankedReady])

  /* ---- Loading ---- */
  if (loading) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Computing your weighted matches…</p>
        </Card>
      </Page>
    )
  }

  /* ---- No profile yet ---- */
  if (candidate === null) {
    return (
      <Page>
        <header className="mb-8">
          <Eyebrow>Career OS · Match Report</Eyebrow>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Your weighted match</h1>
        </header>
        <Card className="px-6 py-16 text-center">
          <p className="text-4xl" aria-hidden="true">
            🦉
          </p>
          <p className="mt-4 text-base font-semibold text-ink">No candidate profile yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            The weighted-matrix report scores you against every track across five factors, starting
            with your work-style archetype. Take the 12 Animals quiz first to build your profile,
            then come back for the in-depth read.
          </p>
        </Card>
      </Page>
    )
  }

  const selectedApplied = selected ? appliedSet.has(selected.id) : false
  const inMentorship = !!mentorshipTrackId
  const selectedIsMentorship = !!selected && (selected.id as string) === mentorshipTrackId

  async function onApply() {
    if (!selected) return
    setApplyState({ kind: 'pending' })
    try {
      await apply({ trackId: selected.id, matchScore: selected.overall })
      setApplyState({ kind: 'success' })
    } catch (err) {
      setApplyState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not submit application.',
      })
    }
  }

  return (
    <Page>
      <header className="mb-8">
        <Eyebrow>Career OS · Match Report</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Your weighted match, in depth
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base text-justify hyphens-auto">
          Every open track scored against <span className="font-semibold text-ink">{candidate.name}</span>{' '}
          with an org-weighted decision matrix, the deep counterpart to your 12 Animals archetype.
        </p>
      </header>

      {ranked.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No open tracks to match against right now.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {/* Ranked list */}
          <div ref={listRef} className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              {ranked.length} tracks ranked by fit
            </p>
            {ranked.map((r) => {
              const active = selected?.id === r.id
              const applied = appliedSet.has(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedId(r.id)
                    setApplyState({ kind: 'idle' })
                  }}
                  className={`js-rank-item w-full border px-4 py-3.5 text-left rounded-[2px] transition-colors duration-150 ${
                    active
                      ? 'border-ink bg-white'
                      : 'border-line bg-white hover:border-ink/50 hover:bg-paper'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{r.track.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-soft">{r.track.org}</p>
                    </div>
                    <span className="shrink-0 text-sm font-black tabular-nums text-ink">
                      {r.overall}%
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <ProgressBar value={r.overall} tone={fitTone(r.overall)} />
                  </div>
                  {(r.id as string) === mentorshipTrackId ? (
                    <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[0.08em] text-gold-ink">
                      ★ Your mentorship
                    </span>
                  ) : applied && (
                    <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[0.08em] text-success-ink">
                      ✓ Applied
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* In-depth report + apply */}
          {selected && (
            <div className="flex flex-col gap-4">
              <MatchReport candidate={candidate} track={selected.track} />

              <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {selectedIsMentorship ? (
                    <>
                      <p className="text-sm font-semibold text-ink">
                        You're mentoring in {selected.track.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        This is your active mentorship — the assessment is anchored here while it runs.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-ink">
                        Apply to {selected.track.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {inMentorship
                          ? 'Finish or leave your current mentorship to apply to another track.'
                          : `Submits your ${selected.overall}% weighted match with the application.`}
                      </p>
                    </>
                  )}
                  {applyState.kind === 'success' && (
                    <p className="mt-1.5 text-xs font-semibold text-success-ink">
                      Application submitted. The org is now on the clock for your interview SLA.
                    </p>
                  )}
                  {applyState.kind === 'error' && (
                    <p className="mt-1.5 text-xs font-semibold text-danger">{applyState.message}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {selectedIsMentorship ? (
                    <Badge tone="gold">★ Your mentorship</Badge>
                  ) : selectedApplied || applyState.kind === 'success' ? (
                    <Badge tone="success">✓ Applied</Badge>
                  ) : inMentorship ? (
                    <Button variant="secondary" disabled>Finish your mentorship to apply</Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => void onApply()}
                      disabled={applyState.kind === 'pending'}
                    >
                      {applyState.kind === 'pending' ? 'Applying…' : 'Apply to this track'}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Page>
  )
}
