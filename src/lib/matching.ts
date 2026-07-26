/* ------------------------------------------------------------------ */
/*  CapStoned — Weighted decision matrix (candidate ↔ track)           */
/*                                                                      */
/*  Pure, deterministic, no React. computeMatch scores a candidate      */
/*  against a track across five factors, each carrying a plain-English  */
/*  rationale for the in-depth UI. The candidate's 12-Animals archetype */
/*  feeds the workingStyle factor via the track's culture affinities.   */
/* ------------------------------------------------------------------ */

import { ANIMALS, traitSimilarity } from './animals'
import { bestMatch, coverage, relatedness } from './concepts'
import {
  type CandidateProfile,
  type FactorKey,
  type FactorWeights,
  type MatchFactor,
  type MatchResult,
  type SkillLevel,
  type Track,
} from './domain'

/* ------------------------------------------------------------------ */
/*  Small pure helpers                                                 */
/* ------------------------------------------------------------------ */

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  technicalSkills: 'Technical Skills',
  interests: 'Interests',
  aspirations: 'Aspirations',
  workingStyle: 'Working Style',
  commitment: 'Commitment',
}

/** Case-insensitive tag equality after trimming. */
function tagEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function findSkill(skills: SkillLevel[], name: string): SkillLevel | undefined {
  return skills.find((s) => tagEq(s.name, name))
}

/** Count how many of `needles` appear in `haystack` (case-insensitive). */
function overlapCount(haystack: string[], needles: string[]): number {
  return needles.reduce(
    (n, needle) => (haystack.some((h) => tagEq(h, needle)) ? n + 1 : n),
    0,
  )
}

/* ------------------------------------------------------------------ */
/*  Individual factor scorers (each returns score + rationale)         */
/* ------------------------------------------------------------------ */

interface Scored {
  score: number
  rationale: string
}

function scoreTechnicalSkills(candidate: CandidateProfile, track: Track): Scored {
  const reqs = track.requiredSkills
  if (reqs.length === 0) {
    return {
      score: 75,
      rationale: 'This track lists no specific required skills, so technical fit is treated as neutral.',
    }
  }

  const totalWeight = reqs.reduce((w, r) => w + r.weight, 0) || 1
  let weightedCoverage = 0
  const matched: string[] = []
  const missing: string[] = []

  for (const req of reqs) {
    const target = req.targetLevel || 100
    // Best coverage across all held skills, weighted by how related each is to
    // the requirement — an exact skill scores 1, a related one partial credit.
    let best = 0
    for (const held of candidate.skills) {
      const rel = relatedness(req.name, held.name)
      if (rel === 0) continue
      best = Math.max(best, rel * clamp(held.level / target, 0, 1))
    }
    weightedCoverage += req.weight * best
    if (best >= 0.6) matched.push(req.name)
    else missing.push(req.name)
  }

  const score = round((weightedCoverage / totalWeight) * 100)

  const parts: string[] = []
  if (matched.length > 0) {
    parts.push(`Strong on ${matched.slice(0, 3).join(', ')}`)
  }
  if (missing.length > 0) {
    parts.push(`room to grow on ${missing.slice(0, 3).join(', ')}`)
  }
  const rationale =
    parts.length > 0
      ? `${parts.join('; ')}. Weighted against ${reqs.length} required skill${reqs.length === 1 ? '' : 's'}.`
      : `Covers the track's ${reqs.length} required skills at the expected level.`

  return { score, rationale }
}

function scoreInterests(candidate: CandidateProfile, track: Track): Scored {
  const tags = track.interestTags.length > 0 ? track.interestTags : track.domainTags
  if (tags.length === 0) {
    return { score: 70, rationale: 'No interest tags to compare against; treated as neutral.' }
  }

  // Compare against interests AND aspirations, using concept relatedness — so a
  // "Frontend Engineer" aspiration credits a track built around prototyping/UI.
  const have = [...candidate.interests, ...candidate.aspirations]
  const score = round(clamp(coverage(tags, have) * 100))
  const related = tags.filter((t) => bestMatch(t, have).r >= 0.5)

  const rationale =
    related.length > 0
      ? `Aligns with ${related.length} of ${tags.length} track interest area${tags.length === 1 ? '' : 's'} — ${related.slice(0, 3).join(', ')} — counting closely related skills and goals, not just exact tags.`
      : `The candidate's interests and goals don't map onto the track's focus on ${tags.slice(0, 3).join(', ')}.`

  return { score, rationale }
}

function scoreAspirations(candidate: CandidateProfile, track: Track): Scored {
  const tags = track.aspirationTags.length > 0 ? track.aspirationTags : track.domainTags
  if (tags.length === 0) {
    return { score: 70, rationale: 'No aspiration signals on this track; treated as neutral.' }
  }

  // Aspirations weighed against the candidate's goals and interests, so related
  // roles/skills (e.g. prototyping ↔ Frontend Engineer) count toward the fit.
  const have = [...candidate.aspirations, ...candidate.interests]
  const score = round(clamp(coverage(tags, have) * 100))
  const related = tags.filter((t) => bestMatch(t, have).r >= 0.5)

  const rationale =
    related.length > 0
      ? `The track advances ${related.length} of the candidate's directions — ${related.slice(0, 3).join(', ')} — including closely related roles and skills.`
      : `The track doesn't clearly map to the candidate's stated aspirations. Its focus is ${tags.slice(0, 3).join(', ')}.`

  return { score, rationale }
}

function scoreWorkingStyle(candidate: CandidateProfile, track: Track): Scored {
  const affinities = track.cultureAnimalAffinity
  const entries = Object.entries(affinities) as [keyof typeof affinities, number][]
  const candidateAnimal = ANIMALS[candidate.animalKey]

  if (entries.length === 0) {
    return {
      score: 65,
      rationale: `${candidateAnimal.emoji} ${candidateAnimal.name}: the track hasn't declared a cultural leaning, so working style is treated as neutral.`,
    }
  }

  // Direct affinity for the candidate's exact archetype, if the track named it.
  const direct = affinities[candidate.animalKey]

  // Trait-based affinity: how similar the candidate's archetype is to the
  // animals the culture leans toward, weighted by each affinity.
  let weightedSimilarity = 0
  let weightTotal = 0
  for (const [animalKey, affinity] of entries) {
    const similarity = traitSimilarity(candidateAnimal.traits, ANIMALS[animalKey].traits)
    weightedSimilarity += similarity * affinity
    weightTotal += affinity
  }
  const traitScore = weightTotal > 0 ? weightedSimilarity / weightTotal : 65

  const score =
    direct !== undefined ? round(0.6 * direct + 0.4 * traitScore) : round(traitScore)

  const rationale =
    direct !== undefined
      ? `${candidateAnimal.emoji} ${candidateAnimal.name} maps directly onto the track's culture with ${direct}% affinity, reinforced by trait alignment.`
      : `${candidateAnimal.emoji} ${candidateAnimal.name} isn't the track's named archetype, but its traits align ${round(traitScore)}% with the culture's preferred styles.`

  return { score: clamp(score), rationale }
}

function scoreCommitment(candidate: CandidateProfile, track: Track): Scored {
  const need = track.weeklyHours || 1
  const ratio = candidate.availabilityHoursPerWeek / need
  const availabilityScore = clamp(ratio, 0, 1) * 100
  // Blend raw availability with the candidate's proven reliability.
  const score = round(0.6 * availabilityScore + 0.4 * candidate.reliabilityScore)

  let capacity: string
  if (ratio >= 1) capacity = `has the ${track.weeklyHours} hrs/wk this track needs`
  else capacity = `is short of the ${track.weeklyHours} hrs/wk this track needs, with only ${candidate.availabilityHoursPerWeek} available`

  const rationale = `Candidate ${capacity}; reliability of ${candidate.reliabilityScore}% factors into commitment confidence over the ${track.durationWeeks}-week track.`

  return { score: clamp(score), rationale }
}

/* ------------------------------------------------------------------ */
/*  Weight normalization                                              */
/* ------------------------------------------------------------------ */

function normalizeWeights(weights: FactorWeights): FactorWeights {
  const total =
    weights.technicalSkills +
    weights.interests +
    weights.aspirations +
    weights.workingStyle +
    weights.commitment
  if (total <= 0) {
    // Degenerate config — fall back to an even split.
    const even = 1 / 5
    return {
      technicalSkills: even,
      interests: even,
      aspirations: even,
      workingStyle: even,
      commitment: even,
    }
  }
  return {
    technicalSkills: weights.technicalSkills / total,
    interests: weights.interests / total,
    aspirations: weights.aspirations / total,
    workingStyle: weights.workingStyle / total,
    commitment: weights.commitment / total,
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Compute the weighted match between a candidate and a track.
 * Deterministic and pure. Returns all five factors (each with its
 * normalized weight and a rationale) plus the overall percentage.
 */
export function computeMatch(candidate: CandidateProfile, track: Track): MatchResult {
  const weights = normalizeWeights(track.factorWeights)

  const scored: Record<FactorKey, Scored> = {
    technicalSkills: scoreTechnicalSkills(candidate, track),
    interests: scoreInterests(candidate, track),
    aspirations: scoreAspirations(candidate, track),
    workingStyle: scoreWorkingStyle(candidate, track),
    commitment: scoreCommitment(candidate, track),
  }

  const order: FactorKey[] = [
    'technicalSkills',
    'interests',
    'aspirations',
    'workingStyle',
    'commitment',
  ]

  const factors: MatchFactor[] = order.map((key) => ({
    key,
    label: FACTOR_LABELS[key],
    score: clamp(scored[key].score),
    weight: weights[key],
    rationale: scored[key].rationale,
  }))

  const overall = round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  )

  return {
    candidateId: candidate.id,
    trackId: track.id,
    overall: clamp(overall),
    factors,
  }
}
