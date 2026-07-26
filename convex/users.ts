import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

/** The currently authenticated user's document (or null). */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    return await ctx.db.get(userId)
  },
})
