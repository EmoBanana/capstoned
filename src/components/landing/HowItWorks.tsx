'use client'

import { Eyebrow } from '../ui'
import { CompassIcon, RouteIcon, CheckIcon } from './icons'

/* ------------------------------------------------------------------ */
/*  How it works — three steps from discovery to a confident decision. */
/* ------------------------------------------------------------------ */

const STEPS: {
  n: string
  title: string
  detail: string
  icon: (p: { className?: string }) => React.JSX.Element
}[] = [
  {
    n: '01',
    title: 'Discover your work-style',
    detail:
      'Take the fast 12 Animals quiz to name how you actually like to work — then go deeper with a weighted profile that powers real matches.',
    icon: CompassIcon,
  },
  {
    n: '02',
    title: 'Experience a mentorship track',
    detail:
      'Join a structured, milestone-driven track inside a real company. Ship real deliverables with a mentor and continuous feedback — low stakes, both ways.',
    icon: RouteIcon,
  },
  {
    n: '03',
    title: 'Decide with real evidence',
    detail:
      'Walk away knowing whether the path fits — backed by the work you did, the feedback you earned, and a mutual read on the match.',
    icon: CheckIcon,
  },
]

export function HowItWorks() {
  return (
    <section className="border-b border-line bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl" data-reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            Try the career, then choose it.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-soft">
            Three steps turn a high-stakes guess into a low-stakes experiment with
            a clear answer at the end.
          </p>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-[2px] border border-line bg-line md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon
            return (
              <li key={s.n} data-reveal className="flex flex-col bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-line-strong bg-cream text-ink rounded-[2px]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-4xl font-black tabular-nums tracking-tight text-line-strong">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold leading-snug tracking-tight text-ink">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{s.detail}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
