import { internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'

/* Session B owns this data. The app is REAL: only orgs + tracks + a small pool
   of standalone applicants on the recruiter's own track are seeded so the demo
   has something to browse and review. Everything else — profiles, enrollments,
   mentorship, micro-bonds — is created by real user action, never seeded, and
   is NEVER attributed to a freshly-registered account. */

const FW = {
  technicalSkills: 0.3,
  interests: 0.2,
  aspirations: 0.15,
  workingStyle: 0.25,
  commitment: 0.1,
}

const ORGS = [
  { name: 'Talentbank', slug: 'talentbank', brandColor: 'D81439', reliability: 98 },
  { name: 'Grab', slug: 'grab', brandColor: '00B14F', reliability: 97 },
  { name: 'Google', slug: 'google', brandColor: '4285F4', reliability: 99 },
  { name: 'Stripe', slug: 'stripe', brandColor: '635BFF', reliability: 98 },
  { name: 'Shopee', slug: 'shopee', brandColor: 'EE4D2D', reliability: 95 },
  { name: 'NVIDIA', slug: 'nvidia', brandColor: '76B900', reliability: 99 },
  { name: 'Airbnb', slug: 'airbnb', brandColor: 'FF5A5F', reliability: 96 },
  { name: 'Atlassian', slug: 'atlassian', brandColor: '0052CC', reliability: 96 },
]

const rs = (name: string, weight: number, targetLevel: number) => ({ name, weight, targetLevel })
const ms = (week: number, title: string, detail: string) => ({ id: `m${week}`, week, title, detail })

type SeedTrack = {
  title: string; org: string; orgSlug: string; department: string; summary: string
  objectives: string[]; deliverables: string[]
  milestones: { id: string; week: number; title: string; detail: string }[]
  durationWeeks: number; intensity: 'light' | 'moderate' | 'intense'; weeklyHours: number
  cap: number; applicants: number
  requiredSkills: { name: string; weight: number; targetLevel: number }[]
  domainTags: string[]; interestTags: string[]; aspirationTags: string[]
  cultureAnimalAffinity: Record<string, number>
  factorWeights: { technicalSkills: number; interests: number; aspirations: number; workingStyle: number; commitment: number }
  slaHours: number; closesInDays: number
}

// `applicants` is a baseline pool of prior applicants; tracks.list adds the LIVE
// count of real application rows on top, so applying visibly moves the number.
const TRACKS: SeedTrack[] = [
  {
    title: 'Frontend Architecture Mentorship', org: 'Talentbank', orgSlug: 'talentbank', department: 'Engineering · Web Platform',
    summary: 'Build production UI alongside platform engineers — components, testing, and release workflows.',
    objectives: ['Ship a reusable component to the design system', 'Own a feature end-to-end'],
    deliverables: ['A merged design-system component', 'A shipped, tested feature'],
    milestones: [ms(2, 'First reviewed PR', 'Merge a small component'), ms(4, 'Reusable hook', 'Extract shared data-fetching'), ms(8, 'Feature demo', 'Present an owned feature'), ms(12, 'Release', 'Ship to production')],
    durationWeeks: 12, intensity: 'moderate', weeklyHours: 10, cap: 50, applicants: 12,
    requiredSkills: [rs('React', 0.5, 85), rs('TypeScript', 0.3, 80), rs('Design Systems', 0.2, 75)],
    domainTags: ['Frontend', 'Web'], interestTags: ['UI Engineering', 'Design Systems'], aspirationTags: ['Frontend Engineer', 'Product Engineer'],
    cultureAnimalAffinity: { owl: 80, beaver: 70, peacock: 60 }, factorWeights: FW, slaHours: 48, closesInDays: 3,
  },
  {
    title: 'Mobility Frontend Mentorship', org: 'Grab', orgSlug: 'grab', department: 'Engineering · Consumer',
    summary: 'Work on consumer-scale mobility surfaces with our frontend guild.',
    objectives: ['Improve a high-traffic screen', 'Add maps interactions'],
    deliverables: ['A shipped screen improvement', 'A maps feature prototype'],
    milestones: [ms(3, 'Onboarding PR', 'Land a first change'), ms(9, 'Maps feature', 'Ship a maps interaction')],
    durationWeeks: 12, intensity: 'moderate', weeklyHours: 10, cap: 50, applicants: 28,
    requiredSkills: [rs('React', 0.5, 85), rs('TypeScript', 0.3, 80), rs('Maps SDK', 0.2, 70)],
    domainTags: ['Frontend', 'Mobility'], interestTags: ['UI Engineering', 'Maps'], aspirationTags: ['Frontend Engineer', 'Mobile Engineer'],
    cultureAnimalAffinity: { owl: 70, fox: 65, dolphin: 60 }, factorWeights: FW, slaHours: 48, closesInDays: 4,
  },
  {
    title: 'Applied Machine Learning Sprint', org: 'Google', orgSlug: 'google', department: 'Research · AI',
    summary: 'An intensive sprint training and shipping an applied ML model.',
    objectives: ['Train a baseline model', 'Deploy an inference endpoint'],
    deliverables: ['A trained model', 'A deployed endpoint'],
    milestones: [ms(1, 'Baseline', 'Reproduce a baseline'), ms(3, 'Deploy', 'Ship inference')],
    durationWeeks: 4, intensity: 'intense', weeklyHours: 40, cap: 48, applicants: 30,
    requiredSkills: [rs('Python', 0.4, 85), rs('TensorFlow', 0.35, 80), rs('MLOps', 0.25, 70)],
    domainTags: ['AI', 'ML'], interestTags: ['Machine Learning', 'Research'], aspirationTags: ['ML Engineer', 'Researcher'],
    cultureAnimalAffinity: { owl: 85, octopus: 70, eagle: 60 }, factorWeights: FW, slaHours: 24, closesInDays: 4,
  },
  {
    title: 'Payments Reliability Track', org: 'Stripe', orgSlug: 'stripe', department: 'Engineering · Infrastructure',
    summary: 'Harden payment systems for reliability and correctness.',
    objectives: ['Add observability to a service', 'Fix a reliability gap'],
    deliverables: ['Dashboards for a service', 'A reliability fix in production'],
    milestones: [ms(2, 'Instrument', 'Add metrics'), ms(10, 'Harden', 'Close a reliability gap')],
    durationWeeks: 12, intensity: 'moderate', weeklyHours: 8, cap: 40, applicants: 22,
    requiredSkills: [rs('TypeScript', 0.4, 85), rs('Node.js', 0.35, 80), rs('Distributed Systems', 0.25, 75)],
    domainTags: ['Backend', 'Payments'], interestTags: ['Systems', 'Reliability'], aspirationTags: ['Backend Engineer', 'Platform Engineer'],
    cultureAnimalAffinity: { beaver: 80, ant: 70, tortoise: 65 }, factorWeights: FW, slaHours: 24, closesInDays: 6,
  },
  {
    title: 'Backend & Payments Track', org: 'Shopee', orgSlug: 'shopee', department: 'Engineering · Commerce',
    summary: 'Build scalable commerce backends handling real transaction volume.',
    objectives: ['Design a service API', 'Optimize a hot path'],
    deliverables: ['A service API', 'A measured performance win'],
    milestones: [ms(1, 'API design', 'Draft the API'), ms(5, 'Optimize', 'Ship a perf win')],
    durationWeeks: 6, intensity: 'intense', weeklyHours: 40, cap: 45, applicants: 25,
    requiredSkills: [rs('Go', 0.4, 80), rs('PostgreSQL', 0.3, 80), rs('gRPC', 0.3, 70)],
    domainTags: ['Backend', 'Commerce'], interestTags: ['Systems', 'Scalability'], aspirationTags: ['Backend Engineer', 'SRE'],
    cultureAnimalAffinity: { ant: 80, beaver: 70, wolf: 60 }, factorWeights: FW, slaHours: 48, closesInDays: 5,
  },
  {
    title: 'GPU Computing & AI Sprint', org: 'NVIDIA', orgSlug: 'nvidia', department: 'Research · Accelerated Computing',
    summary: 'Accelerate ML workloads on GPUs and profile performance.',
    objectives: ['Port a kernel to CUDA', 'Profile and speed up training'],
    deliverables: ['A CUDA kernel', 'A profiling report + speedup'],
    milestones: [ms(2, 'Kernel', 'Port to CUDA'), ms(5, 'Speedup', 'Measured improvement')],
    durationWeeks: 6, intensity: 'intense', weeklyHours: 40, cap: 48, applicants: 27,
    requiredSkills: [rs('CUDA', 0.4, 80), rs('PyTorch', 0.35, 80), rs('C++', 0.25, 75)],
    domainTags: ['AI', 'HPC'], interestTags: ['Machine Learning', 'Performance'], aspirationTags: ['ML Engineer', 'Systems Engineer'],
    cultureAnimalAffinity: { owl: 80, octopus: 75, eagle: 65 }, factorWeights: FW, slaHours: 48, closesInDays: 4,
  },
  {
    title: 'Product Design Foundations', org: 'Airbnb', orgSlug: 'airbnb', department: 'Design · Product',
    summary: 'Learn product design fundamentals through real user research and prototyping.',
    objectives: ['Run a research study', 'Prototype a flow'],
    deliverables: ['A research summary', 'A clickable prototype'],
    milestones: [ms(2, 'Research', 'Interview users'), ms(8, 'Prototype', 'Ship a prototype')],
    durationWeeks: 10, intensity: 'light', weeklyHours: 8, cap: 30, applicants: 14,
    requiredSkills: [rs('Figma', 0.4, 75), rs('UX Research', 0.35, 70), rs('Prototyping', 0.25, 70)],
    domainTags: ['Design', 'Product'], interestTags: ['Design', 'User Research'], aspirationTags: ['Product Designer', 'UX Researcher'],
    cultureAnimalAffinity: { peacock: 85, dolphin: 70, fox: 60 }, factorWeights: FW, slaHours: 72, closesInDays: 9,
  },
  {
    title: 'Developer Platform Mentorship', org: 'Atlassian', orgSlug: 'atlassian', department: 'Engineering · Platform',
    summary: 'Build developer-facing platform APIs and tooling.',
    objectives: ['Design a public API', 'Ship a developer tool'],
    deliverables: ['A documented API', 'A developer CLI/tool'],
    milestones: [ms(3, 'API', 'Design + review'), ms(10, 'Tool', 'Ship tooling')],
    durationWeeks: 12, intensity: 'moderate', weeklyHours: 10, cap: 45, applicants: 11,
    requiredSkills: [rs('Java', 0.4, 80), rs('React', 0.3, 75), rs('REST APIs', 0.3, 75)],
    domainTags: ['Backend', 'Platform'], interestTags: ['APIs', 'Developer Tools'], aspirationTags: ['Platform Engineer', 'Backend Engineer'],
    cultureAnimalAffinity: { beaver: 75, owl: 65, ant: 60 }, factorWeights: FW, slaHours: 72, closesInDays: 8,
  },
]

const sk = (name: string, level: number) => ({ name, level })

// Standalone applicants on the Talentbank track — NOT linked to any account, so
// no registered user ever inherits them. They populate the recruiter's review
// queue for the demo; the recruiter accepts them to create real enrollments.
type SeedApplicant = {
  name: string; headline: string; university: string; program: string
  skills: { name: string; level: number }[]
  interests: string[]; aspirations: string[]
  availabilityHoursPerWeek: number; animalKey: string; reliabilityScore: number
  matchScore: number; hoursAgo: number
  note: string; availability: string; hoursPerWeek: number
}

const APPLICANTS: SeedApplicant[] = [
  {
    name: 'Nadia Iskandar', headline: 'Final-year CS student, frontend-focused', university: 'Sunway University', program: 'Computer Science',
    skills: [sk('React', 88), sk('TypeScript', 84), sk('Design Systems', 74), sk('Node.js', 66)],
    interests: ['UI Engineering', 'Design Systems'], aspirations: ['Frontend Engineer', 'Product Engineer'],
    availabilityHoursPerWeek: 12, animalKey: 'owl', reliabilityScore: 96,
    matchScore: 88, hoursAgo: 30,
    note: 'I have shipped two production React apps and maintain a small component library. I want to learn how a platform team designs for reuse and release discipline at scale.',
    availability: 'Within 2 weeks', hoursPerWeek: 12,
  },
  {
    name: 'Priya Nair', headline: 'Design-minded builder', university: 'Monash University Malaysia', program: 'Human-Computer Interaction',
    skills: [sk('Figma', 82), sk('React', 62), sk('Prototyping', 74), sk('UX Research', 70)],
    interests: ['Design', 'UI Engineering'], aspirations: ['Product Engineer', 'Product Designer'],
    availabilityHoursPerWeek: 10, animalKey: 'peacock', reliabilityScore: 94,
    matchScore: 66, hoursAgo: 18,
    note: 'Coming from a design background, I code my own prototypes in React and want to close the gap toward production-grade frontend engineering.',
    availability: 'Immediately', hoursPerWeek: 10,
  },
  {
    name: 'Marcus Tan', headline: 'Backend systems enthusiast', university: "Taylor's University", program: 'Software Engineering',
    skills: [sk('Go', 74), sk('PostgreSQL', 76), sk('Node.js', 80), sk('React', 52)],
    interests: ['Systems', 'Reliability'], aspirations: ['Backend Engineer', 'Platform Engineer'],
    availabilityHoursPerWeek: 16, animalKey: 'beaver', reliabilityScore: 90,
    matchScore: 54, hoursAgo: 6,
    note: 'My strength is backend, but I want to become a well-rounded product engineer. I am ready to put in the reps on the frontend side under strong mentorship.',
    availability: 'Within a month', hoursPerWeek: 14,
  },
]

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Full reset — clears any prior demo state, including real accounts' data.
    for (const r of await ctx.db.query('reliabilityEvents').collect()) await ctx.db.delete(r._id)
    for (const s of await ctx.db.query('sponsorships').collect()) await ctx.db.delete(s._id)
    for (const t of await ctx.db.query('tasks').collect()) await ctx.db.delete(t._id)
    for (const e of await ctx.db.query('enrollments').collect()) await ctx.db.delete(e._id)
    for (const a of await ctx.db.query('applications').collect()) await ctx.db.delete(a._id)
    for (const t of await ctx.db.query('tracks').collect()) await ctx.db.delete(t._id)
    for (const o of await ctx.db.query('organizations').collect()) await ctx.db.delete(o._id)
    // Only remove seeded standalone candidates (no userId); keep real accounts' profiles.
    for (const c of await ctx.db.query('candidates').collect()) {
      if (!c.userId) await ctx.db.delete(c._id)
    }

    for (const o of ORGS) await ctx.db.insert('organizations', { ...o, verified: true })

    const trackIdBySlug: Record<string, Id<'tracks'>> = {}
    for (const t of TRACKS) trackIdBySlug[t.orgSlug] = await ctx.db.insert('tracks', { ...t, status: 'open' })

    const tbTrack = TRACKS.find((t) => t.orgSlug === 'talentbank')!
    const tbTrackId = trackIdBySlug['talentbank']
    const now = Date.now()

    for (const a of APPLICANTS) {
      const candidateId = await ctx.db.insert('candidates', {
        name: a.name, headline: a.headline, university: a.university, program: a.program,
        skills: a.skills, interests: a.interests, aspirations: a.aspirations,
        availabilityHoursPerWeek: a.availabilityHoursPerWeek, animalKey: a.animalKey,
        reliabilityScore: a.reliabilityScore, profileComplete: true,
      })
      const appliedAt = now - a.hoursAgo * 3600 * 1000
      await ctx.db.insert('applications', {
        trackId: tbTrackId,
        candidateId,
        status: 'pending',
        matchScore: a.matchScore,
        appliedAt,
        slaDueAt: appliedAt + tbTrack.slaHours * 3600 * 1000,
        note: a.note,
        availability: a.availability,
        hoursPerWeek: a.hoursPerWeek,
      })
    }

    return `Seeded ${ORGS.length} orgs, ${TRACKS.length} tracks, ${APPLICANTS.length} standalone Talentbank applicants. No enrollments/mentorship/sponsorships — those come from real recruiter action.`
  },
})
