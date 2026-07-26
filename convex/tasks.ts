import { mutation } from './_generated/server'
import { v } from 'convex/values'

/** Student submits a deliverable for a task (todo/in-progress → submitted). */
export const submit = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    await ctx.db.patch(taskId, { status: 'submitted' })
  },
})
