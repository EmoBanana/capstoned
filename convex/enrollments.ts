import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { clampScore, deltaSum, reliabilityDisplay, recordEvent } from './reliability'
import { notify } from './notifications'
import { myOrg } from './organizations'

/** The signed-in user's own candidate profile, or null. No demo fallback. */
async function resolveCandidate(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

/** The organization (and its owner) running an enrollment's track. */
async function orgForEnrollment(ctx: QueryCtx | MutationCtx, enrollment: Doc<'enrollments'>) {
  const track = await ctx.db.get(enrollment.trackId)
  const org = track
    ? await ctx.db.query('organizations').withIndex('by_slug', (q) => q.eq('slug', track.orgSlug)).first()
    : null
  return { track, org }
}

/**
 * Which party the signed-in user is for an enrollment — the company mentor
 * (the org owner) or the enrolled candidate. Gates chat, meetings, and
 * lifecycle actions so neither side can act on someone else's mentorship.
 */
export async function enrollmentParty(ctx: QueryCtx | MutationCtx, enrollmentId: Id<'enrollments'>) {
  const enrollment = await ctx.db.get(enrollmentId)
  if (!enrollment) return { enrollment: null, org: null, candidate: null, party: null as 'mentor' | 'mentee' | null }
  const { org } = await orgForEnrollment(ctx, enrollment)
  const candidate = await ctx.db.get(enrollment.candidateId)
  const userId = await getAuthUserId(ctx)
  let party: 'mentor' | 'mentee' | null = null
  if (userId) {
    // A mentor is any recruiter who represents the enrollment's org — resolved
    // via membership (many mentors per company) or legacy sole ownership.
    const callerOrg = await myOrg(ctx)
    if (org && callerOrg && callerOrg._id === org._id) party = 'mentor'
    else if (candidate?.userId && candidate.userId === userId) party = 'mentee'
  }
  return { enrollment, org, candidate, party }
}

/** A candidate's current active mentorship (phase 'active' or unset), if any.
 *  Absent phase counts as active so rows seeded before the field still gate. */
export async function activeEnrollmentFor(ctx: QueryCtx | MutationCtx, candidateId: Id<'candidates'>) {
  const rows = await ctx.db
    .query('enrollments')
    .withIndex('by_candidate', (q) => q.eq('candidateId', candidateId))
    .collect()
  return (
    rows
      .filter((e) => (e.phase ?? 'active') === 'active')
      .sort((a, b) => b._creationTime - a._creationTime)[0] ?? null
  )
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

    const allEnrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_track', (q) => q.eq('trackId', track._id))
      .collect()

    // A candidate holds one active mentorship at a time. Drop any active row
    // here that's been superseded by a newer active mentorship on another
    // track, so a stale enrollment never lists them as our mentee. Finished
    // (non-active) rows stay as this track's historical record.
    const enrollments = []
    for (const e of allEnrollments) {
      if ((e.phase ?? 'active') === 'active') {
        const current = await activeEnrollmentFor(ctx, e.candidateId)
        if (current && (current._id as string) !== (e._id as string)) continue
      }
      enrollments.push(e)
    }

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
          reliabilityDisplay: await reliabilityDisplay(ctx, 'candidate', e.candidateId, c?.reliabilityScore ?? 100, false),
          status: e.status,
          phase: e.phase ?? 'active',
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

/**
 * The signed-in student's own ACTIVE mentorship (progress, tasks, mentor
 * feedback). A candidate can hold only one active enrollment, so this returns
 * that one — the most recent active row — rather than whichever happened to be
 * created first. Org identity (name, slug, logo) comes from the organization
 * record so the page shows the real company, not a stale seeded one.
 */
export const myMentorship = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await resolveCandidate(ctx)
    if (!candidate) return null
    const enrollment = await activeEnrollmentFor(ctx, candidate._id)
    if (!enrollment) return null
    const track = await ctx.db.get(enrollment.trackId)
    const { org } = await orgForEnrollment(ctx, enrollment)
    const logoUrl = org?.logoStorageId ? await ctx.storage.getUrl(org.logoStorageId) : null
    return {
      enrollmentId: enrollment._id as string,
      trackId: enrollment.trackId as string,
      trackTitle: track?.title ?? '',
      org: org?.name ?? track?.org ?? '',
      orgSlug: org?.slug ?? track?.orgSlug ?? '',
      logoUrl,
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

/** Candidate ends their own active mentorship early. Frees them to apply
 *  elsewhere; withdrawing before completion is a modest reliability signal. */
export const withdraw = mutation({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const { enrollment, org, candidate, party } = await enrollmentParty(ctx, enrollmentId)
    if (!enrollment) throw new ConvexError('Enrollment not found')
    if (party !== 'mentee') throw new ConvexError('Only the mentee can leave their own mentorship')
    if ((enrollment.phase ?? 'active') !== 'active') return
    await ctx.db.patch(enrollmentId, { phase: 'withdrawn', endedAt: Date.now() })
    await recordEvent(ctx, 'candidate', enrollment.candidateId, -6, 'Withdrew from a mentorship early')
    const track = await ctx.db.get(enrollment.trackId)
    await notify(ctx, org?.ownerUserId, 'mentorship', `${candidate?.name ?? 'A mentee'} left ${track?.title ?? 'their mentorship'}.`, '/recruiter/mentees')
  },
})

/** Marks a mentorship complete. Either party may close it out; completing is a
 *  strong positive reliability signal for the candidate. */
export const complete = mutation({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const { enrollment, org, candidate, party } = await enrollmentParty(ctx, enrollmentId)
    if (!enrollment) throw new ConvexError('Enrollment not found')
    if (!party) throw new ConvexError('Not allowed')
    if ((enrollment.phase ?? 'active') !== 'active') return
    await ctx.db.patch(enrollmentId, { phase: 'completed', endedAt: Date.now() })
    await recordEvent(ctx, 'candidate', enrollment.candidateId, 10, 'Completed a mentorship')
    const track = await ctx.db.get(enrollment.trackId)
    if (party === 'mentor') {
      await notify(ctx, candidate?.userId, 'mentorship', `Your mentorship on ${track?.title ?? 'your track'} was marked complete. Well done.`, '/student/mentorship')
    } else {
      await notify(ctx, org?.ownerUserId, 'mentorship', `${candidate?.name ?? 'A mentee'} marked ${track?.title ?? 'their mentorship'} complete.`, '/recruiter/mentees')
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
