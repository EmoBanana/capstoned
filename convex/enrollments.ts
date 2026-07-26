import { query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { clampScore, deltaSum } from './reliability'

async function resolveCandidate(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx)
  const all = await ctx.db.query('candidates').collect()
  if (userId) {
    const linked = all.find((c) => c.userId === userId)
    if (linked) return linked
  }
  return all.find((c) => c.name === 'John Doe') ?? all[0] ?? null
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
