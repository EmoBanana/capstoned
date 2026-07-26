import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { recordEvent } from './reliability'

const STATUS = v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined'))

/** The signed-in user's own candidate profile, or null. No demo fallback. */
async function myCandidate(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

/** Student applies to a track. matchScore is the client-computed weighted fit. */
export const apply = mutation({
  args: {
    trackId: v.id('tracks'),
    matchScore: v.number(),
    note: v.optional(v.string()),
    availability: v.optional(v.string()),
    hoursPerWeek: v.optional(v.number()),
  },
  handler: async (ctx, { trackId, matchScore, note, availability, hoursPerWeek }) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) throw new ConvexError('Complete your profile before applying')
    if (!candidate.profileComplete) throw new ConvexError('Finish onboarding before applying')
    const track = await ctx.db.get(trackId)
    if (!track) throw new ConvexError('Track not found')

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
      note: (note ?? '').trim(),
      availability: availability ?? '',
      hoursPerWeek: hoursPerWeek ?? 0,
    })
  },
})

/** Track ids the current candidate has already applied to (for the marketplace). */
export const myTrackIds = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await myCandidate(ctx)
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
    const candidate = await myCandidate(ctx)
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
          note: a.note ?? '',
          availability: a.availability ?? '',
          hoursPerWeek: a.hoursPerWeek ?? 0,
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
          note: a.note ?? '',
          availability: a.availability ?? '',
          hoursPerWeek: a.hoursPerWeek ?? 0,
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

/** Starter tasks drawn from the track's milestone plan, created on acceptance. */
async function seedEnrollmentTasks(
  ctx: MutationCtx,
  enrollmentId: import('./_generated/dataModel').Id<'enrollments'>,
  milestones: { title: string; detail: string }[],
) {
  let order = 0
  for (const m of milestones.slice(0, 4)) {
    await ctx.db.insert('tasks', {
      enrollmentId,
      title: m.title,
      status: 'todo',
      mentorNote: m.detail,
      order: order++,
    })
  }
}

export const setStatus = mutation({
  args: { applicationId: v.id('applications'), status: STATUS },
  handler: async (ctx, { applicationId, status }) => {
    const app = await ctx.db.get(applicationId)
    if (!app) return

    if (status !== 'accepted') {
      await ctx.db.patch(applicationId, { status })
      return
    }

    const track = await ctx.db.get(app.trackId)

    // Enforce the seat cap: an already-enrolled applicant (re-accept) is fine,
    // but a NEW acceptance past the cap is rejected before anything changes.
    const trackEnrollments = track
      ? await ctx.db.query('enrollments').withIndex('by_track', (q) => q.eq('trackId', track._id)).collect()
      : []
    const already = trackEnrollments.find((e) => e.candidateId === app.candidateId)
    if (track && !already && trackEnrollments.length >= track.cap) {
      throw new ConvexError(`This track is at its seat cap of ${track.cap}. Close or expand it before accepting more.`)
    }

    await ctx.db.patch(applicationId, { status })

    // Reliability: interviewing within SLA is a positive signal for the org.
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

    // Accepting creates a REAL enrollment (unless one already exists) so the
    // mentee + mentorship flow is driven by actual recruiter action, not seed.
    if (already || !track) return

    const recruiterId = await getAuthUserId(ctx)
    const recruiter = recruiterId ? await ctx.db.get(recruiterId) : null
    const enrollmentId = await ctx.db.insert('enrollments', {
      trackId: app.trackId,
      candidateId: app.candidateId,
      mentorName: recruiter?.name || `${track.org} Mentor`,
      status: 'on-track',
      weekProgress: 0,
      totalWeeks: track.durationWeeks,
      hoursCommitted: 0,
      fit: app.matchScore,
      feedback: [],
    })
    await seedEnrollmentTasks(ctx, enrollmentId, track.milestones)
  },
})
