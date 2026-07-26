import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

/** Append an event to a user's notification feed (surfaced by the bell). */
export async function notify(
  ctx: MutationCtx,
  userId: Id<'users'> | undefined | null,
  kind: string,
  body: string,
  href?: string,
) {
  if (!userId) return
  await ctx.db.insert('notifications', { userId, kind, body, href, read: false, createdAt: Date.now() })
}

/** The signed-in user's recent notifications, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 25)
      .map((n) => ({ id: n._id as string, kind: n.kind, body: n.body, href: n.href ?? null, read: n.read, createdAt: n.createdAt }))
  },
})

/** Mark every one of the user's notifications read (bell opened). */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    for (const n of rows) if (!n.read) await ctx.db.patch(n._id, { read: true })
  },
})
