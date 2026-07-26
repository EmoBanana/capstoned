/* ------------------------------------------------------------------ */
/*  CapStoned — Convex ↔ domain adapters                               */
/*                                                                      */
/*  Pure, typed mappers (no React). They bridge Session B's Convex doc  */
/*  shapes onto Session A's domain types so `computeMatch` can run on   */
/*  live data. Defensive: tolerate missing optional arrays.            */
/* ------------------------------------------------------------------ */

import type { Doc } from '@/convex/_generated/dataModel'
import type { AnimalKey, CandidateProfile, Track } from './domain'

/* ---- Input doc shapes (exported for callers) --------------------- */

/** `api.candidates.current` returns a raw candidates doc (or null). */
export type CandidateDoc = Doc<'candidates'>

/**
 * `api.tracks.list` returns the full tracks doc plus a string `id` and the
 * org enrichment (`reliability`, `brandColor`).
 */
export type TrackDoc = Doc<'tracks'> & {
  id: string
  reliability: number
  brandColor: string
}

/* ---- Mappers ----------------------------------------------------- */

/** Map a Convex candidate doc onto the domain `CandidateProfile`. */
export function toCandidateProfile(doc: CandidateDoc): CandidateProfile {
  return {
    id: doc._id,
    name: doc.name,
    headline: doc.headline,
    university: doc.university,
    program: doc.program,
    skills: doc.skills ?? [],
    interests: doc.interests ?? [],
    aspirations: doc.aspirations ?? [],
    availabilityHoursPerWeek: doc.availabilityHoursPerWeek,
    animalKey: doc.animalKey as AnimalKey,
    reliabilityScore: doc.reliabilityScore,
  }
}

/**
 * Map a Convex track doc (from `tracks.list`) onto the domain `Track`.
 * The doc already carries a string `id`; only the fields `domain.Track`
 * declares are passed through. `cultureAnimalAffinity` is a
 * `Record<string, number>` on the wire and is narrowed here.
 */
export function toTrack(doc: TrackDoc): Track {
  return {
    id: doc.id,
    title: doc.title,
    org: doc.org,
    department: doc.department,
    summary: doc.summary,
    objectives: doc.objectives ?? [],
    deliverables: doc.deliverables ?? [],
    milestones: doc.milestones ?? [],
    durationWeeks: doc.durationWeeks,
    intensity: doc.intensity,
    weeklyHours: doc.weeklyHours,
    cap: doc.cap,
    applicants: doc.applicants,
    requiredSkills: doc.requiredSkills ?? [],
    domainTags: doc.domainTags ?? [],
    interestTags: doc.interestTags ?? [],
    aspirationTags: doc.aspirationTags ?? [],
    cultureAnimalAffinity: (doc.cultureAnimalAffinity ??
      {}) as Partial<Record<AnimalKey, number>>,
    factorWeights: doc.factorWeights,
  }
}
