import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { recordEvent } from './reliability'

const TYPE = v.union(v.literal('milestone'), v.literal('period'))
const COMMITMENT = v.union(v.literal('contract'), v.literal('priority-hiring'))

/** The signed-in user's own candidate profile, or null. No demo fallback. */
async function myCandidate(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

type SponsorshipDoc = {
  _id: Id<'sponsorships'>
  orgName: string
  title: string
  type: 'milestone' | 'period'
  amount: number
  commitmentKind: 'contract' | 'priority-hiring'
  commitmentMonths: number
  status: string
  createdAt: number
  contractNo?: string
  signedName?: string
  signedAt?: number
}

const shape = (s: SponsorshipDoc) => ({
  id: s._id as string,
  orgName: s.orgName,
  title: s.title,
  type: s.type,
  amount: s.amount,
  commitmentKind: s.commitmentKind,
  commitmentMonths: s.commitmentMonths,
  status: s.status,
  createdAt: s.createdAt,
  contractNo: s.contractNo ?? null,
  signedName: s.signedName ?? null,
  signedAt: s.signedAt ?? null,
})

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

/** Student virtually signs the micro-bond contract — the executed record. */
export const sign = mutation({
  args: { sponsorshipId: v.id('sponsorships'), signedName: v.string() },
  handler: async (ctx, { sponsorshipId, signedName }) => {
    const candidate = await myCandidate(ctx)
    const s = await ctx.db.get(sponsorshipId)
    if (!s) throw new Error('Contract not found')
    if (candidate && s.candidateId !== candidate._id) throw new Error('Not your contract')
    if (!signedName.trim()) throw new Error('Signature required')

    const now = Date.now()
    const contractNo =
      s.contractNo ?? `MB-${new Date(now).getUTCFullYear()}-${(sponsorshipId as string).slice(-6).toUpperCase()}`
    await ctx.db.patch(sponsorshipId, {
      status: 'signed',
      signedName: signedName.trim(),
      signedAt: now,
      contractNo,
    })
    await recordEvent(ctx, 'candidate', s.candidateId, 2, 'Signed a micro-bond commitment')
    return contractNo
  },
})

/** Student declines the offer. */
export const decline = mutation({
  args: { sponsorshipId: v.id('sponsorships') },
  handler: async (ctx, { sponsorshipId }) => {
    const candidate = await myCandidate(ctx)
    const s = await ctx.db.get(sponsorshipId)
    if (!s) return
    if (candidate && s.candidateId !== candidate._id) throw new Error('Not your contract')
    await ctx.db.patch(sponsorshipId, { status: 'declined' })
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
    return s ? shape(s as SponsorshipDoc) : null
  },
})

/** The signed-in student's sponsorship offer, if any (student view). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) return null
    const rows = await ctx.db
      .query('sponsorships')
      .withIndex('by_candidate', (q) => q.eq('candidateId', candidate._id as Id<'candidates'>))
      .collect()
    const s = rows.find((r) => r.status !== 'declined') ?? null
    return s ? shape(s as SponsorshipDoc) : null
  },
})
