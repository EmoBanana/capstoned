import { query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

/* ------------------------------------------------------------------ */
/*  University insights — a READ-ONLY aggregate view over EXISTING     */
/*  tables. No schema changes, no auth: this is public cohort data for  */
/*  the demo. It groups candidates by their `university` string and     */
/*  reports engagement, interests, archetypes, and a mismatch-averted   */
/*  impact figure derived transparently from real application/          */
/*  enrollment activity.                                                */
/* ------------------------------------------------------------------ */

type Engagement = 'on-track' | 'needs-nudge' | 'at-risk'

type StudentRow = {
  id: string
  name: string
  program: string
  animalKey: string
  reliabilityScore: number
  engagement: Engagement
  exploring: boolean
  enrolled: boolean
  university: string
}

type Distribution = { label: string; count: number }

type Cohort = {
  university: string
  totalComplete: number
  exploring: number
  enrolled: number
  onTrack: number
  needsNudge: number
  atRisk: number
  mismatchAverted: number
  interests: Distribution[]
  animals: Distribution[]
  attention: StudentRow[]
}

type Summary = {
  universities: number
  totalStudents: number
  exploring: number
  enrolled: number
  onTrack: number
  needsNudge: number
  atRisk: number
  mismatchAverted: number
  interests: Distribution[]
  animals: Distribution[]
  attention: StudentRow[]
}

/**
 * Engagement status per student. Clear, defensible precedence:
 *
 *   at-risk     enrolled with an at-risk mentorship, OR a blocked task.
 *   needs-nudge enrolled but flagged needs-support; OR exploring but every
 *               application was declined (stalled); OR a complete profile
 *               that has not started exploring any track yet.
 *   on-track    enrolled and ahead/on-track; OR exploring with at least one
 *               live pending application (in motion).
 *
 * Enrollment signal always wins over application signal, because an active
 * mentorship is the strongest evidence of where a student actually is.
 */
function engagementFor(
  enrollment: Doc<'enrollments'> | undefined,
  applications: Doc<'applications'>[],
  hasBlockedTask: boolean,
): Engagement {
  if (enrollment) {
    if (enrollment.status === 'at-risk' || hasBlockedTask) return 'at-risk'
    if (enrollment.status === 'needs-support') return 'needs-nudge'
    return 'on-track' // 'ahead' | 'on-track'
  }
  if (applications.length > 0) {
    const anyPending = applications.some((a) => a.status === 'pending')
    return anyPending ? 'on-track' : 'needs-nudge'
  }
  return 'needs-nudge' // onboarded, complete profile, but not yet exploring
}

async function anyBlockedTask(ctx: QueryCtx, enrollmentId: Id<'enrollments'>): Promise<boolean> {
  const tasks = await ctx.db
    .query('tasks')
    .withIndex('by_enrollment', (q) => q.eq('enrollmentId', enrollmentId))
    .collect()
  return tasks.some((t) => t.status === 'blocked')
}

function topDistribution(counts: Map<string, number>, limit?: number): Distribution[] {
  const rows = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  return limit ? rows.slice(0, limit) : rows
}

export const insights = query({
  args: {},
  handler: async (ctx): Promise<{ summary: Summary; cohorts: Cohort[] }> => {
    // Aggregate view only considers students who finished onboarding, since a
    // half-complete profile is not yet matchable or meaningful to a university.
    const candidates = (await ctx.db.query('candidates').collect()).filter(
      (c) => c.profileComplete === true,
    )
    const applications = await ctx.db.query('applications').collect()
    const enrollments = await ctx.db.query('enrollments').collect()

    const appsByCandidate = new Map<string, Doc<'applications'>[]>()
    for (const a of applications) {
      const key = a.candidateId as string
      const list = appsByCandidate.get(key)
      if (list) list.push(a)
      else appsByCandidate.set(key, [a])
    }
    // A student can only hold one active mentorship in the demo flow; take first.
    const enrollByCandidate = new Map<string, Doc<'enrollments'>>()
    for (const e of enrollments) {
      const key = e.candidateId as string
      if (!enrollByCandidate.has(key)) enrollByCandidate.set(key, e)
    }

    const rows: StudentRow[] = await Promise.all(
      candidates.map(async (c) => {
        const key = c._id as string
        const apps = appsByCandidate.get(key) ?? []
        const enrollment = enrollByCandidate.get(key)
        const blocked = enrollment ? await anyBlockedTask(ctx, enrollment._id) : false
        return {
          id: key,
          name: c.name,
          program: c.program,
          animalKey: c.animalKey,
          reliabilityScore: c.reliabilityScore,
          engagement: engagementFor(enrollment, apps, blocked),
          exploring: apps.length > 0,
          enrolled: enrollment !== undefined,
          university: c.university || 'Unaffiliated',
        }
      }),
    )

    const byUniversity = new Map<string, { candidate: Doc<'candidates'>; row: StudentRow }[]>()
    candidates.forEach((candidate, i) => {
      const row = rows[i]
      const list = byUniversity.get(row.university)
      if (list) list.push({ candidate, row })
      else byUniversity.set(row.university, [{ candidate, row }])
    })

    const cohorts: Cohort[] = [...byUniversity.entries()]
      .map(([university, members]) => {
        const interests = new Map<string, number>()
        const animals = new Map<string, number>()
        let exploring = 0
        let enrolled = 0
        let onTrack = 0
        let needsNudge = 0
        let atRisk = 0
        let mismatchAverted = 0

        for (const { candidate, row } of members) {
          for (const it of candidate.interests) interests.set(it, (interests.get(it) ?? 0) + 1)
          animals.set(candidate.animalKey, (animals.get(candidate.animalKey) ?? 0) + 1)
          if (row.exploring) exploring++
          if (row.enrolled) enrolled++
          if (row.engagement === 'on-track') onTrack++
          else if (row.engagement === 'needs-nudge') needsNudge++
          else atRisk++
          // Mismatch averted: explored at least one track but did not commit to
          // a mentorship. The fit gap surfaced in the low-cost application phase
          // rather than after a weeks-long commitment. Honest proxy, not a
          // fabricated metric: exploring === true AND enrolled === false.
          if (row.exploring && !row.enrolled) mismatchAverted++
        }

        const attention = members
          .map((m) => m.row)
          .filter((r) => r.engagement !== 'on-track')
          .sort((a, b) => rank(b.engagement) - rank(a.engagement) || a.reliabilityScore - b.reliabilityScore)

        return {
          university,
          totalComplete: members.length,
          exploring,
          enrolled,
          onTrack,
          needsNudge,
          atRisk,
          mismatchAverted,
          interests: topDistribution(interests),
          animals: topDistribution(animals),
          attention,
        }
      })
      .sort((a, b) => b.totalComplete - a.totalComplete || a.university.localeCompare(b.university))

    // Top-line summary across every cohort.
    const interestsAll = new Map<string, number>()
    const animalsAll = new Map<string, number>()
    for (const c of candidates) {
      for (const it of c.interests) interestsAll.set(it, (interestsAll.get(it) ?? 0) + 1)
      animalsAll.set(c.animalKey, (animalsAll.get(c.animalKey) ?? 0) + 1)
    }

    const summary: Summary = {
      universities: cohorts.length,
      totalStudents: rows.length,
      exploring: rows.filter((r) => r.exploring).length,
      enrolled: rows.filter((r) => r.enrolled).length,
      onTrack: rows.filter((r) => r.engagement === 'on-track').length,
      needsNudge: rows.filter((r) => r.engagement === 'needs-nudge').length,
      atRisk: rows.filter((r) => r.engagement === 'at-risk').length,
      mismatchAverted: rows.filter((r) => r.exploring && !r.enrolled).length,
      interests: topDistribution(interestsAll),
      animals: topDistribution(animalsAll),
      attention: rows
        .filter((r) => r.engagement !== 'on-track')
        .sort((a, b) => rank(b.engagement) - rank(a.engagement) || a.reliabilityScore - b.reliabilityScore),
    }

    return { summary, cohorts }
  },
})

/** At-risk sorts above needs-nudge in attention lists. */
function rank(e: Engagement): number {
  return e === 'at-risk' ? 2 : e === 'needs-nudge' ? 1 : 0
}
