import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { clampScore, deltaSum } from './reliability'
import { notify } from './notifications'

/** The signed-in user's own candidate profile, or null. No demo fallback. */
async function resolveCandidate(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

async function tasksFor(ctx: QueryCtx, enrollmentId: Id<'enrollments'>) {
  const tasks = await ctx.db
    .query('tasks')
    .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
    .collect()
  return tasks
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ id: t._id as string, title: t.title, status: t.status, dueLabel: t.dueLabel, mentorNote: t.mentorNote }))
}

/** Enrolled mentees for an org's track (recruiter master-detail). */
export const menteesForOrg = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, { orgSlug }) => {
    const track = (await ctx.db.query('tracks').collect()).find((t) => t.orgSlug === orgSlug)
    if (!track) return null

    const enrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_track', (q) => q.eq('trackId', track._id))
      .collect()

    const mentees = await Promise.all(
      enrollments.map(async (e) => {
        const c = await ctx.db.get(e.candidateId)
        return {
          enrollmentId: e._id as string,
          mentorName: e.mentorName,
          name: c?.name ?? '—',
          university: c?.university ?? '',
          program: c?.program ?? '',
          animalKey: c?.animalKey ?? 'owl',
          reliability: clampScore(c?.reliabilityScore ?? 100, await deltaSum(ctx, 'candidate', e.candidateId)),
          status: e.status,
          weekProgress: e.weekProgress,
          totalWeeks: e.totalWeeks,
          fit: e.fit,
          tasks: await tasksFor(ctx, e._id),
        }
      }),
    )

    return { trackTitle: track.title, totalWeeks: track.durationWeeks, mentees }
  },
})

/** Full candidate docs + track doc (tracks.list shape) for the recruiter's
 *  assessment view, so Session A's MatchReport can run on live data. */
export const assessmentData = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, { orgSlug }) => {
    const org = (await ctx.db.query('organizations').collect()).find((o) => o.slug === orgSlug)
    const trackDoc = (await ctx.db.query('tracks').collect()).find((t) => t.orgSlug === orgSlug)
    if (!trackDoc) return null
    const track = { ...trackDoc, id: trackDoc._id as string, reliability: org?.reliability ?? 90, brandColor: org?.brandColor ?? '888888' }
    const enrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_track', (q) => q.eq('trackId', trackDoc._id))
      .collect()
    const mentees = await Promise.all(
      enrollments.map(async (e) => {
        const candidate = await ctx.db.get(e.candidateId)
        return { enrollmentId: e._id as string, name: candidate?.name ?? '—', candidate }
      }),
    )
    return { track, mentees }
  },
})

/** The signed-in student's own mentorship (progress, tasks, mentor feedback). */
export const myMentorship = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await resolveCandidate(ctx)
    if (!candidate) return null
    const enrollment = (
      await ctx.db
        .query('enrollments')
        .withIndex('by_candidate', (q) => q.eq('candidateId', candidate._id))
        .collect()
    )[0]
    if (!enrollment) return null
    const track = await ctx.db.get(enrollment.trackId)
    return {
      trackTitle: track?.title ?? '',
      org: track?.org ?? '',
      mentorName: enrollment.mentorName,
      weekProgress: enrollment.weekProgress,
      totalWeeks: enrollment.totalWeeks,
      hoursCommitted: enrollment.hoursCommitted,
      fit: enrollment.fit,
      status: enrollment.status,
      feedback: enrollment.feedback,
      tasks: await tasksFor(ctx, enrollment._id),
    }
  },
})

/** A mentor leaves real feedback on an enrollment; it appears in the student's
 *  mentorship view. Appends to the enrollment's feedback log. */
export const addFeedback = mutation({
  args: { enrollmentId: v.id('enrollments'), body: v.string() },
  handler: async (ctx, { enrollmentId, body }) => {
    const text = body.trim()
    if (!text) throw new ConvexError('Feedback cannot be empty')
    const enrollment = await ctx.db.get(enrollmentId)
    if (!enrollment) throw new ConvexError('Enrollment not found')

    const userId = await getAuthUserId(ctx)
    const user = userId ? await ctx.db.get(userId) : null
    const author = user?.name || enrollment.mentorName || 'Mentor'
    const when = new Date(Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

    await ctx.db.patch(enrollmentId, {
      feedback: [{ author, role: 'Mentor', when, body: text }, ...enrollment.feedback],
    })

    const candidate = await ctx.db.get(enrollment.candidateId)
    await notify(ctx, candidate?.userId, 'mentorship', `${author} left you new feedback on your mentorship.`, '/student/mentorship')
  },
})

const MENTEE_STATUS = v.union(
  v.literal('ahead'),
  v.literal('on-track'),
  v.literal('needs-support'),
  v.literal('at-risk'),
)

/** Mentor advances the mentorship a week (capped at the track length). */
export const advanceWeek = mutation({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const e = await ctx.db.get(enrollmentId)
    if (!e) throw new ConvexError('Enrollment not found')
    await ctx.db.patch(enrollmentId, { weekProgress: Math.min(e.totalWeeks, e.weekProgress + 1) })
  },
})

/** Mentor logs committed hours against the mentorship. */
export const logHours = mutation({
  args: { enrollmentId: v.id('enrollments'), hours: v.number() },
  handler: async (ctx, { enrollmentId, hours }) => {
    const e = await ctx.db.get(enrollmentId)
    if (!e) throw new ConvexError('Enrollment not found')
    await ctx.db.patch(enrollmentId, { hoursCommitted: Math.max(0, e.hoursCommitted + Math.round(hours)) })
  },
})

/** Mentor sets the mentee's standing. */
export const setStatus = mutation({
  args: { enrollmentId: v.id('enrollments'), status: MENTEE_STATUS },
  handler: async (ctx, { enrollmentId, status }) => {
    await ctx.db.patch(enrollmentId, { status })
  },
})
