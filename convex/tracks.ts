import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { myOrg } from './organizations'

const FW = { technicalSkills: 0.3, interests: 0.2, aspirations: 0.15, workingStyle: 0.25, commitment: 0.1 }

/** Open tracks in the full domain.Track shape, enriched with the org's
 *  brand colour + reliability, and a LIVE applicant count (seeded baseline +
 *  real application rows) so applying actually moves the number. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query('tracks')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect()
    const orgs = await ctx.db.query('organizations').collect()
    const bySlug = new Map(orgs.map((o) => [o.slug, o]))

    return Promise.all(
      tracks.map(async (t) => {
        const org = bySlug.get(t.orgSlug)
        const liveApps = await ctx.db
          .query('applications')
          .withIndex('by_track', (q) => q.eq('trackId', t._id))
          .collect()
        return {
          ...t,
          id: t._id as string,
          applicants: t.applicants + liveApps.length,
          reliability: org?.reliability ?? 90,
          brandColor: org?.brandColor ?? '888888',
        }
      }),
    )
  },
})

const skill = v.object({ name: v.string(), weight: v.number(), targetLevel: v.number() })

/** The signed-in recruiter publishes a real track under their own company. */
export const create = mutation({
  args: {
    title: v.string(),
    department: v.string(),
    summary: v.string(),
    intensity: v.union(v.literal('light'), v.literal('moderate'), v.literal('intense')),
    durationWeeks: v.number(),
    weeklyHours: v.number(),
    cap: v.number(),
    slaHours: v.number(),
    deliverables: v.array(v.string()),
    requiredSkills: v.array(skill),
  },
  handler: async (ctx, a) => {
    const org = await myOrg(ctx)
    if (!org) throw new Error('Create your company profile first')

    const spacing = Math.max(1, Math.floor(a.durationWeeks / Math.max(a.deliverables.length, 1)))
    const milestones = a.deliverables.map((d, i) => ({
      id: `m${i + 1}`,
      week: Math.min(a.durationWeeks, (i + 1) * spacing),
      title: d,
      detail: d,
    }))

    return await ctx.db.insert('tracks', {
      title: a.title,
      org: org.name,
      orgSlug: org.slug,
      department: a.department,
      summary: a.summary,
      objectives: a.deliverables,
      deliverables: a.deliverables,
      milestones,
      durationWeeks: a.durationWeeks,
      intensity: a.intensity,
      weeklyHours: a.weeklyHours,
      cap: a.cap,
      applicants: 0,
      requiredSkills: a.requiredSkills,
      domainTags: a.department ? [a.department.split('·')[0].trim()] : [],
      interestTags: a.requiredSkills.map((s) => s.name),
      aspirationTags: [],
      cultureAnimalAffinity: {},
      factorWeights: FW,
      slaHours: a.slaHours,
      closesInDays: 14,
      status: 'open',
    })
  },
})

/** The recruiter's own company + its tracks with real counts (dashboard). */
export const forOrgManage = query({
  args: {},
  handler: async (ctx) => {
    const org = await myOrg(ctx)
    if (!org) return null

    const allTracks = await ctx.db.query('tracks').collect()
    const tracks = allTracks.filter((t) => t.orgSlug === org.slug)

    const programs = await Promise.all(
      tracks.map(async (t) => {
        const apps = await ctx.db
          .query('applications')
          .withIndex('by_track', (q) => q.eq('trackId', t._id))
          .collect()
        const enrollments = await ctx.db
          .query('enrollments')
          .withIndex('by_track', (q) => q.eq('trackId', t._id))
          .collect()
        const avgFit =
          enrollments.length > 0
            ? Math.round(enrollments.reduce((s, e) => s + e.fit, 0) / enrollments.length)
            : null
        return {
          id: t._id as string,
          title: t.title,
          status: t.status,
          intensity: t.intensity,
          durationWeeks: t.durationWeeks,
          weeklyHours: t.weeklyHours,
          cap: t.cap,
          applicants: t.applicants + apps.length,
          enrolled: enrollments.length,
          avgFit,
        }
      }),
    )

    return {
      org: { name: org.name, slug: org.slug, reliability: org.reliability },
      programs,
    }
  },
})
