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
/*  Screen 4 — The Post-Track AI Match Report                          */
/* ------------------------------------------------------------------ */

type ScoreRow = {
  label: string
  value: number
  description: string
}

type CheckpointStatus = 'complete' | 'partial'

type Checkpoint = {
  id: string
  title: string
  detail: string
  status: CheckpointStatus
}

type TerminationReason = {
  value: string
  label: string
  weak: boolean
}

type TerminationOutcome = 'active' | 'justified' | 'weak'

const SCORES: ScoreRow[] = [
  {
    label: 'Task Velocity',
    value: 91,
    description:
      'Closed 34 of 37 assigned tickets within sprint windows. Consistently ahead of the day-one cadence target.',
  },
  {
    label: 'Feedback Receptivity',
    value: 94,
    description:
      'Incorporated PR review notes within 24h on 9 of 10 occasions. Asked clarifying questions before reworking.',
  },
  {
    label: 'Cultural Fit',
    value: 86,
    description:
      'Active in stand-ups and guild channels. Aligned well with the squad ritual of written-first async decisions.',
  },
  {
    label: 'Communication',
    value: 89,
    description:
      'Clear weekly summaries and proactive blocker flags. One missed update during the mid-track exam period.',
  },
  {
    label: 'Deliverable Quality',
    value: 82,
    description:
      'Shipped production-grade work with test coverage. A few edge-case regressions caught in QA, all resolved.',
  },
]

const OVERALL_FIT = 88

const CHECKPOINTS: Checkpoint[] = [
  {
    id: 'cp1',
    title: 'Ship first reviewed PR to staging',
    detail: 'Week 2 target · merged Week 1',
    status: 'complete',
  },
  {
    id: 'cp2',
    title: 'Own a feature end-to-end',
    detail: 'Ratings filter on the partner dashboard',
    status: 'complete',
  },
  {
    id: 'cp3',
    title: 'Lead one squad demo',
    detail: 'Presented at Week 8 sprint review',
    status: 'complete',
  },
  {
    id: 'cp4',
    title: 'Reach 80% test coverage on owned module',
    detail: 'Landed at 74% — short of the day-one bar',
    status: 'partial',
  },
  {
    id: 'cp5',
    title: 'Pair with 3 different engineers',
    detail: 'Paired with backend, mobile, platform',
    status: 'complete',
  },
  {
    id: 'cp6',
    title: 'Document the onboarding runbook',
    detail: 'Draft complete; final review pending',
    status: 'partial',
  },
]

const TERMINATION_REASONS: TerminationReason[] = [
  { value: '', label: 'Select a reason…', weak: true },
  { value: 'misconduct', label: 'Conduct / integrity breach', weak: false },
  { value: 'no-show', label: 'Repeated unexcused absence (SLA breach)', weak: false },
  { value: 'capability', label: 'Sustained capability gap after support', weak: false },
  { value: 'headcount', label: 'Internal headcount / budget change', weak: true },
  { value: 'preference', label: 'Changed our mind on the candidate', weak: true },
  { value: 'other', label: 'Other (explain in detail)', weak: true },
]

const CURRENT_RELIABILITY = 98
const WEAK_RELIABILITY = 84 // crosses below the 90 "healthy" threshold — a visible penalty
const JUSTIFIED_RELIABILITY = 96
const MIN_DETAIL = 12

type Decision = 'none' | 'extended' | 'offer'

/* ------------------------------------------------------------------ */

function CheckMark() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-success/40 bg-success-soft text-success-ink rounded-[2px]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-3 w-3">
        <path d="M5 12.5l4.2 4.2L19 6" strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
    </span>
  )
}

function PartialMark() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-gold/40 bg-gold-soft text-gold-ink rounded-[2px]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-3 w-3">
        <path d="M6 12h12" strokeLinecap="square" />
      </svg>
    </span>
  )
}

/* ------------------------------------------------------------------ */

export default function MatchReport() {
  const [terminateOpen, setTerminateOpen] = useState<boolean>(false)
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState<string>('')
  const [outcome, setOutcome] = useState<TerminationOutcome>('active')
  const [decision, setDecision] = useState<Decision>('none')

  const selectedReason = TERMINATION_REASONS.find((r) => r.value === reason)
  const isWeak = reason === '' || (selectedReason?.weak ?? true)
  const detailLen = detail.trim().length
  const canConfirm = reason !== '' && detailLen >= MIN_DETAIL

  const terminated = outcome !== 'active'
  const projectedReliability = isWeak ? WEAK_RELIABILITY : JUSTIFIED_RELIABILITY
  const liveReliability =
    outcome === 'weak'
      ? WEAK_RELIABILITY
      : outcome === 'justified'
        ? JUSTIFIED_RELIABILITY
        : CURRENT_RELIABILITY

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!terminateOpen) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setTerminateOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [terminateOpen])

  function closeModal(): void {
    setTerminateOpen(false)
  }

  function openTerminate(): void {
    setReason('')
    setDetail('')
    setTerminateOpen(true)
  }

  function handleConfirm(): void {
    if (!canConfirm) return
    setDecision('none')
    setOutcome(isWeak ? 'weak' : 'justified')
    setTerminateOpen(false)
  }

  function undoTermination(): void {
    setOutcome('active')
    setReason('')
    setDetail('')
  }

  const completeCount = CHECKPOINTS.filter((c) => c.status === 'complete').length

  return (
    <Page width="max-w-5xl">
      {/* ---------- Hero ---------- */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>AI Assessment · Week 8 of 12</Eyebrow>
          {terminated && <Badge tone="danger">Track Terminated</Badge>}
        </div>

        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Mentorship on track.
              <br className="hidden sm:block" />{' '}
              <span className="font-bold text-ink-soft">AI Assessment:</span>{' '}
              <span className="tabular-nums text-ink">{OVERALL_FIT}% Match.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">John Doe</span> · Software
              Engineering, Sunway University — concurrent track with{' '}
              <span className="font-semibold text-ink">Talentbank</span> (Web Platform
              squad).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="slate">12-week Concurrent Track</Badge>
              <Badge tone="neutral">Mar – Jun 2026</Badge>
              <Badge tone="success">Weekly commitment met · 8 / 8 wks so far</Badge>
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
              <Badge tone="success">Strong Match</Badge>
            </div>
          </Card>
        </div>

        <p className="mt-6 flex items-center gap-2 border-l-2 border-gold/40 bg-gold-soft/40 px-3 py-2 text-xs text-ink-soft rounded-[2px]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-4 w-4 flex-shrink-0 text-gold"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          This assessment is generated by CapStoned AI and shared with{' '}
          <span className="font-semibold text-ink">both the mentee and your team</span>.
        </p>
      </header>

      {/* ---------- Data viz ---------- */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Score bars */}
        <Card className="p-6 lg:col-span-3">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-base font-bold tracking-tight text-ink">Competency Signals</h2>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Observed over 8 weeks
            </span>
          </div>
          <div className="space-y-5">
            {SCORES.map((s) => (
              <StatBar key={s.label} label={s.label} value={s.value} description={s.description} />
            ))}
          </div>
        </Card>

        {/* Checkpoint completion */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-base font-bold tracking-tight text-ink">Day-One Checkpoints</h2>
            <span className="text-sm font-bold tabular-nums text-ink">
              {completeCount}
              <span className="text-ink-faint">/{CHECKPOINTS.length}</span>
            </span>
          </div>
          <ul className="space-y-4">
            {CHECKPOINTS.map((cp) => (
              <li key={cp.id} className="flex gap-3">
                {cp.status === 'complete' ? <CheckMark /> : <PartialMark />}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{cp.title}</p>
                    {cp.status === 'partial' && <Badge tone="gold">Partial</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{cp.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------- AI narrative ---------- */}
      <Card className="mt-6 p-6">
        <Eyebrow>AI Narrative Summary</Eyebrow>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Against the six checkpoints set on day one, John cleared the engineering-execution bar
          decisively — shipping his first reviewed PR a full week early and owning the
          ratings filter end-to-end, which drives his{' '}
          <span className="font-semibold text-ink">91% Task Velocity</span> and{' '}
          <span className="font-semibold text-ink">94% Feedback Receptivity</span>. Cultural and
          communication signals are strong and consistent, with only a single missed weekly update
          during his university exam period. The two partial checkpoints —{' '}
          <span className="font-semibold text-ink">test coverage at 74% vs. the 80% target</span>{' '}
          and the onboarding runbook awaiting final review — are the same areas pulling Deliverable
          Quality to 82%. Neither indicates a capability ceiling; both look like calendar pressure
          around midterms. Net assessment: a high-confidence prospect already operating at a
          junior-engineer level.
        </p>
      </Card>

      {/* ---------- Actions ---------- */}
      <div className="mt-8 border-t border-line pt-6">
        {terminated ? (
          <div className="flex flex-col gap-3 border border-danger/30 bg-danger-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between rounded-[2px]">
            <div className="flex items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              </svg>
              <p className="text-xs leading-relaxed text-danger-ink">
                <span className="font-bold">Track terminated.</span> Both the mentee and your team
                have been notified
                {outcome === 'weak' ? ', recorded as a weak justification.' : ', recorded as a justified decision.'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={undoTermination}>
              Undo
            </Button>
          </div>
        ) : decision !== 'none' ? (
          <div className="flex flex-col gap-3 border border-success/30 bg-success-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between rounded-[2px]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border border-success/40 bg-white text-success-ink rounded-[2px]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-3 w-3">
                  <path d="M5 12.5l4.2 4.2L19 6" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </span>
              <p className="text-xs leading-relaxed text-success-ink">
                <span className="font-bold">
                  {decision === 'extended'
                    ? 'Mentorship extension offered.'
                    : 'Early job offer triggered.'}
                </span>{' '}
                {decision === 'extended'
                  ? 'John has been invited to continue for another cycle. Awaiting his acceptance.'
                  : 'A full-time graduate offer has been sent for review. Both parties are notified.'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDecision('none')}>
              Undo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => setDecision('extended')}>
                Extend Mentorship Offer
              </Button>
              <Button variant="danger" size="lg" onClick={openTerminate}>
                Terminate Track
              </Button>
            </div>
            <Button variant="ghost" size="md" onClick={() => setDecision('offer')}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="miter" />
              </svg>
              Trigger Early Job Offer
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ReliabilityScore value={liveReliability} />
          <span className="text-xs text-ink-faint">
            Your decisions on this track are visible on your recruiter profile.
          </span>
        </div>
      </div>

      {/* ---------- Terminate modal ---------- */}
      {terminateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terminate-title"
            className="w-full max-w-md border border-line-strong bg-white rounded-[2px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-danger">
                  Terminate Track
                </span>
                <h3 id="terminate-title" className="mt-1 text-lg font-bold tracking-tight text-ink">
                  End the mentorship early
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
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
              <div className="flex gap-3 border border-danger/30 bg-danger-soft px-3 py-3 rounded-[2px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger"
                >
                  <path d="M12 3l9 16H3l9-16z" strokeLinejoin="miter" />
                  <path d="M12 9v5M12 17h.01" strokeLinecap="round" />
                </svg>
                <p className="text-xs leading-relaxed text-danger-ink">
                  <span className="font-bold">
                    Weak reasons will negatively impact your Reliability Score.
                  </span>{' '}
                  Both parties are notified, and the student may dispute the outcome.
                </p>
              </div>

              <Field
                label="Termination reason"
                required
                htmlFor="terminate-reason"
                hint="Visible to the student"
              >
                <Select
                  id="terminate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {TERMINATION_REASONS.map((r) => (
                    <option key={r.value || 'none'} value={r.value} disabled={r.value === ''}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Supporting detail"
                required
                htmlFor="terminate-detail"
                hint={`${Math.min(detailLen, MIN_DETAIL)}/${MIN_DETAIL} min`}
              >
                <Textarea
                  id="terminate-detail"
                  rows={3}
                  placeholder="Cite specific, evidenced events. Vague justifications carry the largest score penalty."
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
              </Field>

              {/* Reliability impact */}
              <div className="border border-line bg-paper px-4 py-3 rounded-[2px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Reliability impact
                  </span>
                  <Badge tone={isWeak ? 'danger' : 'slate'}>
                    {isWeak ? 'High penalty' : 'Justified'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-ink">
                    {liveReliability}%
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-5 w-5 text-ink-faint"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" strokeLinejoin="miter" />
                  </svg>
                  <span
                    className={`text-2xl font-black tabular-nums ${isWeak ? 'text-danger' : 'text-ink'}`}
                  >
                    {projectedReliability}%
                  </span>
                  <span className="text-xs text-ink-soft">
                    projected after {isWeak ? 'a weak' : 'a justified'} termination
                  </span>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirm} disabled={!canConfirm}>
                Confirm Termination
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
