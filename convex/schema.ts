import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

// Mirrors src/lib/domain.ts (Session A's foundation). Session B owns this file.
// `tracks` / `candidates` follow domain.Track / domain.CandidateProfile, plus a
// few Session-B extensions the live screens need (orgSlug, slaHours, closesInDays).

const factorWeights = v.object({
  technicalSkills: v.number(),
  interests: v.number(),
  aspirations: v.number(),
  workingStyle: v.number(),
  commitment: v.number(),
})

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal('student'), v.literal('recruiter'))),
  }).index('email', ['email']),

  // Session-B enrichment: brand logo + reliability, keyed by slug.
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    brandColor: v.string(),
    reliability: v.number(),
    verified: v.boolean(),
  }).index('by_slug', ['slug']),

  // domain.Track (+ orgSlug/slaHours/closesInDays/status extensions).
  tracks: defineTable({
    title: v.string(),
    org: v.string(),
    orgSlug: v.string(),
    department: v.string(),
    summary: v.string(),
    objectives: v.array(v.string()),
    deliverables: v.array(v.string()),
    milestones: v.array(
      v.object({ id: v.string(), week: v.number(), title: v.string(), detail: v.string() }),
    ),
    durationWeeks: v.number(),
    intensity: v.union(v.literal('light'), v.literal('moderate'), v.literal('intense')),
    weeklyHours: v.number(),
    cap: v.number(),
    applicants: v.number(),
    requiredSkills: v.array(
      v.object({ name: v.string(), weight: v.number(), targetLevel: v.number() }),
    ),
    domainTags: v.array(v.string()),
    interestTags: v.array(v.string()),
    aspirationTags: v.array(v.string()),
    cultureAnimalAffinity: v.record(v.string(), v.number()),
    factorWeights,
    slaHours: v.number(),
    closesInDays: v.number(),
    status: v.union(
      v.literal('draft'),
      v.literal('open'),
      v.literal('in-progress'),
      v.literal('closed'),
    ),
  }).index('by_status', ['status']),

  // domain.CandidateProfile (+ optional link to the auth user).
  candidates: defineTable({
    userId: v.optional(v.id('users')),
    name: v.string(),
    headline: v.string(),
    university: v.string(),
    program: v.string(),
    skills: v.array(v.object({ name: v.string(), level: v.number() })),
    interests: v.array(v.string()),
    aspirations: v.array(v.string()),
    availabilityHoursPerWeek: v.number(),
    animalKey: v.string(),
    reliabilityScore: v.number(),
  }).index('by_user', ['userId']),

  applications: defineTable({
    trackId: v.id('tracks'),
    candidateId: v.id('candidates'),
    status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined')),
    matchScore: v.number(),
    appliedAt: v.number(),
    slaDueAt: v.number(),
  })
    .index('by_track', ['trackId'])
    .index('by_candidate', ['candidateId']),

  // An accepted candidate actively mentoring in a track.
  enrollments: defineTable({
    trackId: v.id('tracks'),
    candidateId: v.id('candidates'),
    mentorName: v.string(),
    status: v.union(
      v.literal('ahead'),
      v.literal('on-track'),
      v.literal('needs-support'),
      v.literal('at-risk'),
    ),
    weekProgress: v.number(),
    totalWeeks: v.number(),
    hoursCommitted: v.number(),
    fit: v.number(),
    feedback: v.array(
      v.object({ author: v.string(), role: v.string(), when: v.string(), body: v.string() }),
    ),
  })
    .index('by_track', ['trackId'])
    .index('by_candidate', ['candidateId']),

  tasks: defineTable({
    enrollmentId: v.id('enrollments'),
    title: v.string(),
    status: v.union(
      v.literal('todo'),
      v.literal('in-progress'),
      v.literal('submitted'),
      v.literal('done'),
      v.literal('blocked'),
    ),
    dueLabel: v.optional(v.string()),
    mentorNote: v.optional(v.string()),
    order: v.number(),
  }).index('by_enrollment', ['enrollmentId']),

  // Micro-bond: a company sponsors a mentee for a milestone/period in exchange
  // for a short commitment (contract or priority hiring).
  sponsorships: defineTable({
    enrollmentId: v.id('enrollments'),
    candidateId: v.id('candidates'),
    orgName: v.string(),
    title: v.string(),
    type: v.union(v.literal('milestone'), v.literal('period')),
    amount: v.number(),
    commitmentKind: v.union(v.literal('contract'), v.literal('priority-hiring')),
    commitmentMonths: v.number(),
    status: v.union(v.literal('offered'), v.literal('accepted'), v.literal('declined')),
    createdAt: v.number(),
  })
    .index('by_enrollment', ['enrollmentId'])
    .index('by_candidate', ['candidateId']),
})
