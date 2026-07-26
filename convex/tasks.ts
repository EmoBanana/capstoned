import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { recordEvent } from './reliability'

/** Student submits a deliverable for a task (todo/in-progress → submitted). */
export const submit = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId)
    await ctx.db.patch(taskId, { status: 'submitted' })
    if (task) {
      const enrollment = await ctx.db.get(task.enrollmentId)
      if (enrollment) {
        await recordEvent(ctx, 'candidate', enrollment.candidateId, 1, 'Submitted a deliverable')
      }
    }
  },
})
