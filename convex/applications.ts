import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { recordEvent, reliabilityDisplay } from './reliability'
import { notify } from './notifications'
import { myOrg } from './organizations'

const STATUS = v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined'))

const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** The organization row for a track (by slug). */
async function orgForTrack(ctx: MutationCtx, track: Doc<'tracks'>) {
  return (await ctx.db.query('organizations').collect()).find((o) => o.slug === track.orgSlug) ?? null
}

/** Which party the caller is for an application: the owning company, the
 *  applying candidate, or neither. Used to gate interview actions. */
async function resolveParty(ctx: MutationCtx, app: Doc<'applications'>): Promise<'company' | 'candidate' | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  const user = await ctx.db.get(userId)
  if (user?.role === 'recruiter') {
    const org = await myOrg(ctx)
    const track = await ctx.db.get(app.trackId)
    return org && track && track.orgSlug === org.slug ? 'company' : null
  }
  const cand = await myCandidate(ctx)
  return cand && app.candidateId === cand._id ? 'candidate' : null
}

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
    const id = await ctx.db.insert('applications', {
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

    const org = await orgForTrack(ctx, track)
    await notify(ctx, org?.ownerUserId, 'application', `${candidate.name} applied to ${track.title} (${Math.round(matchScore)}% fit).`, '/recruiter/applicants')
    return id
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
          interviewAt: a.interviewAt ?? null,
          interviewProposedBy: a.interviewProposedBy ?? null,
          interviewStatus: a.interviewStatus ?? null,
          trackTitle: track?.title ?? '—',
          org: track?.org ?? '',
          orgSlug: track?.orgSlug ?? '',
        }
      }),
    )
  },
})

/** Candidate withdraws a still-pending application (removes it entirely). */
export const withdraw = mutation({
  args: { applicationId: v.id('applications') },
  handler: async (ctx, { applicationId }) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) throw new ConvexError('Not signed in')
    const app = await ctx.db.get(applicationId)
    if (!app) return
    if (app.candidateId !== candidate._id) throw new ConvexError('Not your application')
    if (app.status !== 'pending') throw new ConvexError('Only pending applications can be withdrawn')
    await ctx.db.delete(applicationId)
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

    const enrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_track', (q) => q.eq('trackId', track._id))
      .collect()
    const enrolledCandidateIds = new Set(enrollments.map((e) => e.candidateId as string))

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
          interviewAt: a.interviewAt ?? null,
          interviewProposedBy: a.interviewProposedBy ?? null,
          interviewStatus: a.interviewStatus ?? null,
          enrolled: enrolledCandidateIds.has(a.candidateId as string),
          name: c?.name ?? '—',
          university: c?.university ?? '',
          program: c?.program ?? '',
          animalKey: c?.animalKey ?? 'owl',
          reliability: c?.reliabilityScore ?? 0,
          reliabilityDisplay: await reliabilityDisplay(ctx, 'candidate', a.candidateId, c?.reliabilityScore ?? 0, false),
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

/**
 * Recruiter decision on an applicant. Accepting does NOT create a mentee — it
 * moves them to the interview stage and (with `interviewAt`) proposes a time.
 * Enrollment happens later via `enroll`, after the interview. Declining just
 * closes the application. Both notify the candidate.
 */
export const setStatus = mutation({
  args: { applicationId: v.id('applications'), status: STATUS, interviewAt: v.optional(v.number()) },
  handler: async (ctx, { applicationId, status, interviewAt }) => {
    const app = await ctx.db.get(applicationId)
    if (!app) return
    const track = await ctx.db.get(app.trackId)
    const candidate = await ctx.db.get(app.candidateId)

    if (status === 'declined') {
      await ctx.db.patch(applicationId, { status })
      await notify(ctx, candidate?.userId, 'application', `${track?.org ?? 'A company'} isn't moving forward with your application to ${track?.title ?? 'a track'}.`, '/student/applications')
      return
    }

    if (status === 'pending') {
      await ctx.db.patch(applicationId, { status })
      return
    }

    // Accept → interview stage. Propose the time if given (company proposes).
    const patch: Partial<Doc<'applications'>> = { status: 'accepted' }
    if (interviewAt) {
      patch.interviewAt = interviewAt
      patch.interviewProposedBy = 'company'
      patch.interviewStatus = 'proposed'
    }
    await ctx.db.patch(applicationId, patch)

    // Reliability: interviewing within SLA is a positive signal for the org.
    const org = track ? await orgForTrack(ctx, track) : null
    if (org) {
      const onTime = Date.now() <= app.slaDueAt
      await recordEvent(ctx, 'organization', org._id, onTime ? 1 : -8, onTime ? 'Interviewed an applicant within SLA' : 'Missed the interview SLA')
    }

    const when = interviewAt ? ` for ${fmtWhen(interviewAt)}` : ''
    await notify(ctx, candidate?.userId, 'interview', `${track?.org ?? 'A company'} wants to interview you for ${track?.title ?? 'a track'}${when}. Review the time in My Applications.`, '/student/applications')
  },
})

/**
 * Recruiter enrolls an accepted, interviewed applicant as a mentee — THIS is
 * where the mentorship (enrollment + starter tasks) is created, not on accept.
 */
export const enroll = mutation({
  args: { applicationId: v.id('applications') },
  handler: async (ctx, { applicationId }) => {
    const app = await ctx.db.get(applicationId)
    if (!app) throw new ConvexError('Application not found')
    if (app.status !== 'accepted') throw new ConvexError('Interview the applicant before enrolling them')
    const track = await ctx.db.get(app.trackId)
    if (!track) throw new ConvexError('Track not found')
    const org = await myOrg(ctx)
    if (!org || org.slug !== track.orgSlug) throw new ConvexError('That track belongs to another company')

    const trackEnrollments = await ctx.db
      .query('enrollments')
      .withIndex('by_track', (q) => q.eq('trackId', track._id))
      .collect()
    if (trackEnrollments.some((e) => e.candidateId === app.candidateId)) return
    if (trackEnrollments.length >= track.cap) {
      throw new ConvexError(`This track is at its seat cap of ${track.cap}. Close or expand it before enrolling more.`)
    }

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

    const candidate = await ctx.db.get(app.candidateId)
    await notify(ctx, candidate?.userId, 'enrolled', `You're enrolled in ${track.title} at ${track.org} — your mentorship has started.`, '/student/mentorship')
  },
})

/** Either party proposes (or counter-proposes) an interview time. */
export const proposeInterview = mutation({
  args: { applicationId: v.id('applications'), at: v.number() },
  handler: async (ctx, { applicationId, at }) => {
    const app = await ctx.db.get(applicationId)
    if (!app) throw new ConvexError('Application not found')
    const party = await resolveParty(ctx, app)
    if (!party) throw new ConvexError('Not allowed')
    if (at < Date.now()) throw new ConvexError('Pick a time in the future')

    await ctx.db.patch(applicationId, { interviewAt: at, interviewProposedBy: party, interviewStatus: 'proposed' })

    const track = await ctx.db.get(app.trackId)
    const candidate = await ctx.db.get(app.candidateId)
    if (party === 'company') {
      await notify(ctx, candidate?.userId, 'interview', `${track?.org ?? 'A company'} proposed a new interview time: ${fmtWhen(at)}.`, '/student/applications')
    } else {
      const org = track ? await orgForTrack(ctx, track) : null
      await notify(ctx, org?.ownerUserId, 'interview', `${candidate?.name ?? 'A candidate'} proposed a new interview time: ${fmtWhen(at)}.`, '/recruiter/applicants')
    }
  },
})

/** The party who did NOT last propose confirms the interview time. */
export const confirmInterview = mutation({
  args: { applicationId: v.id('applications') },
  handler: async (ctx, { applicationId }) => {
    const app = await ctx.db.get(applicationId)
    if (!app) throw new ConvexError('Application not found')
    const party = await resolveParty(ctx, app)
    if (!party) throw new ConvexError('Not allowed')
    if (!app.interviewAt || app.interviewStatus !== 'proposed') throw new ConvexError('No proposed time to confirm')
    if (app.interviewProposedBy === party) throw new ConvexError('Waiting for the other party to respond to your proposal')

    await ctx.db.patch(applicationId, { interviewStatus: 'confirmed' })

    const track = await ctx.db.get(app.trackId)
    const candidate = await ctx.db.get(app.candidateId)
    const org = track ? await orgForTrack(ctx, track) : null
    const whenText = fmtWhen(app.interviewAt)
    // Confirm notifies BOTH sides so the calendar lands for everyone.
    await notify(ctx, candidate?.userId, 'interview', `Interview confirmed with ${track?.org ?? 'the company'} for ${whenText}.`, '/student/applications')
    await notify(ctx, org?.ownerUserId, 'interview', `Interview confirmed with ${candidate?.name ?? 'the candidate'} for ${whenText}.`, '/recruiter/applicants')
  },
})
