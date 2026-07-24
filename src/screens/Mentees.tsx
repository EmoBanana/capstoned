'use client'

import { useState } from 'react'
import {
  Page,
  Card,
  Badge,
  Button,
  ProgressBar,
  Eyebrow,
  ReliabilityScore,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Screen — Recruiter · Enrolled Mentees & their ongoing tasks        */
/* ------------------------------------------------------------------ */

const PROGRAM = 'Frontend Architecture Mentorship'
const WEEK = 8
const TOTAL_WEEKS = 12

type MenteeStatus = 'on-track' | 'ahead' | 'needs-support' | 'at-risk'
type TaskStatus = 'done' | 'in-progress' | 'to-do' | 'blocked'
type StatusTone = 'success' | 'gold' | 'slate' | 'danger'
type TaskTone = 'success' | 'gold' | 'neutral' | 'danger'
type FitTone = 'success' | 'gold' | 'danger'
type ActionKind = 'feedback' | 'message'

type Task = {
  id: string
  title: string
  status: TaskStatus
  due?: string
  note?: string
}

type Mentee = {
  id: string
  name: string
  initials: string
  year: number
  university: string
  fit: number
  reliability: number
  status: MenteeStatus
  tasks: Task[]
}

const STATUS_META: Record<
  MenteeStatus,
  { label: string; tone: StatusTone; dot: string }
> = {
  ahead: { label: 'Ahead', tone: 'success', dot: 'bg-success' },
  'on-track': { label: 'On track', tone: 'slate', dot: 'bg-slate' },
  'needs-support': { label: 'Needs support', tone: 'gold', dot: 'bg-gold' },
  'at-risk': { label: 'At risk', tone: 'danger', dot: 'bg-danger' },
}

const TASK_META: Record<TaskStatus, { label: string; tone: TaskTone }> = {
  done: { label: 'Done', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'gold' },
  'to-do': { label: 'To do', tone: 'neutral' },
  blocked: { label: 'Blocked', tone: 'danger' },
}

const MENTEES: Mentee[] = [
  {
    id: 'm1',
    name: 'John Doe',
    initials: 'JD',
    year: 3,
    university: 'Sunway University',
    fit: 88,
    reliability: 96,
    status: 'on-track',
    tasks: [
      {
        id: 't1',
        title: 'Build the responsive navigation shell',
        status: 'done',
        note: 'Clean component API; great use of the design tokens.',
      },
      {
        id: 't2',
        title: 'Lead the Week 8 sprint demo',
        status: 'done',
        note: 'Confident walkthrough, handled questions well.',
      },
      {
        id: 't3',
        title: 'Refactor data-fetching into reusable hooks',
        status: 'in-progress',
        due: 'Due in 3 days',
      },
      { id: 't4', title: 'Write tests for the rating module', status: 'to-do' },
      {
        id: 't5',
        title: 'Document the onboarding runbook',
        status: 'blocked',
        note: 'Waiting on infra access.',
      },
    ],
  },
  {
    id: 'm2',
    name: 'Daniel Lim Wei Jun',
    initials: 'DL',
    year: 3,
    university: 'Universiti Malaya',
    fit: 84,
    reliability: 93,
    status: 'on-track',
    tasks: [
      {
        id: 't1',
        title: 'Implement the form validation layer',
        status: 'done',
        note: 'Solid edge-case coverage on the schema.',
      },
      {
        id: 't2',
        title: 'Wire up the dashboard route guards',
        status: 'in-progress',
        due: 'Due in 4 days',
      },
      { id: 't3', title: 'Add keyboard navigation to the data table', status: 'to-do' },
      { id: 't4', title: "Review Priya's component PR", status: 'to-do' },
    ],
  },
  {
    id: 'm3',
    name: 'Arjun Subramaniam',
    initials: 'AS',
    year: 4,
    university: 'Monash University Malaysia',
    fit: 91,
    reliability: 99,
    status: 'ahead',
    tasks: [
      {
        id: 't1',
        title: 'Design the shared state architecture',
        status: 'done',
        note: 'Excellent write-up — circulated to the whole squad as reference.',
      },
      {
        id: 't2',
        title: 'Build the reusable toast + dialog primitives',
        status: 'done',
        note: 'Ahead of schedule and well documented.',
      },
      {
        id: 't3',
        title: 'Prototype the offline sync layer',
        status: 'in-progress',
        due: 'Due in 6 days',
      },
      { id: 't4', title: 'Pair with Tan Mei Xin on the layout system', status: 'to-do' },
    ],
  },
  {
    id: 'm4',
    name: 'Tan Mei Xin',
    initials: 'TM',
    year: 2,
    university: "Taylor's University",
    fit: 79,
    reliability: 84,
    status: 'needs-support',
    tasks: [
      {
        id: 't1',
        title: 'Set up the component library scaffolding',
        status: 'done',
        note: 'Good first pass — tidy folder structure.',
      },
      {
        id: 't2',
        title: 'Build the responsive card grid',
        status: 'in-progress',
        due: 'Due in 2 days',
        note: 'Check in mid-week — flag layout questions early.',
      },
      { id: 't3', title: 'Add empty + loading states to the grid', status: 'to-do' },
      {
        id: 't4',
        title: 'Resolve the flexbox overflow on mobile',
        status: 'blocked',
        note: 'Needs a pairing session with Arjun.',
      },
    ],
  },
  {
    id: 'm5',
    name: 'Chloe Wong Sze Min',
    initials: 'CW',
    year: 2,
    university: 'Sunway University',
    fit: 72,
    reliability: 68,
    status: 'at-risk',
    tasks: [
      {
        id: 't1',
        title: 'Build the profile settings form',
        status: 'done',
        note: "Completed after the deadline — let's plan the next one together.",
      },
      {
        id: 't2',
        title: 'Implement avatar upload validation',
        status: 'blocked',
        due: 'Overdue by 2 days',
        note: 'Missed check-in — reach out to unblock.',
      },
      { id: 't3', title: 'Add unit tests for the settings form', status: 'to-do' },
      { id: 't4', title: 'Sync with Wei Chen on the recovery plan', status: 'to-do' },
    ],
  },
  {
    id: 'm6',
    name: 'Priya Nair',
    initials: 'PN',
    year: 3,
    university: 'Universiti Malaya',
    fit: 81,
    reliability: 91,
    status: 'on-track',
    tasks: [
      {
        id: 't1',
        title: 'Build the notifications dropdown',
        status: 'done',
        note: 'Nice attention to focus management.',
      },
      {
        id: 't2',
        title: 'Integrate the search-as-you-type endpoint',
        status: 'in-progress',
        due: 'Due in 5 days',
      },
      { id: 't3', title: 'Add debounce + cancellation to search', status: 'to-do' },
      { id: 't4', title: 'Write the component usage docs', status: 'to-do' },
    ],
  },
]

/* ---- icons (inline, small) --------------------------------------- */

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 5.5h14v10H9l-4 3.5z" />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 4.5l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5L7.5 17.6l1-5L4.8 9.7l5-.6z" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M8.5 6.5C6 7.5 5 9.5 5 12v5.5h5.5V12H7.5c0-2 .5-3 2-3.5zM18 6.5c-2.5 1-3.5 3-3.5 5.5v5.5H20V12h-3c0-2 .5-3 2-3.5z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/* ---- small presentational helpers -------------------------------- */

function Monogram({
  initials,
  size = 'md',
}: {
  initials: string
  size?: 'md' | 'lg'
}) {
  const cls = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-paper font-bold tracking-tight text-ink ${cls}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

function fitTone(v: number): FitTone {
  return v >= 85 ? 'success' : v >= 70 ? 'gold' : 'danger'
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = TASK_META[status]
  return (
    <Badge tone={meta.tone}>
      {status === 'done' && <CheckIcon />}
      {status === 'in-progress' && <ClockIcon />}
      {status === 'blocked' && <BlockIcon />}
      {meta.label}
    </Badge>
  )
}

function MenteeRow({
  mentee,
  active,
  onSelect,
}: {
  mentee: Mentee
  active: boolean
  onSelect: () => void
}) {
  const meta = STATUS_META[mentee.status]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`block w-full border-b border-line px-4 py-4 text-left transition-colors duration-150 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-inset ${
        active ? 'border-l-2 border-l-ink bg-paper' : 'hover:bg-paper'
      }`}
    >
      <div className="flex items-start gap-3">
        <Monogram initials={mentee.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-ink">{mentee.name}</span>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
              aria-hidden="true"
            />
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-soft">
            Year {mentee.year} · {mentee.university}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              AI fit
            </span>
            <div className="flex-1">
              <ProgressBar value={mentee.fit} tone={fitTone(mentee.fit)} height="h-1" />
            </div>
            <span className="text-xs font-bold tabular-nums text-ink">{mentee.fit}%</span>
          </div>

          <div className="mt-2.5">
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>
      </div>
    </button>
  )
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="rounded-[2px] border border-line bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-sm font-semibold text-ink ${
            task.status === 'done' ? 'opacity-70' : ''
          }`}
        >
          {task.title}
        </p>
        <div className="shrink-0">
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {task.due && (
        <div className="mt-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.06em] tabular-nums ${
              task.status === 'blocked' ? 'text-danger-ink' : 'text-ink-faint'
            }`}
          >
            {task.due}
          </span>
        </div>
      )}

      {task.note && (
        <div className="mt-3 flex items-start gap-2 border-l-2 border-gold/40 bg-gold-soft/40 px-3 py-2">
          <span className="mt-0.5 text-gold">
            <QuoteIcon />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              Mentor note · Wei Chen
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{task.note}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function Mentees() {
  const [selectedId, setSelectedId] = useState<string>(MENTEES[0].id)
  const [action, setAction] = useState<ActionKind | null>(null)

  const selected: Mentee = MENTEES.find((m) => m.id === selectedId) ?? MENTEES[0]
  const meta = STATUS_META[selected.status]

  const firstName = selected.name.split(' ')[0]

  function selectMentee(id: string): void {
    setSelectedId(id)
    setAction(null)
  }

  const counts = {
    done: selected.tasks.filter((t) => t.status === 'done').length,
    active: selected.tasks.filter(
      (t) => t.status === 'in-progress' || t.status === 'to-do',
    ).length,
    blocked: selected.tasks.filter((t) => t.status === 'blocked').length,
  }

  const actionCopy: Record<ActionKind, string> = {
    feedback: `Feedback shared with ${firstName}. Wei Chen has been copied on the thread.`,
    message: `Message drafted to ${firstName}. Open your inbox to continue the conversation.`,
  }

  return (
    <Page>
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Recruiter · Mentees</Eyebrow>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Enrolled mentees
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            {PROGRAM} · Talentbank · Week {WEEK} of {TOTAL_WEEKS}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Cohort
            </div>
            <div className="text-xs font-medium text-ink-soft">
              {MENTEES.length} mentees enrolled
            </div>
          </div>
          <ReliabilityScore value={98} label="Company" />
        </div>
      </div>

      {/* ---- Master / detail ---- */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT — selectable list */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Cohort roster
            </h2>
            <span className="text-[11px] font-bold tabular-nums text-ink-faint">
              {MENTEES.length}
            </span>
          </div>
          <Card className="overflow-hidden">
            {MENTEES.map((m) => (
              <MenteeRow
                key={m.id}
                mentee={m}
                active={m.id === selectedId}
                onSelect={() => selectMentee(m.id)}
              />
            ))}
          </Card>
        </div>

        {/* RIGHT — detail panel */}
        <div>
          <Card className="p-6">
            {/* detail header */}
            <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <Monogram initials={selected.initials} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-ink">
                      {selected.name}
                    </h3>
                    <span
                      className={`h-2 w-2 rounded-full ${meta.dot}`}
                      aria-hidden="true"
                    />
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    Year {selected.year} · {selected.university}
                  </p>
                  <div className="mt-3">
                    <ReliabilityScore value={selected.reliability} />
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAction('message')}
                  aria-label={`Message ${selected.name}`}
                >
                  <MessageIcon />
                  Message
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAction('feedback')}
                  aria-label={`Send feedback to ${selected.name}`}
                >
                  <FeedbackIcon />
                  Send feedback
                </Button>
              </div>
            </div>

            {/* action banner */}
            {action && (
              <div
                role="status"
                className="mt-6 flex items-start justify-between gap-3 rounded-[2px] border border-success/30 bg-success-soft px-4 py-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-success-ink">
                    <CheckIcon />
                  </span>
                  <p className="text-sm font-medium text-success-ink">{actionCopy[action]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAction(null)}
                  aria-label="Dismiss notice"
                  className="shrink-0 rounded-[2px] p-1 text-success-ink/70 transition-colors hover:text-success-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* progress + fit row */}
            <div className="grid grid-cols-1 gap-5 border-b border-line py-6 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    Cohort week
                  </span>
                  <span className="text-sm font-bold tabular-nums text-ink">
                    Week {WEEK}{' '}
                    <span className="text-xs font-bold text-ink-faint">/ {TOTAL_WEEKS}</span>
                  </span>
                </div>
                <ProgressBar value={WEEK} max={TOTAL_WEEKS} tone="ink" />
                <p className="mt-2 text-xs text-ink-soft">Concurrent track · ~10 hrs / week</p>
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                    AI fit
                  </span>
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {selected.fit}%
                  </span>
                </div>
                <ProgressBar value={selected.fit} tone={fitTone(selected.fit)} />
                <p className="mt-2 text-xs text-ink-soft">Against the track competency model</p>
              </div>
            </div>

            {/* task summary chips */}
            <div className="flex flex-wrap items-center gap-2 pt-6">
              <Badge tone="success">
                <CheckIcon />
                {counts.done} done
              </Badge>
              <Badge tone="slate">{counts.active} active</Badge>
              {counts.blocked > 0 && (
                <Badge tone="danger">
                  <BlockIcon />
                  {counts.blocked} blocked
                </Badge>
              )}
            </div>

            {/* ongoing tasks */}
            <div className="mt-5">
              <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Ongoing tasks
              </h4>
              <div className="flex flex-col gap-3">
                {selected.tasks.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
