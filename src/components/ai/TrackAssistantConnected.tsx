'use client'

import { useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { computeMatch } from '@/src/lib/matching'
import {
  toCandidateProfile,
  toTrack,
  type CandidateDoc,
  type TrackDoc,
} from '@/src/lib/convex-adapters'
import { STUB_EXECUTORS, type ToolExecutors, type ToolResult } from '@/src/lib/ai-tools'
import TrackAssistant from './TrackAssistant'

/* ------------------------------------------------------------------ */
/*  Track Assistant — CONNECTED wrapper                                */
/*                                                                     */
/*  Reads Session B's live Convex data (api.tracks.list +              */
/*  api.candidates.current) and injects REAL, data-backed executors    */
/*  into <TrackAssistant/> via its `executors` prop. search_tracks     */
/*  filters the live tracks; recommend_track runs Session A's weighted  */
/*  decision matrix (computeMatch) against the signed-in candidate.    */
/*  create_track intentionally stays on the STUB executor — Session B  */
/*  has not shipped a `tracks.create` mutation, so we do NOT fabricate  */
/*  persistence.                                                       */
/*                                                                     */
/*  The executors themselves guard against `undefined` (still-loading) */
/*  query data, so this component renders immediately.                 */
/* ------------------------------------------------------------------ */

/* ---- strict arg-narrowing helpers (no `any`) --------------------- */

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

/** Free-text needle from any of the search args the model may emit. */
function searchNeedle(args: Record<string, unknown>): string {
  return (asString(args.skill) || asString(args.keyword) || asString(args.query)).trim()
}

/** Case-insensitive partial match of `needle` against a track's company/org
 *  name OR its title — the two things a user names when asking to apply. */
function trackNameMatches(track: TrackDoc, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (n === '') return false
  return track.title.toLowerCase().includes(n) || track.org.toLowerCase().includes(n)
}

/** Fallback motivation when the model doesn't supply one. Kept above the 40-char
 *  minimum the Marketplace apply form enforces so applications look consistent. */
const DEFAULT_APPLY_NOTE =
  "I'm genuinely excited about this track and ready to commit the time to learn quickly and contribute to the team."

/** Case-insensitive match of `needle` against a track's searchable text. */
function trackMatches(track: TrackDoc, needle: string): boolean {
  const hay = [
    track.title,
    track.org,
    ...(track.domainTags ?? []),
    ...(track.requiredSkills ?? []).map((s) => s.name),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle.toLowerCase())
}

/* ------------------------------------------------------------------ */

export default function TrackAssistantConnected({ className }: { className?: string }) {
  const trackData = useQuery(api.tracks.list) as TrackDoc[] | undefined
  const candidate = useQuery(api.candidates.current) as CandidateDoc | null | undefined
  const myTrackIds = useQuery(api.applications.myTrackIds) as string[] | undefined
  const apply = useMutation(api.applications.apply)

  const executors = useMemo<ToolExecutors>(() => {
    return {
      ...STUB_EXECUTORS,

      // create_track: KEEP the stub — no `tracks.create` mutation exists yet.
      create_track: STUB_EXECUTORS.create_track,

      // search_tracks: filter the LIVE tracks list.
      async search_tracks(args): Promise<ToolResult> {
        if (trackData === undefined) {
          return { ok: false, summary: 'Track data is still loading, try again in a moment.' }
        }
        const needle = searchNeedle(args)
        const matched = needle ? trackData.filter((t) => trackMatches(t, needle)) : trackData
        const scope = needle ? ` matching "${needle}"` : ''
        if (matched.length === 0) {
          return {
            ok: true,
            summary: `No tracks found${scope}.`,
            data: { tracks: [] },
          }
        }
        const compact = matched.map((t) => ({ title: t.title, org: t.org, id: t.id }))
        const list = compact.map((t) => `${t.title} (${t.org})`).join(', ')
        return {
          ok: true,
          summary: `Found ${matched.length} track${matched.length === 1 ? '' : 's'}${scope}: ${list}.`,
          data: compact,
        }
      },

      // recommend_track: rank the LIVE tracks by the weighted decision matrix.
      async recommend_track(args): Promise<ToolResult> {
        if (trackData === undefined || candidate === undefined) {
          return { ok: false, summary: 'Track data is still loading, try again in a moment.' }
        }

        // No candidate profile yet — computeMatch can't run. Fall back to the
        // track's own signals using any interest/animal hints, else point the
        // user at the 12 Animals quiz to unlock a real fit ranking.
        if (candidate === null) {
          const hints = [...asStringArray(args.interests), asString(args.animal)]
            .map((s) => s.trim())
            .filter(Boolean)
          const ranked =
            hints.length > 0
              ? trackData.filter((t) => hints.some((h) => trackMatches(t, h)))
              : []
          if (ranked.length > 0) {
            const compact = ranked
              .slice(0, 3)
              .map((t) => ({ title: t.title, org: t.org, id: t.id }))
            const list = compact.map((t) => `${t.title} at ${t.org}`).join('; ')
            return {
              ok: true,
              summary: `Based on ${hints.join(', ')}, consider: ${list}. Take the 12 Animals quiz to unlock a personalised fit score.`,
              data: compact,
            }
          }
          return {
            ok: true,
            summary:
              'No candidate profile yet, so I can’t compute a personalised fit. Take the 12 Animals quiz and complete your profile to get a real, weighted recommendation.',
            data: { tracks: [] },
          }
        }

        if (trackData.length === 0) {
          return { ok: true, summary: 'There are no open tracks to recommend right now.', data: { tracks: [] } }
        }

        const profile = toCandidateProfile(candidate)
        const ranked = trackData
          .map((doc) => {
            const track = toTrack(doc)
            const match = computeMatch(profile, track)
            // Largest weighted contributor drives the plain-English rationale.
            const topFactor = [...match.factors].sort(
              (a, b) => b.score * b.weight - a.score * a.weight,
            )[0]
            return { doc, track, overall: match.overall, rationale: topFactor?.rationale ?? '' }
          })
          .sort((a, b) => b.overall - a.overall)

        const top = ranked.slice(0, 3)
        const best = top[0]
        const alsoConsider = top
          .slice(1)
          .map((r) => `${r.track.title} at ${r.track.org} (${r.overall}%)`)
          .join(', ')
        const alsoText = alsoConsider ? ` Also consider ${alsoConsider}.` : ''
        const compact = top.map((r) => ({
          title: r.track.title,
          org: r.track.org,
          id: r.doc.id,
          overall: r.overall,
        }))

        return {
          ok: true,
          summary: `Top match: ${best.track.title} at ${best.track.org} (${best.overall}% fit) because ${best.rationale}${alsoText}`,
          data: compact,
        }
      },

      // apply_to_track: REAL — submits an application via the Convex
      // `applications.apply` mutation, gated on a completed candidate profile.
      async apply_to_track(args): Promise<ToolResult> {
        if (trackData === undefined || candidate === undefined || myTrackIds === undefined) {
          return { ok: false, summary: 'Track data is still loading, try again in a moment.' }
        }

        const wanted = asString(args.track).trim()
        if (wanted === '') {
          return {
            ok: false,
            summary:
              'Tell me which track to apply to — a company or track name. Try "find tracks" to see what\'s open.',
          }
        }

        const track = trackData.find((t) => trackNameMatches(t, wanted))
        if (!track) {
          return {
            ok: false,
            summary: `I couldn't find a track matching "${wanted}". Try "find tracks" to see what's open.`,
          }
        }

        // No profile / onboarding not finished — the mutation would reject, so
        // we never call it and guide the user to onboarding instead.
        if (candidate === null || !candidate.profileComplete) {
          return {
            ok: false,
            summary:
              "You'll need to finish your quick profile first (the onboarding quiz). Once that's done I can apply for you.",
          }
        }

        // Already applied — the mutation would return the existing id; short-circuit.
        if (myTrackIds.includes(track.id)) {
          return {
            ok: true,
            summary: `You're already in the applicant pool for ${track.title} at ${track.org}.`,
          }
        }

        const overall = computeMatch(toCandidateProfile(candidate), toTrack(track)).overall
        const note = asString(args.note).trim() || DEFAULT_APPLY_NOTE

        try {
          await apply({
            trackId: track._id,
            matchScore: overall,
            note,
            availability: 'Immediately',
            hoursPerWeek: candidate.availabilityHoursPerWeek,
          })
        } catch {
          return {
            ok: false,
            summary: `I couldn't submit your application to ${track.title} just now. Please try again in a moment.`,
          }
        }

        return {
          ok: true,
          summary: `Applied to ${track.title} at ${track.org}: ${overall}% fit. The team reviews applicants within ${track.slaHours}h.`,
          data: { title: track.title, org: track.org, id: track.id, overall },
        }
      },
    }
  }, [trackData, candidate, myTrackIds, apply])

  return <TrackAssistant executors={executors} className={className} />
}
