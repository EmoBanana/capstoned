import { query } from './_generated/server'
import { v } from 'convex/values'
import type { MutationCtx, QueryCtx } from './_generated/server'

type SubjectKind = 'candidate' | 'organization'

/** Append a reliability event (called from mutations that change standing). */
export async function recordEvent(ctx: MutationCtx, subjectKind: SubjectKind, subjectId: string, delta: number, reason: string) {
  await ctx.db.insert('reliabilityEvents', { subjectKind, subjectId, delta, reason, createdAt: Date.now() })
}

/** Sum of a subject's reliability deltas. Derived score = base + this, clamped. */
export async function deltaSum(ctx: QueryCtx | MutationCtx, subjectKind: SubjectKind, subjectId: string): Promise<number> {
  const events = await ctx.db
    .query('reliabilityEvents')
    .withIndex('by_subject', (q) => q.eq('subjectKind', subjectKind).eq('subjectId', subjectId))
    .collect()
  return events.reduce((sum, e) => sum + e.delta, 0)
}

export function clampScore(base: number, delta: number): number {
  return Math.max(0, Math.min(100, base + delta))
}

/**
 * Reliability standing for display, gated on a real track record.
 * Returns the derived score `clampScore(base, deltaSum)` only when the subject
 * has at least one reliability event OR is an established brand (`established`,
 * e.g. a verified organization). With no events and not established it returns
 * null, meaning "New" — no fabricated percentage for a fresh account.
 */
export async function reliabilityDisplay(
  ctx: QueryCtx | MutationCtx,
  subjectKind: SubjectKind,
  subjectId: string,
  base: number,
  established: boolean,
): Promise<number | null> {
  const events = await ctx.db
    .query('reliabilityEvents')
    .withIndex('by_subject', (q) => q.eq('subjectKind', subjectKind).eq('subjectId', subjectId))
    .collect()
  if (events.length === 0 && !established) return null
  const delta = events.reduce((sum, e) => sum + e.delta, 0)
  return clampScore(base, delta)
}

/** Derived reliability for an org (by slug), plus its recent events. */
export const orgScore = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, { orgSlug }) => {
    const org = (await ctx.db.query('organizations').collect()).find((o) => o.slug === orgSlug)
    if (!org) return { score: 100, base: 100, events: [] }
    const events = await ctx.db
      .query('reliabilityEvents')
      .withIndex('by_subject', (q) => q.eq('subjectKind', 'organization').eq('subjectId', org._id))
      .collect()
    const delta = events.reduce((sum, e) => sum + e.delta, 0)
    return {
      score: clampScore(org.reliability, delta),
      base: org.reliability,
      events: events
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6)
        .map((e) => ({ delta: e.delta, reason: e.reason })),
    }
  },
})
