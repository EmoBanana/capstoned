import { query } from './_generated/server'

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
