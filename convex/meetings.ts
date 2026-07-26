import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { enrollmentParty } from './enrollments'
import { notify } from './notifications'

// Composed on the Convex server (UTC); pin display to the event timezone so the
// time matches what both parties see on their cards (local Malaysia time).
const fmtWhen = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kuala_Lumpur',
  })

/** Meetings for an enrollment, most recent first, gated to the two parties.
 *  `mineProposed` tells the client which side is waiting on the other. */
export const forEnrollment = query({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const { party } = await enrollmentParty(ctx, enrollmentId)
    if (!party) return []
    const rows = await ctx.db
      .query('meetings')
      .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
      .collect()
    return rows
      .filter((m) => m.status !== 'cancelled')
      .sort((a, b) => b.at - a.at)
      .map((m) => ({
        id: m._id as string,
        at: m.at,
        note: m.note ?? '',
        proposedByRole: m.proposedByRole,
        status: m.status,
        whenText: fmtWhen(m.at),
        mineProposed: m.proposedByRole === party,
      }))
  },
})

/** Either party proposes a meeting time. Notifies the other to confirm. */
export const propose = mutation({
  args: { enrollmentId: v.id('enrollments'), at: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { enrollmentId, at, note }) => {
    const { party, org, candidate, enrollment } = await enrollmentParty(ctx, enrollmentId)
    if (!enrollment) throw new ConvexError('Enrollment not found')
    if (!party) throw new ConvexError('Not allowed')
    if (at < Date.now()) throw new ConvexError('Pick a time in the future')

    await ctx.db.insert('meetings', {
      enrollmentId,
      at,
      note: (note ?? '').trim() || undefined,
      proposedByRole: party,
      status: 'proposed',
      createdAt: Date.now(),
    })

    if (party === 'mentor') {
      await notify(ctx, candidate?.userId, 'meeting', `${org?.name ?? 'Your mentor'} proposed a meeting for ${fmtWhen(at)}.`, '/student/mentorship')
    } else {
      await notify(ctx, org?.ownerUserId, 'meeting', `${candidate?.name ?? 'Your mentee'} proposed a meeting for ${fmtWhen(at)}.`, '/recruiter/mentees')
    }
  },
})

/** The party who did NOT propose confirms the meeting. Notifies both. */
export const confirm = mutation({
  args: { meetingId: v.id('meetings') },
  handler: async (ctx, { meetingId }) => {
    const meeting = await ctx.db.get(meetingId)
    if (!meeting) throw new ConvexError('Meeting not found')
    const { party, org, candidate } = await enrollmentParty(ctx, meeting.enrollmentId)
    if (!party) throw new ConvexError('Not allowed')
    if (meeting.status !== 'proposed') throw new ConvexError('No proposed meeting to confirm')
    if (meeting.proposedByRole === party) throw new ConvexError('Waiting for the other party to confirm your proposal')

    await ctx.db.patch(meetingId, { status: 'confirmed' })
    const when = fmtWhen(meeting.at)
    await notify(ctx, candidate?.userId, 'meeting', `Meeting confirmed for ${when}.`, '/student/mentorship')
    await notify(ctx, org?.ownerUserId, 'meeting', `Meeting confirmed for ${when}.`, '/recruiter/mentees')
  },
})

/** Either party cancels a proposed or confirmed meeting. */
export const cancel = mutation({
  args: { meetingId: v.id('meetings') },
  handler: async (ctx, { meetingId }) => {
    const meeting = await ctx.db.get(meetingId)
    if (!meeting) return
    const { party } = await enrollmentParty(ctx, meeting.enrollmentId)
    if (!party) throw new ConvexError('Not allowed')
    await ctx.db.patch(meetingId, { status: 'cancelled' })
  },
})
