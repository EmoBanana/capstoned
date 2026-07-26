import { internalMutation } from './_generated/server'

type Intensity = 'Part-time' | 'Full-time'

const ORGS: {
  name: string
  slug: string
  brandColor: string
  reliability: number
}[] = [
  { name: 'Talentbank', slug: 'talentbank', brandColor: 'D81439', reliability: 98 },
  { name: 'Grab', slug: 'grab', brandColor: '00B14F', reliability: 97 },
  { name: 'Shopee', slug: 'shopee', brandColor: 'EE4D2D', reliability: 95 },
  { name: 'Google', slug: 'google', brandColor: '4285F4', reliability: 99 },
  { name: 'Intel', slug: 'intel', brandColor: '0071C5', reliability: 98 },
  { name: 'Stripe', slug: 'stripe', brandColor: '635BFF', reliability: 98 },
  { name: 'Atlassian', slug: 'atlassian', brandColor: '0052CC', reliability: 96 },
  { name: 'NVIDIA', slug: 'nvidia', brandColor: '76B900', reliability: 99 },
  { name: 'Airbnb', slug: 'airbnb', brandColor: 'FF5A5F', reliability: 96 },
  { name: 'Spotify', slug: 'spotify', brandColor: '1ED760', reliability: 97 },
]

const TRACKS: {
  org: string
  title: string
  intensity: Intensity
  durationWeeks: number
  weeklyHours: number
  skills: string[]
  applicants: number
  cap: number
  slaHours: number
  closesInDays: number
  fitScore: number
}[] = [
  { org: 'talentbank', title: 'Frontend Architecture Mentorship', intensity: 'Part-time', durationWeeks: 12, weeklyHours: 10, skills: ['React', 'TypeScript', 'Design Systems'], applicants: 50, cap: 50, slaHours: 48, closesInDays: 3, fitScore: 91 },
  { org: 'grab', title: 'Mobility Frontend Mentorship', intensity: 'Part-time', durationWeeks: 12, weeklyHours: 10, skills: ['React', 'TypeScript', 'Maps SDK'], applicants: 47, cap: 50, slaHours: 48, closesInDays: 4, fitScore: 89 },
  { org: 'shopee', title: 'Backend & Payments Track', intensity: 'Full-time', durationWeeks: 6, weeklyHours: 40, skills: ['Go', 'PostgreSQL', 'gRPC'], applicants: 38, cap: 45, slaHours: 48, closesInDays: 5, fitScore: 84 },
  { org: 'google', title: 'Applied Machine Learning Sprint', intensity: 'Full-time', durationWeeks: 4, weeklyHours: 40, skills: ['Python', 'TensorFlow', 'MLOps'], applicants: 44, cap: 48, slaHours: 24, closesInDays: 4, fitScore: 86 },
  { org: 'intel', title: 'Embedded Systems Mentorship', intensity: 'Part-time', durationWeeks: 10, weeklyHours: 8, skills: ['C++', 'RTOS', 'Firmware'], applicants: 30, cap: 40, slaHours: 72, closesInDays: 6, fitScore: 80 },
  { org: 'stripe', title: 'Payments Reliability Track', intensity: 'Part-time', durationWeeks: 12, weeklyHours: 8, skills: ['TypeScript', 'Node.js', 'Distributed Systems'], applicants: 33, cap: 40, slaHours: 24, closesInDays: 6, fitScore: 88 },
  { org: 'atlassian', title: 'Developer Platform Mentorship', intensity: 'Part-time', durationWeeks: 12, weeklyHours: 10, skills: ['Java', 'React', 'REST APIs'], applicants: 19, cap: 45, slaHours: 72, closesInDays: 8, fitScore: 74 },
  { org: 'nvidia', title: 'GPU Computing & AI Sprint', intensity: 'Full-time', durationWeeks: 6, weeklyHours: 40, skills: ['CUDA', 'PyTorch', 'C++'], applicants: 41, cap: 48, slaHours: 48, closesInDays: 4, fitScore: 86 },
  { org: 'airbnb', title: 'Product Design Foundations', intensity: 'Part-time', durationWeeks: 10, weeklyHours: 8, skills: ['Figma', 'UX Research', 'Prototyping'], applicants: 22, cap: 30, slaHours: 72, closesInDays: 9, fitScore: 78 },
  { org: 'spotify', title: 'Growth Data Science Track', intensity: 'Part-time', durationWeeks: 10, weeklyHours: 6, skills: ['SQL', 'Experimentation', 'Python'], applicants: 28, cap: 30, slaHours: 24, closesInDays: 2, fitScore: 88 },
]

function commitmentLine(intensity: Intensity, weeklyHours: number, durationWeeks: number): string {
  return intensity === 'Full-time'
    ? `Full-time · ${durationWeeks} weeks`
    : `${weeklyHours} hrs/week · ${durationWeeks} weeks`
}

/** Idempotent-ish reseed: clears orgs + tracks, then inserts the demo data. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const t of await ctx.db.query('tracks').collect()) await ctx.db.delete(t._id)
    for (const o of await ctx.db.query('organizations').collect()) await ctx.db.delete(o._id)

    const orgId: Record<string, import('./_generated/dataModel').Id<'organizations'>> = {}
    for (const o of ORGS) {
      orgId[o.slug] = await ctx.db.insert('organizations', { ...o, verified: true })
    }

    for (const t of TRACKS) {
      const { org, ...rest } = t
      await ctx.db.insert('tracks', {
        orgId: orgId[org],
        ...rest,
        commitmentLine: commitmentLine(t.intensity, t.weeklyHours, t.durationWeeks),
        status: 'open',
      })
    }

    return `Seeded ${ORGS.length} organizations and ${TRACKS.length} tracks.`
  },
})
