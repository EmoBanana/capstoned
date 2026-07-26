'use client'

import { Eyebrow } from '../ui'
import { UserIcon, BuildingIcon, CheckIcon } from './icons'

/* ------------------------------------------------------------------ */
/*  Benefits — the concrete payoff for each side, candidates and       */
/*  companies, laid out as two scannable columns.                      */
/* ------------------------------------------------------------------ */

type Column = {
  label: string
  icon: (p: { className?: string }) => React.JSX.Element
  points: string[]
}

const COLUMNS: Column[] = [
  {
    label: 'For candidates',
    icon: UserIcon,
    points: [
      'Try a real career before you commit, with real projects and real mentors alongside you.',
      'Get matched on your interests, aspirations, and skills, not keywords, after a quick read of your work-style.',
      'Build real proof of what you do well, not just another line on a resume.',
      'Every genuine effort earns a real response from the team, so your work is never left ignored.',
      'Learn early when a path is wrong, before it costs you years, and get backed with an optional micro-bond when a company sees your potential.',
    ],
  },
  {
    label: 'For companies',
    icon: BuildingIcon,
    points: [
      'See how someone truly works across weeks, instead of judging one short interview.',
      'Design milestone-driven tracks with clear deliverables and no busywork.',
      'Assess fit mutually before any hiring decision, which lowers risk on both sides.',
      'Build an early pipeline of talent you have already worked alongside.',
      'Back promising people early with a low-cost micro-bond instead of a full scholarship.',
    ],
  },
]

export function Benefits() {
  return (
    <section className="border-b border-line bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl" data-reveal>
          <Eyebrow>Impact</Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            What each side actually gains.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-soft text-justify hyphens-auto">
            The same experience pays off in both directions. Here is what people
            gain when they join, and what teams gain when they host.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-[2px] border border-line bg-line md:grid-cols-2">
          {COLUMNS.map((col) => {
            const Icon = col.icon
            return (
              <div key={col.label} data-reveal className="flex flex-col bg-white p-7">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-line-strong bg-cream text-ink rounded-[2px]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-bold leading-snug tracking-tight text-ink">
                    {col.label}
                  </h3>
                </div>

                <ul className="mt-6 flex flex-col gap-4">
                  {col.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center border border-line-strong bg-cream text-ink rounded-[2px]">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      <p className="text-sm leading-relaxed text-ink-soft">{point}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
