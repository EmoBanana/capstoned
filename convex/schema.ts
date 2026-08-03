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

  // Session-B enrichment: brand logo + reliability, keyed by slug. A company is
  // owned by the recruiter who registered it (ownerUserId); seeded orgs are
  // unowned until a recruiter claims one during company onboarding.
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    brandColor: v.string(),
    reliability: v.number(),
    verified: v.boolean(),
    ownerUserId: v.optional(v.id('users')),
    department: v.optional(v.string()),
    about: v.optional(v.string()),
    logoStorageId: v.optional(v.id('_storage')),
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerUserId']),

  // A company can be represented by many mentors — each recruiter account is a
  // member of exactly one organization (their own mentor profile, shared company).
  orgMembers: defineTable({
    orgId: v.id('organizations'),
    userId: v.id('users'),
  })
    .index('by_user', ['userId'])
    .index('by_org', ['orgId']),

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
    // AI evaluation checkpoints (label + weight, summing to 100) mentees are
    // assessed against. Optional so pre-existing tracks stay valid.
    scoringCheckpoints: v.optional(v.array(v.object({ label: v.string(), weight: v.number() }))),
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
    // False/unset until the student finishes onboarding; gates matching + apply.
    profileComplete: v.optional(v.boolean()),
    // Contact + an optional attached resume (pdf/docx in Convex file storage).
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    resumeStorageId: v.optional(v.id('_storage')),
    resumeName: v.optional(v.string()),
  }).index('by_user', ['userId']),

  applications: defineTable({
    trackId: v.id('tracks'),
    candidateId: v.id('candidates'),
    status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined')),
    matchScore: v.number(),
    appliedAt: v.number(),
    slaDueAt: v.number(),
    // Captured on the real application form.
    note: v.optional(v.string()),
    availability: v.optional(v.string()),
    hoursPerWeek: v.optional(v.number()),
    // Interview scheduling — a real two-way negotiation once accepted.
    interviewAt: v.optional(v.number()),
    interviewProposedBy: v.optional(v.union(v.literal('company'), v.literal('candidate'))),
    interviewStatus: v.optional(v.union(v.literal('proposed'), v.literal('confirmed'))),
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
    // Lifecycle of the mentorship. Absent is treated as 'active' for rows seeded
    // before this field existed. A candidate may hold only one active enrollment
    // at a time; completing or withdrawing frees them to apply elsewhere.
    phase: v.optional(
      v.union(v.literal('active'), v.literal('completed'), v.literal('withdrawn')),
    ),
    endedAt: v.optional(v.number()),
  })
    .index('by_track', ['trackId'])
    .index('by_candidate', ['candidateId']),

  tasks: defineTable({
    enrollmentId: v.id('enrollments'),
    title: v.string(),
    // The task's own brief (what to do). Distinct from mentorNote, which is the
    // mentor's feedback comment on the task. The two are kept separate.
    description: v.optional(v.string()),
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
    status: v.union(
      v.literal('offered'),
      v.literal('signed'),
      v.literal('accepted'), // legacy accepted (pre-signature); treated as signed
      v.literal('declined'),
    ),
    createdAt: v.number(),
    // Executed-contract record, set when the student virtually signs.
    contractNo: v.optional(v.string()),
    signedName: v.optional(v.string()),
    signedAt: v.optional(v.number()),
  })
    .index('by_enrollment', ['enrollmentId'])
    .index('by_candidate', ['candidateId']),

  // Append-only log; reliability scores are derived from a base + these deltas.
  reliabilityEvents: defineTable({
    subjectKind: v.union(v.literal('candidate'), v.literal('organization')),
    subjectId: v.string(),
    delta: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  }).index('by_subject', ['subjectKind', 'subjectId']),

  // Per-user event feed surfaced by the header notification bell.
  notifications: defineTable({
    userId: v.id('users'),
    kind: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // Direct chat thread between a company mentor and a mentee, scoped to their
  // enrollment. Either party sends; the other is notified.
  messages: defineTable({
    enrollmentId: v.id('enrollments'),
    senderUserId: v.id('users'),
    senderRole: v.union(v.literal('mentor'), v.literal('mentee')),
    senderName: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index('by_enrollment', ['enrollmentId']),

  // A scheduled meeting between mentor and mentee. One party proposes a time,
  // the other confirms — mirroring the interview propose/confirm handshake.
  meetings: defineTable({
    enrollmentId: v.id('enrollments'),
    at: v.number(),
    note: v.optional(v.string()),
    proposedByRole: v.union(v.literal('mentor'), v.literal('mentee')),
    status: v.union(v.literal('proposed'), v.literal('confirmed'), v.literal('cancelled')),
    createdAt: v.number(),
  }).index('by_enrollment', ['enrollmentId']),
})
