/* ------------------------------------------------------------------ */
/*  CapStoned — shared domain types (Career OS foundation layer)        */
/*                                                                      */
/*  Pure TypeScript. No React, no side effects. Every type here is      */
/*  consumed by later phases (screens, dashboards, matching, mock data).*/
/*                                                                      */
/*  Two systems this file must support:                                 */
/*    1. 12 Animals — a fast, qualitative work-style archetype.         */
/*    2. Weighted decision matrix — a deep, quantitative candidate↔track*/
/*       match. The candidate's animal FEEDS the workingStyle factor.   */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  Roles — the three Career OS audiences                              */
/* ================================================================== */

/**
 * Canonical Career OS role. The unified platform serves three audiences.
 * Replaces the earlier two-role model ('student' | 'recruiter').
 */
export type Role = 'candidate' | 'employer' | 'university'

/**
 * The original two-role vocabulary still baked into existing routes
 * (`/student/*`, `/recruiter/*`) and the Convex `users.role` field.
 * Kept for backward compatibility so foundation changes don't break
 * live screens. Map to/from {@link Role} with the helpers below.
 */
export type LegacyRole = 'student' | 'recruiter'

export const ROLES: readonly Role[] = ['candidate', 'employer', 'university']

/** student → candidate, recruiter → employer. */
export function fromLegacyRole(role: LegacyRole): Role {
  return role === 'student' ? 'candidate' : 'employer'
}

/**
 * candidate → student, employer → recruiter, university → null.
 * `university` has no legacy route yet, so it maps to `null` by design.
 */
export function toLegacyRole(role: Role): LegacyRole | null {
  switch (role) {
    case 'candidate':
      return 'student'
    case 'employer':
      return 'recruiter'
    case 'university':
      return null
  }
}

/* ================================================================== */
/*  System 1 — The 12 Animals (work-style archetypes)                 */
/* ================================================================== */

export type AnimalKey =
  | 'owl'
  | 'eagle'
  | 'fox'
  | 'wolf'
  | 'dolphin'
  | 'beaver'
  | 'bee'
  | 'peacock'
  | 'tortoise'
  | 'octopus'
  | 'ant'
  | 'lion'

export const ANIMAL_KEYS: readonly AnimalKey[] = [
  'owl',
  'eagle',
  'fox',
  'wolf',
  'dolphin',
  'beaver',
  'bee',
  'peacock',
  'tortoise',
  'octopus',
  'ant',
  'lion',
]

/** The six trait axes a short quiz scores, each 0..100. */
export type TraitKey =
  | 'analytical'
  | 'creative'
  | 'independent'
  | 'collaborative'
  | 'structured'
  | 'adaptive'

export const TRAIT_KEYS: readonly TraitKey[] = [
  'analytical',
  'creative',
  'independent',
  'collaborative',
  'structured',
  'adaptive',
]

/** A full trait vector; every axis 0..100. */
export type AnimalTraits = Record<TraitKey, number>

export interface Animal {
  key: AnimalKey
  emoji: string
  /** Archetype name, e.g. "The Analyst". */
  name: string
  /** One-line archetype tagline. */
  tagline: string
  /** 1–2 sentence description. */
  description: string
  /** Track-types / tags this archetype thrives in. */
  suitedTags: string[]
  /** Trait scores used to compute the nearest animal from quiz answers. */
  traits: AnimalTraits
}

/* ---- Quiz ---- */

export interface QuizOption {
  id: string
  label: string
  /**
   * Trait contribution of choosing this option. Partial — an option
   * usually pushes only a couple of axes. Accumulated across answers,
   * then compared to each animal's trait vector.
   */
  traitWeights: Partial<AnimalTraits>
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: QuizOption[]
}

/** The chosen options, one per answered question. */
export type QuizAnswers = readonly QuizOption[]

/* ================================================================== */
/*  Candidate                                                          */
/* ================================================================== */

/** A skill the candidate holds, with self-rated proficiency 0..100. */
export interface SkillLevel {
  name: string
  level: number
}

export interface CandidateProfile {
  id: string
  name: string
  /** Short professional headline, e.g. "Penultimate CS student". */
  headline: string
  university: string
  program: string
  skills: SkillLevel[]
  interests: string[]
  aspirations: string[]
  /** Hours per week the candidate can commit. */
  availabilityHoursPerWeek: number
  /** The candidate's 12-Animals archetype. Feeds the workingStyle factor. */
  animalKey: AnimalKey
  /** Public accountability signal, 0..100. */
  reliabilityScore: number
}

/* ================================================================== */
/*  Track                                                              */
/* ================================================================== */

export type TrackIntensity = 'light' | 'moderate' | 'intense'

export interface Milestone {
  id: string
  /** Week within the track this milestone lands. */
  week: number
  title: string
  detail: string
}

/** A skill a track expects, with its relative importance and target level. */
export interface SkillRequirement {
  name: string
  /** Relative importance within the technical-skills factor, 0..1. */
  weight: number
  /** Proficiency (0..100) considered a full match for this skill. */
  targetLevel: number
}

/**
 * Org-configurable weights for the five decision-matrix factors.
 * Defaults sum to 1.0 but consumers should normalize defensively.
 */
export interface FactorWeights {
  technicalSkills: number
  interests: number
  aspirations: number
  workingStyle: number
  commitment: number
}

export const DEFAULT_FACTOR_WEIGHTS: FactorWeights = {
  technicalSkills: 0.3,
  interests: 0.2,
  aspirations: 0.15,
  workingStyle: 0.25,
  commitment: 0.1,
}

export interface Track {
  id: string
  title: string
  /** Hosting organisation, e.g. "Talentbank". */
  org: string
  department: string
  summary: string
  objectives: string[]
  deliverables: string[]
  milestones: Milestone[]
  durationWeeks: number
  intensity: TrackIntensity
  weeklyHours: number
  /** Maximum cohort size for this track. */
  cap: number
  /** Current applicant count (for live dashboards). */
  applicants: number
  requiredSkills: SkillRequirement[]
  domainTags: string[]
  /** Interest tags matched against a candidate's interests. */
  interestTags: string[]
  /** Aspiration tags matched against a candidate's aspirations. */
  aspirationTags: string[]
  /**
   * The track's cultural leaning expressed as affinity (0..100) for
   * each animal archetype. Feeds the workingStyle match factor together
   * with the candidate's animalKey. Sparse — only the animals the
   * culture leans toward need entries.
   */
  cultureAnimalAffinity: Partial<Record<AnimalKey, number>>
  /** Org-configured factor weights for this track. */
  factorWeights: FactorWeights
}

/* ================================================================== */
/*  System 2 — Weighted decision matrix (match result)                */
/* ================================================================== */

/** The five factor keys — identical to the {@link FactorWeights} keys. */
export type FactorKey = keyof FactorWeights

export interface MatchFactor {
  key: FactorKey
  /** Human label for the in-depth UI, e.g. "Technical Skills". */
  label: string
  /** Sub-score 0..100. */
  score: number
  /** Normalized weight applied to this factor, 0..1. */
  weight: number
  /** Plain-English explanation for the in-depth UI. */
  rationale: string
}

export interface MatchResult {
  candidateId: string
  trackId: string
  /** Overall weighted match, 0..100 (a percentage). */
  overall: number
  factors: MatchFactor[]
}

/* ================================================================== */
/*  University audience                                                */
/* ================================================================== */

/** How a student's current track engagement is trending. */
export type EngagementStatus = 'on-track' | 'needs-nudge' | 'at-risk'

export interface StudentEngagement {
  candidateId: string
  name: string
  /** Track the student is currently exploring, if any. */
  trackId: string | null
  trackTitle: string | null
  org: string | null
  status: EngagementStatus
  /** Completion of the current track, 0..100. */
  progressPct: number
  weeksElapsed: number
  weeksTotal: number
  /** Human-readable last-activity marker, e.g. "2 days ago". */
  lastActivity: string
  reliabilityScore: number
  animalKey: AnimalKey
}

export interface Cohort {
  id: string
  /** e.g. "Computer Science '26". */
  name: string
  university: string
  program: string
  intakeYear: number
  studentCount: number
  /** Students currently in an active track. */
  placedCount: number
  engagements: StudentEngagement[]
}

/**
 * "Mismatch averted" — the university's headline outcome metric: students
 * who discovered a poor long-term fit through a low-stakes track BEFORE
 * committing to it.
 */
export interface MismatchAverted {
  /** Count of students who redirected away from a wrong-fit path. */
  averted: number
  /** Total track explorations run across the cohort(s). */
  totalExplorations: number
  /** averted / totalExplorations as a percentage, 0..100. */
  rate: number
  /** Estimated student-hours saved versus a full wrong-fit commitment. */
  estimatedHoursSaved: number
  narrative: string
}

/**
 * A dense grid for the university interest / aspiration heatmap.
 * `values[r][c]` is the intensity (0..100) of `rows[r]` against `cols[c]`.
 */
export interface InterestHeatmap {
  /** Axis label for the rows, e.g. "Interest". */
  rowLabel: string
  /** Axis label for the columns, e.g. "Domain". */
  colLabel: string
  rows: string[]
  cols: string[]
  /** Row-major intensity grid; `values.length === rows.length`. */
  values: number[][]
}
