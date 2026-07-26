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
import {
  assistantRoleFromUserRole,
  type AssistantRole,
  type ToolExecutors,
  type ToolResult,
} from '@/src/lib/ai-tools'
import TrackAssistant from './TrackAssistant'

/* ------------------------------------------------------------------ */
/*  Track Assistant — CONNECTED wrapper                                */
/*                                                                     */
/*  Reads Session B's live Convex data (api.tracks.list +              */
/*  api.candidates.current) and injects REAL, data-backed executors    */
/*  into <TrackAssistant/> via its `executors` prop, ROLE-SCOPED to the */
/*  signed-in user. A Candidate gets search_tracks, recommend_track,    */
/*  and apply_to_track; a Company gets create_track and search_tracks.  */
/*  create_track publishes a real track via the Convex `tracks.create`  */
/*  mutation. Any tool outside the persona is wired to a refusing       */
/*  executor, so a cross-role action is refused, never executed.        */
/*                                                                     */
/*  The executors themselves guard against `undefined` still-loading    */
/*  query data, so this component renders immediately. While the role   */
/*  is loading it defaults to the read-only Candidate set.              */
/* ------------------------------------------------------------------ */

/* ---- strict arg-narrowing helpers (no `any`) --------------------- */

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

type Intensity = 'light' | 'moderate' | 'intense'

/** Coerce the model's free-text intensity to the mutation's literal union. */
function asIntensity(value: unknown): Intensity {
  const v = asString(value).trim().toLowerCase()
  if (v === 'light' || v === 'intense') return v
  return 'moderate'
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

export default function TrackAssistantConnected({
  className,
  embedded = false,
}: {
  className?: string
  /** When embedded in the floating panel the panel supplies its own header,
   *  so the internal one is hidden to avoid a doubled header. */
  embedded?: boolean
}) {
  const trackData = useQuery(api.tracks.list) as TrackDoc[] | undefined
  const candidate = useQuery(api.candidates.current) as CandidateDoc | null | undefined
  const myTrackIds = useQuery(api.applications.myTrackIds) as string[] | undefined
  const user = useQuery(api.users.currentUser)
  const apply = useMutation(api.applications.apply)
  const createTrack = useMutation(api.tracks.create)

  // Loading / signed-out defaults to the read-only Candidate persona, never
  // the Company set, so Company tools are only ever exposed to a recruiter.
  const role: AssistantRole = assistantRoleFromUserRole(user?.role)

  const executors = useMemo<ToolExecutors>(() => {
    // Defense in depth: a tool the persona may NOT use gets a refusing
    // executor, so even if the model emits a disallowed action it is refused,
    // never executed.
    const refuseForCandidate = async (): Promise<ToolResult> => ({
      ok: false,
      summary: 'That is a Company action and is not available on a Candidate account.',
    })
    const refuseForCompany = async (): Promise<ToolResult> => ({
      ok: false,
      summary: 'That is a Candidate action and is not available on a Company account.',
    })

    // create_track: REAL — publishes a track via the Convex `tracks.create`
    // mutation under the recruiter's own company. Company personas only.
    const createTrackExec = async (args: Record<string, unknown>): Promise<ToolResult> => {
      const title = asString(args.title).trim() || 'Untitled Track'
      const skills = asStringArray(args.skills)
      const durationWeeks = asNumber(args.durationWeeks, 6)
      const weeklyHours = asNumber(args.weeklyHours, 8)
      const intensity = asIntensity(args.intensity)
      const summary = asString(args.description).trim()
      const requiredSkills = skills.map((name) => ({ name, weight: 1, targetLevel: 3 }))
      try {
        await createTrack({
          title,
          department: '',
          summary: summary || `A ${durationWeeks}-week ${intensity} track.`,
          intensity,
          durationWeeks,
          weeklyHours,
          cap: 10,
          slaHours: 48,
          deliverables: [],
          requiredSkills,
        })
      } catch {
        return {
          ok: false,
          summary:
            'I could not publish that track. Set up your company profile first, then try again.',
        }
      }
      const skillText = skills.length > 0 ? ` requiring ${skills.join(', ')}` : ''
      return {
        ok: true,
        summary: `Published "${title}": ${durationWeeks} weeks, ${weeklyHours} h/week, ${intensity}${skillText}.`,
        data: { title, skills, durationWeeks, weeklyHours, intensity, status: 'open' },
      }
    }

    // search_tracks: filter the LIVE tracks list. Shared by both personas —
    // it only reads public open tracks.
    const searchTracksExec = async (args: Record<string, unknown>): Promise<ToolResult> => {
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
        const list = compact.map((t) => `${t.title} at ${t.org}`).join(', ')
        return {
          ok: true,
          summary: `Found ${matched.length} track${matched.length === 1 ? '' : 's'}${scope}: ${list}.`,
          data: compact,
        }
    }

    // recommend_track: rank the LIVE tracks by the weighted decision matrix.
    const recommendTrackExec = async (args: Record<string, unknown>): Promise<ToolResult> => {
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
          .map((r) => `${r.track.title} at ${r.track.org} scoring ${r.overall}%`)
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
          summary: `Top match: ${best.track.title} at ${best.track.org}, a ${best.overall}% fit, because ${best.rationale}${alsoText}`,
          data: compact,
        }
    }

    // apply_to_track: REAL — submits an application via the Convex
    // `applications.apply` mutation, gated on a completed candidate profile.
    const applyToTrackExec = async (args: Record<string, unknown>): Promise<ToolResult> => {
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
              "You'll need to finish your quick profile first, the onboarding quiz. Once that's done I can apply for you.",
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
    }

    // Assemble ONLY this persona's allowed executors. Disallowed tools get a
    // refusing executor so a cross-role action is refused, never run.
    if (role === 'company') {
      return {
        create_track: createTrackExec,
        search_tracks: searchTracksExec,
        recommend_track: refuseForCompany,
        apply_to_track: refuseForCompany,
      }
    }
    return {
      search_tracks: searchTracksExec,
      recommend_track: recommendTrackExec,
      apply_to_track: applyToTrackExec,
      create_track: refuseForCandidate,
    }
  }, [trackData, candidate, myTrackIds, apply, createTrack, role])

  return (
    <TrackAssistant
      executors={executors}
      className={className}
      role={role}
      showHeader={!embedded}
    />
  )
}
