import { query } from './_generated/server'

/** Open marketplace tracks, joined with their organization's brand + reliability. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query('tracks')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect()

    return Promise.all(
      tracks.map(async (t) => {
        const org = await ctx.db.get(t.orgId)
        return {
          id: t._id as string,
          title: t.title,
          intensity: t.intensity,
          commitmentLine: t.commitmentLine,
          skills: t.skills,
          applicants: t.applicants,
          cap: t.cap,
          slaHours: t.slaHours,
          closesInDays: t.closesInDays,
          fitScore: t.fitScore,
          company: org?.name ?? 'Unknown',
          slug: org?.slug ?? '',
          reliability: org?.reliability ?? 0,
        }
      }),
    )
  },
})
