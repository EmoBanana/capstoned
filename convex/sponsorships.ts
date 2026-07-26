import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

const TYPE = v.union(v.literal('milestone'), v.literal('period'))
const COMMITMENT = v.union(v.literal('contract'), v.literal('priority-hiring'))

/** Recruiter offers (or re-offers) a micro-bond to a mentee's enrollment. */
export const offer = mutation({
  args: {
    enrollmentId: v.id('enrollments'),
    title: v.string(),
    type: TYPE,
    amount: v.number(),
    commitmentKind: COMMITMENT,
    commitmentMonths: v.number(),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) throw new Error('Enrollment not found')
    const track = await ctx.db.get(enrollment.trackId)

    const existing = (
      await ctx.db
        .query('sponsorships')
        .withIndex('by_enrollment', (q) => q.eq('enrollmentId', args.enrollmentId))
        .collect()
    ).find((s) => s.status !== 'declined')

    const fields = {
      enrollmentId: args.enrollmentId,
      candidateId: enrollment.candidateId,
      orgName: track?.org ?? 'Talentbank',
      title: args.title,
      type: args.type,
      amount: args.amount,
      commitmentKind: args.commitmentKind,
      commitmentMonths: args.commitmentMonths,
      status: 'offered' as const,
      createdAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, fields)
      return existing._id
    }
    return await ctx.db.insert('sponsorships', fields)
  },
})

export const respond = mutation({
  args: { sponsorshipId: v.id('sponsorships'), status: v.union(v.literal('accepted'), v.literal('declined')) },
  handler: async (ctx, { sponsorshipId, status }) => {
    await ctx.db.patch(sponsorshipId, { status })
  },
})

/** The active sponsorship on an enrollment (recruiter view). */
export const forEnrollment = query({
  args: { enrollmentId: v.id('enrollments') },
  handler: async (ctx, { enrollmentId }) => {
    const rows = await ctx.db
      .query('sponsorships')
      .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
      .collect()
    const s = rows.find((r) => r.status !== 'declined') ?? null
    return s ? { id: s._id as string, title: s.title, type: s.type, amount: s.amount, commitmentKind: s.commitmentKind, commitmentMonths: s.commitmentMonths, status: s.status } : null
  },
})

/** The signed-in student's sponsorship offer, if any (student view). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    const cands = await ctx.db.query('candidates').collect()
    const candidate = (userId && cands.find((c) => c.userId === userId)) || cands.find((c) => c.name === 'John Doe') || cands[0]
    if (!candidate) return null
    const rows = await ctx.db
      .query('sponsorships')
      .withIndex('by_candidate', (q) => q.eq('candidateId', candidate._id as Id<'candidates'>))
      .collect()
    const s = rows.find((r) => r.status !== 'declined') ?? null
    return s ? { id: s._id as string, orgName: s.orgName, title: s.title, type: s.type, amount: s.amount, commitmentKind: s.commitmentKind, commitmentMonths: s.commitmentMonths, status: s.status } : null
  },
})
