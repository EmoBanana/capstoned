'use client'

import { Eyebrow } from '../ui'

/* ------------------------------------------------------------------ */
/*  The problem — choosing a path under pressure, without real         */
/*  experience. Danger accent carries the urgency.                     */
/* ------------------------------------------------------------------ */

const COSTS: { stat: string; label: string; detail: string }[] = [
  {
    stat: 'Years',
    label: 'Committed blind',
    detail:
      'Degrees and first jobs are chosen from brochures and job titles, not from doing the actual work.',
  },
  {
    stat: 'One shot',
    label: 'Under a deadline',
    detail:
      'Application windows force a decision long before anyone has a real feel for the day-to-day.',
  },
  {
    stat: 'Too late',
    label: 'To find the misfit',
    detail:
      'The mismatch usually surfaces after the commitment is made, when changing course is expensive.',
  },
]

export function Problem() {
  return (
    <section className="border-b border-line bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div data-reveal>
            <Eyebrow className="text-danger">The problem</Eyebrow>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              You commit to a career before you ever get to try it.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft text-justify hyphens-auto">
              People of every age, from secondary-school students to seasoned
              career-changers, pick academic and professional paths under time
              pressure, with almost no lived experience of what those paths
              actually feel like. The result is a slow, costly correction that
              arrives years after the point of no return.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[2px] border border-line bg-line sm:grid-cols-3">
            {COSTS.map((c) => (
              <div
                key={c.label}
                data-reveal
                className="flex flex-col bg-white p-6"
              >
                <p className="text-2xl font-black tracking-tight text-danger">{c.stat}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  {c.label}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
