import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { reliabilityDisplay } from './reliability'

/** The signed-in user's own candidate profile, or null. No demo fallback:
 *  a fresh account has no matchable profile until it finishes onboarding. */
async function myCandidate(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) return null
    // Additive display field; `reliabilityScore` is left untouched so matching
    // and every existing consumer keep the raw numeric value.
    return {
      ...candidate,
      reliabilityDisplay: await reliabilityDisplay(
        ctx,
        'candidate',
        candidate._id,
        candidate.reliabilityScore,
        false,
      ),
    }
  },
})

const skill = v.object({ name: v.string(), level: v.number() })

/** Persist the onboarding result to the signed-in student's own profile. */
export const saveProfile = mutation({
  args: {
    headline: v.string(),
    university: v.string(),
    program: v.string(),
    skills: v.array(skill),
    interests: v.array(v.string()),
    aspirations: v.array(v.string()),
    availabilityHoursPerWeek: v.number(),
    animalKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError('Not signed in')
    const user = await ctx.db.get(userId)
    const existing = await ctx.db
      .query('candidates')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    const fields = { ...args, profileComplete: true }
    if (existing) {
      await ctx.db.patch(existing._id, fields)
      return existing._id
    }
    return await ctx.db.insert('candidates', {
      userId,
      name: user?.name ?? '',
      reliabilityScore: 95,
      ...fields,
    })
  },
})
