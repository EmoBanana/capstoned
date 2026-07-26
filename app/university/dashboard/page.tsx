'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Page, Card, Badge, ProgressBar, Eyebrow } from '@/src/components/ui'
import { ANIMALS } from '@/src/lib/animals'
import type { AnimalKey } from '@/src/lib/domain'

/* ------------------------------------------------------------------ */
/*  University insights dashboard — READ-ONLY. Aggregates live cohort   */
/*  data: engagement outcomes, interest and archetype distributions,    */
/*  and the mismatch-averted impact figure. Insight, never a gate.      */
/* ------------------------------------------------------------------ */

type Engagement = 'on-track' | 'needs-nudge' | 'at-risk'

const ENGAGEMENT_LABEL: Record<Engagement, string> = {
  'on-track': 'On track',
  'needs-nudge': 'Needs a nudge',
  'at-risk': 'At risk',
}

const ENGAGEMENT_TONE: Record<Engagement, 'success' | 'gold' | 'danger'> = {
  'on-track': 'success',
  'needs-nudge': 'gold',
  'at-risk': 'danger',
}

function animalName(key: string): string {
  return ANIMALS[key as AnimalKey]?.name ?? key
}

function animalEmoji(key: string): string {
  return ANIMALS[key as AnimalKey]?.emoji ?? '•'
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="p-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-3 text-4xl font-black tabular-nums leading-none text-ink">{value}</div>
      {hint && <p className="mt-3 text-xs leading-relaxed text-ink-soft">{hint}</p>}
    </Card>
  )
}

function DistributionBars({
  rows,
  emojiFor,
}: {
  rows: { label: string; count: number }[]
  emojiFor?: (label: string) => string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              {emojiFor && <span aria-hidden="true">{emojiFor(r.label)}</span>}
              <span>{emojiFor ? animalName(r.label) : r.label}</span>
            </span>
            <span className="text-sm font-bold tabular-nums text-ink-soft">{r.count}</span>
          </div>
          <ProgressBar value={r.count} max={max} tone="gold" />
        </li>
      ))}
    </ul>
  )
}

export default function UniversityDashboardPage() {
  const data = useQuery(api.university.insights, {})

  // Loading
  if (data === undefined) {
    return (
      <Page>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-72 bg-line rounded-[2px]" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-line rounded-[2px]" />
            ))}
          </div>
          <div className="h-64 bg-line rounded-[2px]" />
        </div>
      </Page>
    )
  }

  const { summary, cohorts } = data

  // Empty
  if (summary.totalStudents === 0) {
    return (
      <Page>
        <Eyebrow>University insights</Eyebrow>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-ink">No cohort data yet</h1>
        <Card className="mt-8 p-10 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-soft">
            Once students finish onboarding and begin exploring tracks, their aggregate trajectory
            will appear here. Nothing is shown until there is a cohort to report on.
          </p>
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      {/* Headline */}
      <div className="max-w-2xl">
        <Eyebrow>University insights</Eyebrow>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Where your students are heading.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          A read-only view of cohort engagement and early trajectory. The strongest signal is the
          mismatch averted: students who found a path did not fit before committing years to it.
        </p>
      </div>

      {/* Impact row */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-ink p-6 text-cream">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-cream/70">
              Mismatch averted
            </span>
            <Badge tone="gold">Impact</Badge>
          </div>
          <div className="mt-3 text-5xl font-black tabular-nums leading-none">
            {summary.mismatchAverted}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-cream/70">
            Students who explored a track but stepped away before committing to a mentorship. The
            fit gap surfaced early, at low cost.
          </p>
        </Card>
        <StatTile
          label="Students tracked"
          value={summary.totalStudents}
          hint={`Across ${summary.universities} ${summary.universities === 1 ? 'institution' : 'institutions'} with a complete profile.`}
        />
        <StatTile
          label="Exploring"
          value={summary.exploring}
          hint="Applied to at least one track and are weighing the fit."
        />
        <StatTile
          label="In a mentorship"
          value={summary.enrolled}
          hint="Committed to an active track and being mentored now."
        />
      </div>

      {/* Engagement split */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Engagement across all cohorts
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              How students are doing right now, from their mentorship and application activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{summary.onTrack} on track</Badge>
            <Badge tone="gold">{summary.needsNudge} need a nudge</Badge>
            <Badge tone="danger">{summary.atRisk} at risk</Badge>
          </div>
        </div>
        <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-[1px] bg-line">
          <div className="bg-success" style={{ width: `${pct(summary.onTrack, summary.totalStudents)}%` }} />
          <div className="bg-gold" style={{ width: `${pct(summary.needsNudge, summary.totalStudents)}%` }} />
          <div className="bg-danger" style={{ width: `${pct(summary.atRisk, summary.totalStudents)}%` }} />
        </div>
      </Card>

      {/* Cohort outcome cards */}
      <div className="mt-12">
        <h2 className="text-lg font-bold tracking-tight text-ink">Cohorts</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {cohorts.map((c) => (
            <Card key={c.university} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold leading-snug text-ink">{c.university}</h3>
                  <p className="mt-1 text-xs text-ink-faint">
                    {c.totalComplete} {c.totalComplete === 1 ? 'student' : 'students'} · {c.exploring} exploring · {c.enrolled} mentored
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums leading-none text-ink">
                    {c.mismatchAverted}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Averted
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <OutcomeRow label="On track" value={c.onTrack} total={c.totalComplete} tone="success" />
                <OutcomeRow label="Needs a nudge" value={c.needsNudge} total={c.totalComplete} tone="gold" />
                <OutcomeRow label="At risk" value={c.atRisk} total={c.totalComplete} tone="danger" />
              </div>

              {c.interests.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Top interests
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.interests.slice(0, 6).map((it) => (
                      <Badge key={it.label} tone="slate">
                        {it.label} · {it.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Attention list + distributions */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-ink">Students to check in with</h2>
            <Badge tone="neutral">{summary.attention.length}</Badge>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Sorted by urgency. At-risk students are enrolled but struggling. A nudge means they have
            stalled or have not started exploring.
          </p>
          {summary.attention.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              Every tracked student is on track. Nothing needs attention right now.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {summary.attention.slice(0, 12).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{s.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-faint">
                      {s.program || 'Program not set'} · {s.university}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs tabular-nums text-ink-faint sm:inline">
                      Reliability {s.reliabilityScore}
                    </span>
                    <Badge tone={ENGAGEMENT_TONE[s.engagement]}>{ENGAGEMENT_LABEL[s.engagement]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold tracking-tight text-ink">Work-style mix</h2>
          <p className="mt-2 text-sm text-ink-soft">
            The archetype distribution across every cohort.
          </p>
          <div className="mt-5">
            <DistributionBars rows={summary.animals} emojiFor={animalEmoji} />
          </div>
        </Card>
      </div>

      {/* Interest heatmap */}
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold tracking-tight text-ink">What students are drawn to</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Interest signal aggregated across all tracked students.
        </p>
        <div className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          <DistributionBars rows={summary.interests.slice(0, Math.ceil(summary.interests.length / 2))} />
          <DistributionBars rows={summary.interests.slice(Math.ceil(summary.interests.length / 2))} />
        </div>
      </Card>
    </Page>
  )
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function OutcomeRow({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: 'success' | 'gold' | 'danger'
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-ink">{label}</span>
        <span className="text-sm font-bold tabular-nums text-ink">{value}</span>
      </div>
      <ProgressBar value={value} max={total} tone={tone} />
    </div>
  )
}
