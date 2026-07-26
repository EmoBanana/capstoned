/* ------------------------------------------------------------------ */
/*  CapStoned — Weighted-Matrix Match Report (presentational)          */
/*                                                                      */
/*  The headline differentiator: the DEEP, in-depth counterpart to the  */
/*  fast "12 Animals" one-liner. Runs Session A's `computeMatch` and    */
/*  renders the org-weighted 5-factor breakdown, each with its own      */
/*  plain-English rationale. No Convex — pure props in, report out.     */
/* ------------------------------------------------------------------ */

import type { ReactNode } from 'react'
import { computeMatch } from '@/src/lib/matching'
import type { CandidateProfile, MatchFactor, Track } from '@/src/lib/domain'
import { ANIMALS } from '@/src/lib/animals'
import { Card, Badge, Eyebrow, ProgressBar } from '../ui'

/* ---- Qualitative bands ------------------------------------------- */

type Band = { label: string; tone: 'success' | 'gold' | 'slate' | 'danger' }

function bandFor(overall: number): Band {
  if (overall >= 85) return { label: 'Strong match', tone: 'success' }
  if (overall >= 70) return { label: 'Good match', tone: 'gold' }
  if (overall >= 55) return { label: 'Moderate match', tone: 'slate' }
  return { label: 'Exploratory', tone: 'danger' }
}

function barTone(score: number): 'success' | 'gold' | 'danger' {
  return score >= 75 ? 'success' : score >= 55 ? 'gold' : 'danger'
}

const RING_COLOR: Record<Band['tone'], string> = {
  success: 'var(--color-success, #2f7a4d)',
  gold: 'var(--color-gold, #b8912f)',
  slate: 'var(--color-slate, #5a6b7a)',
  danger: 'var(--color-danger, #a8382b)',
}

/* ---- Overall gauge ----------------------------------------------- */

function OverallGauge({ overall, band }: { overall: number; band: Band }) {
  const angle = Math.max(0, Math.min(100, overall)) * 3.6
  return (
    <div className="relative h-32 w-32 shrink-0">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${RING_COLOR[band.tone]} ${angle}deg, var(--color-line, #e6e1d6) ${angle}deg)`,
        }}
        role="img"
        aria-label={`Overall match ${overall} percent`}
      />
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full border border-line bg-white">
        <span className="text-3xl font-black tabular-nums leading-none text-ink">{overall}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          / 100
        </span>
      </div>
    </div>
  )
}

/* ---- One factor row ---------------------------------------------- */

function FactorRow({
  factor,
  animalTag,
}: {
  factor: MatchFactor
  animalTag?: ReactNode
}) {
  const weightPct = Math.round(factor.weight * 100)
  const contribution = Math.round(factor.score * factor.weight)
  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold text-ink">{factor.label}</span>
          <span
            className="inline-flex items-center border border-slate/30 bg-slate-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-ink rounded-[2px]"
            title="Org-configured weight for this factor"
          >
            {weightPct}% weight
          </span>
          {animalTag}
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{factor.score}%</span>
      </div>

      <ProgressBar value={factor.score} tone={barTone(factor.score)} />

      <div className="mt-2 flex items-start justify-between gap-4">
        <p className="text-xs leading-relaxed text-ink-soft">{factor.rationale}</p>
        <span className="mt-px shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink-faint">
          +{contribution} pts
        </span>
      </div>
    </div>
  )
}

/* ---- Report ------------------------------------------------------ */

export default function MatchReport({
  candidate,
  track,
  className = '',
}: {
  candidate: CandidateProfile
  track: Track
  className?: string
}) {
  const result = computeMatch(candidate, track)
  const band = bandFor(result.overall)
  const animal = ANIMALS[candidate.animalKey]

  const animalTag = (
    <Badge tone="gold">
      <span aria-hidden="true">{animal.emoji}</span>
      {animal.name}
    </Badge>
  )

  return (
    <Card className={`p-6 sm:p-7 ${className}`}>
      <header>
        <Eyebrow>Weighted Match Report</Eyebrow>
        <h2 className="mt-2 text-xl font-black leading-tight tracking-tight text-ink sm:text-2xl">
          {track.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {track.org} · {track.department}
        </p>
      </header>

      {/* Overall */}
      <div className="mt-6 flex flex-col items-center gap-5 border-y border-line py-6 sm:flex-row sm:gap-7">
        <OverallGauge overall={result.overall} band={band} />
        <div className="min-w-0 text-center sm:text-left">
          <Badge tone={band.tone}>{band.label}</Badge>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            An org-weighted decision matrix across five factors — the in-depth read behind{' '}
            <span className="font-semibold text-ink">{candidate.name}</span>&rsquo;s{' '}
            <span aria-hidden="true">{animal.emoji}</span> {animal.name} archetype.
          </p>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between pb-1 pt-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Factor breakdown
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Score · Contribution
          </span>
        </div>
        {result.factors.map((factor) => (
          <FactorRow
            key={factor.key}
            factor={factor}
            animalTag={factor.key === 'workingStyle' ? animalTag : undefined}
          />
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
        Contributions are each factor&rsquo;s score scaled by its weight; they sum to the overall
        score of {result.overall}.
      </p>
    </Card>
  )
}
