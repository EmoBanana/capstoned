import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import { recordEvent } from './reliability'

const STATUS = v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined'))

/** The candidate acting: the signed-in user's profile, else the demo persona. */
async function resolveCandidate(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx)
  const all = await ctx.db.query('candidates').collect()
  if (userId) {
    const linked = all.find((c) => c.userId === userId)
    if (linked) return linked
  }
  return all.find((c) => c.name === 'John Doe') ?? all[0] ?? null
}

/** Student applies to a track. matchScore is the client-computed weighted fit. */
export const apply = mutation({
  args: { trackId: v.id('tracks'), matchScore: v.number() },
  handler: async (ctx, { trackId, matchScore }) => {
    const candidate = await resolveCandidate(ctx)
    if (!candidate) throw new Error('No candidate profile')
    const track = await ctx.db.get(trackId)
    if (!track) throw new Error('Track not found')

    const existing = (
      await ctx.db
        .query('applications')
        .withIndex('by_track', (q) => q.eq('trackId', trackId))
        .collect()
    ).find((a) => a.candidateId === candidate._id)
    if (existing) return existing._id

    const now = Date.now()
    return await ctx.db.insert('applications', {
      trackId,
      candidateId: candidate._id,
      status: 'pending',
      matchScore: Math.round(matchScore),
      appliedAt: now,
      slaDueAt: now + track.slaHours * 3600 * 1000,
    })
  },
})

/** Track ids the current candidate has already applied to (for the marketplace). */
export const myTrackIds = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await resolveCandidate(ctx)
    if (!candidate) return [] as string[]
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_candidate', (q) => q.eq('candidateId', candidate._id))
      .collect()
    return apps.map((a) => a.trackId as string)
  },
})

/** The current student's applications, with track + status (My Applications). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await resolveCandidate(ctx)
    if (!candidate) return []
    const apps = await ctx.db
      .query('applications')
      .withIndex('by_candidate', (q) => q.eq('candidateId', candidate._id))
      .collect()
    return Promise.all(
      apps.map(async (a) => {
        const track = await ctx.db.get(a.trackId)
        return {
          id: a._id as string,
          status: a.status,
          matchScore: a.matchScore,
          appliedAt: a.appliedAt,
          slaDueAt: a.slaDueAt,
          trackTitle: track?.title ?? '—',
          org: track?.org ?? '',
          orgSlug: track?.orgSlug ?? '',
        }
      }),
    )
  },
})

/** The review queue for an org's track: track summary + its applicants. */
export const forOrg = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, { orgSlug }) => {
    const track = (await ctx.db.query('tracks').collect()).find((t) => t.orgSlug === orgSlug)
    if (!track) return null

    const apps = await ctx.db
      .query('applications')
      .withIndex('by_track', (q) => q.eq('trackId', track._id))
      .collect()

    const applicants = await Promise.all(
      apps.map(async (a) => {
        const c = await ctx.db.get(a.candidateId)
        return {
          id: a._id as string,
          status: a.status,
          matchScore: a.matchScore,
          appliedAt: a.appliedAt,
          slaDueAt: a.slaDueAt,
          name: c?.name ?? '—',
          university: c?.university ?? '',
          program: c?.program ?? '',
          animalKey: c?.animalKey ?? 'owl',
          reliability: c?.reliabilityScore ?? 0,
        }
      }),
    )

    return { trackTitle: track.title, cap: track.cap, slaHours: track.slaHours, applicants }
  },
})

export const setStatus = mutation({
  args: { applicationId: v.id('applications'), status: STATUS },
  handler: async (ctx, { applicationId, status }) => {
    const app = await ctx.db.get(applicationId)
    await ctx.db.patch(applicationId, { status })
    if (status === 'accepted' && app) {
      const track = await ctx.db.get(app.trackId)
      const org = track ? (await ctx.db.query('organizations').collect()).find((o) => o.slug === track.orgSlug) : null
      if (org) {
        const onTime = Date.now() <= app.slaDueAt
        await recordEvent(
          ctx,
          'organization',
          org._id,
          onTime ? 1 : -8,
          onTime ? 'Interviewed an applicant within SLA' : 'Missed the interview SLA',
        )
      }
    }
  },
})
