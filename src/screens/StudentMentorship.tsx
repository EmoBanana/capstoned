import { useState } from 'react'
import {
  Page,
  Button,
  Badge,
  Card,
  ProgressBar,
  Eyebrow,
  ReliabilityScore,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Student — My Mentorship                                            */
/*  John's ongoing mentorship hub: progress, tasks, mentor feedback.   */
/* ------------------------------------------------------------------ */

type TaskStatus = 'done' | 'submitted' | 'in-progress' | 'todo' | 'blocked'

type Task = {
  id: string
  title: string
  status: TaskStatus
  due?: string
  /** Mentor note shown on completed work. */
  mentorNote?: string
  /** Reason shown on blocked work. */
  blockReason?: string
}

type Feedback = {
  id: string
  initials: string
  author: string
  role: string
  when: string
  body: string
}

type StatusMeta = {
  label: string
  tone: 'gold' | 'slate' | 'success' | 'danger' | 'neutral'
  dot: string
}

type BarTone = 'ink' | 'gold' | 'slate' | 'success' | 'danger'

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Build the responsive navigation shell',
    status: 'done',
    mentorNote: 'Clean component API; great use of the design tokens.',
  },
  {
    id: 't2',
    title: 'Lead the Week 8 sprint demo',
    status: 'done',
    mentorNote: 'Confident walkthrough, handled questions well.',
  },
  {
    id: 't3',
    title: 'Refactor data-fetching into reusable hooks',
    status: 'in-progress',
    due: 'Due in 3 days',
  },
  {
    id: 't4',
    title: 'Write tests for the rating module',
    status: 'todo',
  },
  {
    id: 't5',
    title: 'Document the onboarding runbook',
    status: 'blocked',
    blockReason: 'Waiting on infra access.',
  },
]

const FEEDBACK: Feedback[] = [
  {
    id: 'f1',
    initials: 'WC',
    author: 'Wei Chen',
    role: 'Senior Frontend Engineer',
    when: '2 days ago',
    body: 'PR review turnaround has been excellent — keep flagging blockers early.',
  },
  {
    id: 'f2',
    initials: 'WC',
    author: 'Wei Chen',
    role: 'Senior Frontend Engineer',
    when: '1 week ago',
    body: 'Great initiative taking the demo. Next: tighten test coverage on owned modules.',
  },
  {
    id: 'f3',
    initials: 'WC',
    author: 'Wei Chen',
    role: 'Senior Frontend Engineer',
    when: 'Week 1',
    body: 'Welcome to the squad — start with the nav shell ticket.',
  },
]

const STATUS_META: Record<TaskStatus, StatusMeta> = {
  done: { label: 'Done', tone: 'success', dot: 'bg-success' },
  submitted: { label: 'Submitted', tone: 'slate', dot: 'bg-slate' },
  'in-progress': { label: 'In progress', tone: 'gold', dot: 'bg-gold' },
  todo: { label: 'To do', tone: 'neutral', dot: 'bg-ink/30' },
  blocked: { label: 'Blocked', tone: 'danger', dot: 'bg-danger' },
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  'in-progress': 0,
  submitted: 1,
  todo: 2,
  blocked: 3,
  done: 4,
}

type SignalStat = { label: string; value: number }

const AI_SIGNALS: SignalStat[] = [
  { label: 'Task Velocity', value: 91 },
  { label: 'Feedback Receptivity', value: 94 },
  { label: 'Communication', value: 89 },
  { label: 'Cultural Fit', value: 86 },
  { label: 'Deliverable Quality', value: 82 },
]

/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function Monogram({ initials }: { initials: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold tracking-tight text-ink">
      {initials}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StatBlock({
  label,
  value,
  suffix,
  bar,
}: {
  label: string
  value: string
  suffix?: string
  bar?: { value: number; max: number; tone: BarTone }
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-black tracking-tight tabular-nums text-ink">
        {value}
        {suffix && <span className="ml-1 text-sm font-semibold text-ink-soft">{suffix}</span>}
      </p>
      {bar && (
        <div className="mt-3">
          <ProgressBar value={bar.value} max={bar.max} tone={bar.tone} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  onSubmit,
}: {
  task: Task
  onSubmit: (id: string) => void
}) {
  const meta = STATUS_META[task.status]
  const actionable = task.status === 'todo' || task.status === 'in-progress'
  const dimmed = task.status === 'done' || task.status === 'submitted'

  return (
    <div className="border-t border-line px-5 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
            aria-hidden="true"
          />
          <div>
            <p
              className={`text-sm font-semibold leading-snug ${
                dimmed ? 'text-ink-soft' : 'text-ink'
              }`}
            >
              {task.title}
            </p>
            {task.due && task.status !== 'submitted' && (
              <p className="mt-1 text-xs font-medium text-gold">{task.due}</p>
            )}
            {task.status === 'blocked' && task.blockReason && (
              <p className="mt-1 text-xs text-danger">{task.blockReason}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={meta.tone}>
            {task.status === 'done' && <CheckIcon />}
            {meta.label}
          </Badge>
        </div>
      </div>

      {task.status === 'done' && task.mentorNote && (
        <div className="ml-5 mt-3 rounded-[2px] border-l-2 border-success/40 bg-success-soft/40 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-success-ink">
            Mentor note · Wei Chen
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{task.mentorNote}</p>
        </div>
      )}

      {task.status === 'submitted' && (
        <div className="ml-5 mt-3 rounded-[2px] border-l-2 border-slate/40 bg-slate-soft/50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-ink">
            Awaiting mentor review
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Deliverable sent to Wei Chen. You will see his note here once it is reviewed.
          </p>
        </div>
      )}

      {actionable && (
        <div className="ml-5 mt-3">
          <Button
            size="sm"
            variant={task.status === 'in-progress' ? 'primary' : 'secondary'}
            onClick={() => onSubmit(task.id)}
            aria-label={`Submit deliverable for ${task.title}`}
          >
            {task.status === 'in-progress' ? 'Submit deliverable' : 'Mark submitted'}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function SignalRow({ label, value }: SignalStat) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-ink-soft">{label}</span>
        <span className="text-xs font-bold tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1">
        <ProgressBar value={value} tone="slate" height="h-1" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function StudentMentorship({
  onNavigate,
}: {
  onNavigate?: (id: string) => void
}) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [banner, setBanner] = useState<string | null>(null)

  const handleSubmit = (id: string): void => {
    let submittedTitle = ''
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        submittedTitle = t.title
        return { ...t, status: 'submitted', due: undefined }
      })
    )
    if (submittedTitle) {
      setBanner(`“${submittedTitle}” sent to Wei Chen for review.`)
    }
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const submitted = tasks.filter((t) => t.status === 'submitted').length
  const total = tasks.length
  const cleared = done + submitted

  const sortedTasks = [...tasks].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  )

  return (
    <Page>
      {/* Header */}
      <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Student · My Mentorship</Eyebrow>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            Frontend Architecture Mentorship
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Talentbank · Mentor:{' '}
            <span className="font-semibold text-ink">Wei Chen</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">Week 8 of 12</Badge>
          <Badge tone="slate">Concurrent · ~10 hrs/wk</Badge>
          <ReliabilityScore value={96} />
        </div>
      </header>

      {/* Progress strip */}
      <Card className="mt-7">
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatBlock
            label="Track progress"
            value="Week 8"
            suffix="of 12"
            bar={{ value: 8, max: 12, tone: 'gold' }}
          />
          <StatBlock
            label="Hours committed"
            value="78"
            suffix="/ 120 hrs"
            bar={{ value: 78, max: 120, tone: 'slate' }}
          />
          <StatBlock
            label="Milestones"
            value="4"
            suffix="/ 6 done"
            bar={{ value: 4, max: 6, tone: 'success' }}
          />
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Current standing
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              <span className="text-base font-bold text-ink">On track</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Ahead of cadence on owned modules. Test coverage is the next focus.
            </p>
          </div>
        </div>
      </Card>

      {/* Action banner */}
      {banner && (
        <div
          className="mt-5 flex items-start justify-between gap-4 rounded-[2px] border border-success/30 bg-success-soft px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-success-ink">
              <CheckIcon />
            </span>
            <p className="text-sm font-medium text-success-ink">{banner}</p>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="shrink-0 rounded-[2px] text-success-ink/70 transition-colors hover:text-success-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-success/40"
            aria-label="Dismiss notification"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Two-column body */}
      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-3">
        {/* MAIN — Tasks & tracks */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <Eyebrow>This Track</Eyebrow>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">
                Tasks &amp; tracks
              </h2>
            </div>
            <span className="text-sm font-bold tabular-nums text-ink-soft">
              {done}/{total} reviewed
            </span>
          </div>

          <Card>
            {sortedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onSubmit={handleSubmit} />
            ))}
          </Card>

          <p className="mt-3 text-xs text-ink-faint">
            {done} reviewed · {submitted} awaiting review · {total - cleared} open
          </p>
        </section>

        {/* SIDE — Mentor feedback + AI signal */}
        <aside className="flex flex-col gap-7">
          <div>
            <div className="mb-3">
              <Eyebrow>From Your Mentor</Eyebrow>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">
                Mentor feedback
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {FEEDBACK.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Monogram initials={f.initials} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{f.author}</p>
                      <p className="truncate text-xs text-ink-faint">{f.role}</p>
                    </div>
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-ink-faint">
                      {f.when}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="mt-0.5 shrink-0 text-slate">
                      <QuoteIcon />
                    </span>
                    <p className="text-sm leading-relaxed text-ink-soft">{f.body}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* AI signal mini-card */}
          <Card className="bg-paper p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gold">
                  <SparkIcon />
                </span>
                <Eyebrow className="text-ink-faint">Current AI Signal</Eyebrow>
              </div>
              <Badge tone="gold">88% fit</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Strong feedback receptivity and task velocity this track. Deliverable
              quality is the area with the most headroom.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {AI_SIGNALS.map((s) => (
                <SignalRow key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => onNavigate?.('assessment')}
                className="rounded-[2px] text-xs font-semibold text-slate transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                View full assessment →
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}
