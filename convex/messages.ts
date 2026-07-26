import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { enrollmentParty } from './enrollments'
import { notify } from './notifications'

/**
 * The chat thread for an enrollment, oldest first. Only the company mentor
 * (org owner) or the enrolled candidate may read it; anyone else gets nothing.
 * `mine` lets the client align each bubble to the viewer.
 */
export const list = query({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const { party } = await enrollmentParty(ctx, enrollmentId)
    if (!party) return []
    const rows = await ctx.db
      .query('messages')
      .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
      .collect()
    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((m) => ({
        id: m._id as string,
        senderRole: m.senderRole,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt,
        mine: m.senderRole === party,
      }))
  },
})

/** Send a message on an enrollment's thread. Notifies the other party. */
export const send = mutation({
  args: { enrollmentId: v.id('enrollments'), body: v.string() },
  handler: async (ctx, { enrollmentId, body }) => {
    const text = body.trim()
    if (!text) throw new ConvexError('Message cannot be empty')
    const { party, org, candidate } = await enrollmentParty(ctx, enrollmentId)
    if (!party) throw new ConvexError('Not allowed')
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError('Not signed in')
    const user = await ctx.db.get(userId)
    const senderName = user?.name || (party === 'mentor' ? 'Mentor' : candidate?.name || 'Mentee')

    await ctx.db.insert('messages', {
      enrollmentId,
      senderUserId: userId,
      senderRole: party,
      senderName,
      body: text.slice(0, 2000),
      createdAt: Date.now(),
    })

    if (party === 'mentor') {
      await notify(ctx, candidate?.userId, 'message', `${senderName} sent you a message.`, '/student/mentorship')
    } else {
      await notify(ctx, org?.ownerUserId, 'message', `${senderName} sent you a message.`, '/recruiter/mentees')
    }
  },
})
