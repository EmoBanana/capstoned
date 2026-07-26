'use client'

import { Eyebrow, Badge, ProgressBar, ReliabilityScore } from '../ui'
import { Cta } from './Cta'
import { CheckIcon } from './icons'

/* ------------------------------------------------------------------ */
/*  Hero — the thesis: "Experience careers before you commit."         */
/*  Masked headline lines slide up (yPercent) from behind clean edges. */
/*  Right column is a tasteful "track preview" that shows the product  */
/*  narrative — a milestone-driven mentorship track — at a glance.     */
/* ------------------------------------------------------------------ */

function HeadlineLine({ children }: { children: React.ReactNode }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span data-hero-line className="block">
        {children}
      </span>
    </span>
  )
}

const PREVIEW_MILESTONES: { week: string; title: string; done: boolean }[] = [
  { week: 'Wk 1', title: 'Onboarding & real brief', done: true },
  { week: 'Wk 3', title: 'Ship first deliverable', done: true },
  { week: 'Wk 6', title: 'Mentor feedback loop', done: false },
]

export function Hero({
  onGetStarted,
  onExplore,
}: {
  onGetStarted?: () => void
  onExplore?: () => void
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-cream">
      {/* subtle paper panel behind the visual side, desktop only */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-paper lg:block"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-28">
        {/* Left — message */}
        <div>
          <div data-hero-eyebrow>
            <Eyebrow>Career OS · Talent cultivation</Eyebrow>
          </div>

          <h1 className="mt-5 text-[2.6rem] font-black leading-[1.02] tracking-tight text-ink sm:text-6xl">
            <HeadlineLine>Experience</HeadlineLine>
            <HeadlineLine>
              <span className="text-gold">careers</span> before
            </HeadlineLine>
            <HeadlineLine>you commit.</HeadlineLine>
          </h1>

          <p
            data-hero-sub
            className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            Most people choose a path under pressure, then discover it never fit.
            CapStoned lets you live inside real companies through milestone-driven
            mentorship tracks — real projects, real mentors, continuous feedback —
            so you decide with evidence, not guesswork.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta
              variant="primary"
              label="Start your work-style quiz"
              onClick={onGetStarted}
              dataAttr="data-hero-cta"
            />
            <Cta
              variant="secondary"
              label="Explore tracks"
              onClick={onExplore}
              dataAttr="data-hero-cta"
            />
          </div>

          <p
            data-hero-cta
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint"
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-success" /> Voluntary on both sides
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-success" /> Not a job board
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-success" /> Ages 15–65
            </span>
          </p>
        </div>

        {/* Right — track preview visual */}
        <div data-hero-visual className="relative">
          <div className="relative rounded-[2px] border border-line-strong bg-white p-6 sm:p-7">
            {/* header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  Mentorship track
                </p>
                <p className="mt-1 text-lg font-bold leading-snug tracking-tight text-ink">
                  Product Analytics Sprint
                </p>
                <p className="text-sm text-ink-soft">Talentbank · 6 weeks · Moderate</p>
              </div>
              <ReliabilityScore value={94} label="Rel" className="shrink-0" />
            </div>

            {/* animal fit */}
            <div className="mt-5 flex items-center justify-between gap-3 border border-line bg-cream px-4 py-3 rounded-[2px]">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">
                  🦉
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">The Analyst</p>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                    Your work-style
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tabular-nums leading-none text-ink">92%</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">Match</p>
              </div>
            </div>

            {/* milestones */}
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Milestones
                </span>
                <span className="text-xs font-bold tabular-nums text-ink">2 / 3</span>
              </div>
              <ProgressBar value={2} max={3} tone="gold" />
              <ul className="mt-4 space-y-2.5">
                {PREVIEW_MILESTONES.map((m) => (
                  <li key={m.week} className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border ${
                        m.done
                          ? 'border-success bg-success text-white'
                          : 'border-line-strong bg-white text-ink-faint'
                      }`}
                    >
                      {m.done ? (
                        <CheckIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                      )}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      {m.week}
                    </span>
                    <span
                      className={`text-sm ${
                        m.done ? 'text-ink-soft line-through decoration-line-strong' : 'text-ink'
                      }`}
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* footer */}
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Badge tone="slate">Real project</Badge>
              <Badge tone="gold">Mentor feedback</Badge>
              <Badge tone="neutral">Low-stakes</Badge>
            </div>
          </div>

          {/* floating evidence chip */}
          <div className="absolute -bottom-4 -left-4 hidden rounded-[2px] border border-line-strong bg-ink px-4 py-3 text-cream sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cream/60">
              Decision signal
            </p>
            <p className="mt-0.5 text-sm font-semibold">Evidence, not a hunch.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
