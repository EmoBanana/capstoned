'use client'

import { useEffect, useState } from 'react'
import {
  Page,
  Button,
  Badge,
  Card,
  Eyebrow,
  Field,
  Textarea,
  Select,
  StatBar,
  ReliabilityScore,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Screen — Student: My AI Assessment                                 */
/*  John's own view of his interim mentorship assessment.              */
/*  Same underlying scores as the recruiter report, framed as "you".   */
/* ------------------------------------------------------------------ */

type ScoreRow = {
  label: string
  value: number
  description: string
}

type Highlight = {
  title: string
  detail: string
}

type StepReason = {
  value: string
  label: string
}

const OVERALL_FIT = 88
const RELIABILITY = 96
const MIN_DETAIL = 12

const SCORES: ScoreRow[] = [
  {
    label: 'Task Velocity',
    value: 91,
    description:
      'You close tickets ahead of the weekly cadence — your nav-shell and demo work both landed early.',
  },
  {
    label: 'Feedback Receptivity',
    value: 94,
    description:
      'You fold review notes back into your work fast, and you ask clarifying questions before reworking.',
  },
  {
    label: 'Cultural Fit',
    value: 86,
    description:
      'You show up in stand-ups and guild channels, and you lean into the squad’s written-first async style.',
  },
  {
    label: 'Communication',
    value: 89,
    description:
      'Your weekly summaries are clear, and you flag blockers early — like the runbook infra access.',
  },
  {
    label: 'Deliverable Quality',
    value: 82,
    description:
      'You ship production-grade work; tightening test coverage on your modules is your clearest next lift.',
  },
]

const STRENGTHS: Highlight[] = [
  {
    title: 'You move fast and finish early',
    detail:
      'The responsive navigation shell shipped ahead of schedule with a clean component API your mentor called out.',
  },
  {
    title: 'You lead with confidence',
    detail:
      'You volunteered for the Week 8 sprint demo and handled the room’s questions well.',
  },
  {
    title: 'You act on feedback quickly',
    detail:
      'Review notes turn into commits within a day, and your PR review turnaround has been excellent lately.',
  },
]

const GROWTH: Highlight[] = [
  {
    title: 'Lift your test coverage to the bar',
    detail:
      'Your owned modules sit just under the 80% target — writing tests for the rating module is the fastest win.',
  },
  {
    title: 'Finish the onboarding runbook',
    detail:
      'It’s blocked on infra access right now. Once that clears, closing it out lifts your Deliverable Quality.',
  },
  {
    title: 'Keep your weekly updates unbroken',
    detail:
      'A short async note even on busy weeks keeps your Communication score strong heading into finals.',
  },
]

const STEP_REASONS: StepReason[] = [
  { value: '', label: 'Select a reason…' },
  { value: 'workload', label: 'University workload is too heavy right now' },
  { value: 'fit', label: 'The track isn’t the right fit for my goals' },
  { value: 'health', label: 'Health or personal circumstances' },
  { value: 'opportunity', label: 'Taking a different opportunity' },
  { value: 'other', label: 'Other (tell us more)' },
]

type Signal = 'none' | 'continue' | 'call' | 'stepped'

/* ------------------------------------------------------------------ */
/*  Small inline marks                                                 */

function CheckMark() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-success/40 bg-success-soft text-success-ink rounded-[2px]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        className="h-3 w-3"
      >
        <path d="M5 12.5l4.2 4.2L19 6" strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
    </span>
  )
}

function GrowMark() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-gold/40 bg-gold-soft text-gold-ink rounded-[2px]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        className="h-3 w-3"
      >
        <path d="M12 19V6M6 11l6-6 6 6" strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
    </span>
  )
}

function InfoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */

export default function StudentAssessment() {
  const [signal, setSignal] = useState<Signal>('none')
  const [stepOpen, setStepOpen] = useState<boolean>(false)
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState<string>('')

  const detailLen = detail.trim().length
  const detailReady = detailLen >= MIN_DETAIL
  const canConfirm = reason !== '' && detailReady

  // Close the step-away dialog on Escape.
  useEffect(() => {
    if (!stepOpen) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setStepOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepOpen])

  function openStep(): void {
    setReason('')
    setDetail('')
    setStepOpen(true)
  }

  function confirmStep(): void {
    if (!canConfirm) return
    setSignal('stepped')
    setStepOpen(false)
  }

  function clearBanner(): void {
    setSignal('none')
    setReason('')
    setDetail('')
  }

  return (
    <Page width="max-w-5xl">
      {/* ---------- Hero ---------- */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>Student · AI Assessment</Eyebrow>
          <Badge tone="gold">Interim · Week 8 of 12</Badge>
        </div>

        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Your interim assessment
              <br className="hidden sm:block" />{' '}
              <span className="font-bold text-ink-soft">Week 8 of 12.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Frontend Architecture Mentorship</span>{' '}
              with <span className="font-semibold text-ink">Talentbank</span> — mentored by{' '}
              <span className="font-semibold text-ink">Wei Chen</span>, Senior Frontend Engineer.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="slate">12-week Concurrent Track</Badge>
              <Badge tone="neutral">Mar – Jun 2026</Badge>
              <Badge tone="neutral">~10 hrs / week</Badge>
            </div>
          </div>

          {/* Dominant score */}
          <Card className="px-7 py-6 text-center sm:px-9">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
              Overall Fit
            </div>
            <div className="mt-1 text-6xl font-black leading-none tabular-nums text-ink sm:text-7xl">
              {OVERALL_FIT}
              <span className="align-top text-2xl text-gold">%</span>
            </div>
            <div className="mt-3 inline-flex">
              <Badge tone="success">Strong &amp; on track</Badge>
            </div>
          </Card>
        </div>

        <p className="mt-6 flex items-center gap-2 border-l-2 border-gold/40 bg-gold-soft/40 px-3 py-2 text-xs text-ink-soft rounded-[2px]">
          <InfoIcon className="h-4 w-4 flex-shrink-0 text-gold" />
          This is your view of the assessment — written for you, halfway through the track.
        </p>
      </header>

      {/* ---------- Data viz ---------- */}
      <Card className="p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-base font-bold tracking-tight text-ink">How you’re tracking</h2>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Across weeks 1 – 8
          </span>
        </div>
        <div className="space-y-5">
          {SCORES.map((s) => (
            <StatBar key={s.label} label={s.label} value={s.value} description={s.description} />
          ))}
        </div>
      </Card>

      {/* ---------- Strengths + Growth ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-ink">Strengths</h2>
            <Badge tone="success">Keep it up</Badge>
          </div>
          <ul className="space-y-4">
            {STRENGTHS.map((s) => (
              <li key={s.title} className="flex gap-3">
                <CheckMark />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-ink">Where to grow</h2>
            <Badge tone="gold">Next focus</Badge>
          </div>
          <ul className="space-y-4">
            {GROWTH.map((g) => (
              <li key={g.title} className="flex gap-3">
                <GrowMark />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{g.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{g.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------- AI narrative ---------- */}
      <Card className="mt-6 p-6">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <Eyebrow>A note from CapStoned AI</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              You’re eight weeks in and well ahead of where most mentees sit at the midpoint, John.
              Your <span className="font-semibold text-ink">91% Task Velocity</span> and{' '}
              <span className="font-semibold text-ink">94% Feedback Receptivity</span> stand out —
              you finish early and you turn review notes into better work fast. Wei’s feedback has
              been consistently warm, and leading the Week 8 demo showed real ownership. The one
              area with the most room to climb is{' '}
              <span className="font-semibold text-ink">Deliverable Quality at 82%</span>, which is
              mostly about test coverage on the modules you own. Knock out the rating-module tests
              and close the onboarding runbook once infra access clears, and you’ll head into the
              back third of the track in excellent shape.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 border-l border-line sm:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Your standing
            </span>
            <ReliabilityScore value={RELIABILITY} />
            <p className="max-w-[12rem] text-xs leading-relaxed text-ink-faint">
              You’ve made every weekly commitment so far — Wei and Talentbank can see you show up.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------- Forward options ---------- */}
      <div className="mt-8 border-t border-line pt-6">
        <Eyebrow>What’s next</Eyebrow>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          You’re halfway through. Let Talentbank and Wei know where your head’s at for the rest of the
          track.
        </p>

        {signal === 'stepped' ? (
          <div className="mt-4 flex flex-col gap-3 border border-slate/30 bg-slate-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between rounded-[2px]">
            <div className="flex items-start gap-3">
              <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate" />
              <p className="text-xs leading-relaxed text-slate-ink">
                <span className="font-bold">Request received.</span> Wei and the Talentbank team will
                reach out to talk through next steps before anything changes. Nothing has been
                finalised yet.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearBanner}>
              Undo
            </Button>
          </div>
        ) : signal !== 'none' ? (
          <div className="mt-4 flex flex-col gap-3 border border-success/30 bg-success-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between rounded-[2px]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-success/40 bg-white text-success-ink rounded-[2px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  className="h-3 w-3"
                >
                  <path d="M5 12.5l4.2 4.2L19 6" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </span>
              <p className="text-xs leading-relaxed text-success-ink">
                <span className="font-bold">
                  {signal === 'continue'
                    ? 'Interest to continue sent.'
                    : 'Feedback call requested.'}
                </span>{' '}
                {signal === 'continue'
                  ? 'Talentbank knows you’d like to carry on past Week 12. They’ll follow up as the next cohort opens.'
                  : 'Wei has been notified and will propose a few times to talk through your assessment.'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearBanner}>
              Undo
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => setSignal('continue')}>
                Signal interest to continue
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setSignal('call')}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-4 w-4"
                >
                  <path
                    d="M5 4h4l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"
                    strokeLinejoin="miter"
                  />
                </svg>
                Request a feedback call
              </Button>
            </div>
            <Button variant="ghost" size="md" onClick={openStep}>
              Step away from track
            </Button>
          </div>
        )}
      </div>

      {/* ---------- Step-away dialog ---------- */}
      {stepOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8"
          onClick={() => setStepOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="step-title"
            className="w-full max-w-md border border-line-strong bg-white rounded-[2px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                  Step away
                </span>
                <h3 id="step-title" className="mt-1 text-lg font-bold tracking-tight text-ink">
                  Thinking about stepping away?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStepOpen(false)}
                aria-label="Close dialog"
                className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center border border-line text-ink-soft hover:border-ink hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 rounded-[2px]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-4 w-4"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
                </svg>
              </button>
            </div>

            {/* body */}
            <div className="space-y-5 px-6 py-5">
              <p className="text-sm leading-relaxed text-ink-soft">
                This won’t end anything right away — it just lets Wei and the Talentbank team know so you
                can talk it through together. Share a little about what’s going on.
              </p>

              <Field label="What’s prompting this?" required htmlFor="step-reason">
                <Select id="step-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {STEP_REASONS.map((r) => (
                    <option key={r.value || 'none'} value={r.value} disabled={r.value === ''}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="A little more context"
                required
                htmlFor="step-detail"
                hint={
                  detailReady ? (
                    <span className="text-success-ink">Looks good</span>
                  ) : (
                    `${detailLen}/${MIN_DETAIL} min`
                  )
                }
              >
                <Textarea
                  id="step-detail"
                  rows={3}
                  placeholder="A sentence or two helps your mentor support you the right way."
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
              </Field>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <Button variant="secondary" onClick={() => setStepOpen(false)}>
                Keep going
              </Button>
              <Button variant="danger" onClick={confirmStep} disabled={!canConfirm}>
                Send to my mentor
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
