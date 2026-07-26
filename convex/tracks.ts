import { query } from './_generated/server'

/** Open tracks in the full domain.Track shape, enriched with the org's
 *  brand colour + reliability (Session-B lookup by slug). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query('tracks')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect()
    const orgs = await ctx.db.query('organizations').collect()
    const bySlug = new Map(orgs.map((o) => [o.slug, o]))

    return tracks.map((t) => {
      const org = bySlug.get(t.orgSlug)
      return {
        ...t,
        id: t._id as string,
        reliability: org?.reliability ?? 90,
        brandColor: org?.brandColor ?? '888888',
      }
    })
  },
})
