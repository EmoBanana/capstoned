import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * The candidate profile used to compute matches. Prefers a profile linked to
 * the signed-in user; falls back to the demo persona (John Doe) until real
 * onboarding (the animal quiz) creates per-user profiles.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    const all = await ctx.db.query('candidates').collect()
    if (userId) {
      const linked = all.find((c) => c.userId === userId)
      if (linked) return linked
    }
    return all.find((c) => c.name === 'John Doe') ?? all[0] ?? null
  },
})
