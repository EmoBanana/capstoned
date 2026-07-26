import { ConvexError } from 'convex/values'
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

/** Mentor reviews a submitted task: approve (→ done) or return (→ in-progress),
 *  optionally leaving a note. Approving is a positive reliability signal. */
export const review = mutation({
  args: {
    taskId: v.id('tasks'),
    decision: v.union(v.literal('approve'), v.literal('return')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, decision, note }) => {
    const task = await ctx.db.get(taskId)
    if (!task) throw new ConvexError('Task not found')
    const status = decision === 'approve' ? ('done' as const) : ('in-progress' as const)
    await ctx.db.patch(taskId, { status, mentorNote: note?.trim() || task.mentorNote })
    if (decision === 'approve') {
      const enrollment = await ctx.db.get(task.enrollmentId)
      if (enrollment) await recordEvent(ctx, 'candidate', enrollment.candidateId, 1, 'Cleared a mentor-reviewed deliverable')
    }
  },
})

/** Mentor adds a new task to a mentee's enrollment. */
export const add = mutation({
  args: { enrollmentId: v.id('enrollments'), title: v.string(), dueLabel: v.optional(v.string()) },
  handler: async (ctx, { enrollmentId, title, dueLabel }) => {
    const clean = title.trim()
    if (!clean) throw new ConvexError('Task title required')
    const existing = await ctx.db
      .query('tasks')
      .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
      .collect()
    const order = existing.reduce((m, t) => Math.max(m, t.order), -1) + 1
    return await ctx.db.insert('tasks', { enrollmentId, title: clean, status: 'todo', dueLabel, order })
  },
})
