'use client'

import { Eyebrow, Badge } from '../ui'
import { UserIcon, BuildingIcon, CapIcon } from './icons'

/* ------------------------------------------------------------------ */
/*  Three audiences — one platform. Candidates explore, employers      */
/*  observe over time, universities read early trajectory signal.      */
/*  Explicitly not gatekeeping, not recruitment.                       */
/* ------------------------------------------------------------------ */

const AUDIENCES: {
  tag: string
  title: string
  detail: string
  points: string[]
  icon: (p: { className?: string }) => React.JSX.Element
}[] = [
  {
    tag: 'Candidates',
    title: 'Explore & get mentored',
    detail:
      'Find your work-style, join tracks that fit, and build real evidence of what you do well and what you genuinely enjoy.',
    points: ['Work-style discovery', 'Real projects & mentors', 'Reliability you own'],
    icon: UserIcon,
  },
  {
    tag: 'Employers',
    title: 'Design tracks, observe talent',
    detail:
      'Craft milestone-driven tracks and watch how people really work over weeks, not how they interview for an hour.',
    points: ['Author mentorship tracks', 'Signal over sound-bites', 'Mutual evaluation'],
    icon: BuildingIcon,
  },
  {
    tag: 'Universities',
    title: 'See early trajectory signal',
    detail:
      'Understand where students are heading and where mismatches are averted early: insight, never a gate.',
    points: ['Cohort engagement', 'Mismatch averted', 'Never gatekeeping'],
    icon: CapIcon,
  },
]

export function Audiences() {
  return (
    <section className="border-b border-line bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl" data-reveal>
          <Eyebrow>One platform</Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            Three audiences, one shared source of truth.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-soft text-justify hyphens-auto">
            Participation is voluntary on every side, and the focus is learning and
            mutual evaluation, not recruitment.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a) => {
            const Icon = a.icon
            return (
              <div
                key={a.tag}
                data-reveal
                className="flex flex-col border border-line bg-white p-7 rounded-[2px] transition-colors duration-150 hover:border-line-strong"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-line-strong bg-cream text-ink rounded-[2px]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge tone="gold">{a.tag}</Badge>
                </div>
                <h3 className="mt-6 text-xl font-bold leading-snug tracking-tight text-ink">
                  {a.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{a.detail}</p>
                <ul className="mt-5 space-y-2 border-t border-line pt-5">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-ink">
                      <span className="h-1.5 w-1.5 shrink-0 bg-gold" aria-hidden="true" />
                      {p}
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
