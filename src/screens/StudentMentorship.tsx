'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow } from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Student · My Mentorship — live Convex enrollment: progress, tasks   */
/*  with a real submit-deliverable flow, and mentor feedback.           */
/* ------------------------------------------------------------------ */

type TaskStatus = 'todo' | 'in-progress' | 'submitted' | 'done' | 'blocked'

const TASK_META: Record<TaskStatus, { label: string; tone: 'success' | 'slate' | 'gold' | 'neutral' | 'danger'; dot: string }> = {
  done: { label: 'Done', tone: 'success', dot: 'bg-success' },
  submitted: { label: 'Submitted', tone: 'slate', dot: 'bg-slate' },
  'in-progress': { label: 'In progress', tone: 'gold', dot: 'bg-gold' },
  todo: { label: 'To do', tone: 'neutral', dot: 'bg-ink/30' },
  blocked: { label: 'Blocked', tone: 'danger', dot: 'bg-danger' },
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function StatBlock({ label, value, suffix, bar }: { label: string; value: string; suffix?: string; bar?: { value: number; max: number; tone: 'ink' | 'gold' | 'slate' | 'success' } }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
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

export default function StudentMentorship({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const data = useQuery(api.enrollments.myMentorship)
  const submitTask = useMutation(api.tasks.submit)
  const sponsorship = useQuery(api.sponsorships.mine)
  const respondSponsor = useMutation(api.sponsorships.respond)
  const [banner, setBanner] = useState<string | null>(null)

  if (data === undefined) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading your mentorship…</p>
        </Card>
      </Page>
    )
  }
  if (data === null) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">You're not in a mentorship track yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Apply to a track in the Marketplace to get started.</p>
        </Card>
      </Page>
    )
  }

  const tasks = data.tasks
  const done = tasks.filter((t) => t.status === 'done').length
  const submitted = tasks.filter((t) => t.status === 'submitted').length
  const total = tasks.length
  const hoursTarget = data.totalWeeks * 10

  const onSubmit = (id: string, title: string) => {
    void submitTask({ taskId: id as Id<'tasks'> })
    setBanner(`“${title}” sent to ${data.mentorName} for review.`)
  }

  return (
    <Page>
      <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Student · My Mentorship</Eyebrow>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">{data.trackTitle}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {data.org} · Mentor: <span className="font-semibold text-ink">{data.mentorName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">Week {data.weekProgress} of {data.totalWeeks}</Badge>
          <Badge tone={data.status === 'at-risk' ? 'danger' : data.status === 'needs-support' ? 'gold' : 'success'}>
            {data.status.replace('-', ' ')}
          </Badge>
        </div>
      </header>

      <Card className="mt-7">
        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatBlock label="Track progress" value={`Week ${data.weekProgress}`} suffix={`of ${data.totalWeeks}`} bar={{ value: data.weekProgress, max: data.totalWeeks, tone: 'gold' }} />
          <StatBlock label="Hours committed" value={String(data.hoursCommitted)} suffix={`/ ${hoursTarget} hrs`} bar={{ value: data.hoursCommitted, max: hoursTarget, tone: 'slate' }} />
          <StatBlock label="Tasks cleared" value={String(done)} suffix={`/ ${total}`} bar={{ value: done, max: Math.max(total, 1), tone: 'success' }} />
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Current AI signal</p>
            <p className="mt-1.5 text-2xl font-black tabular-nums text-ink">{data.fit}%</p>
            <button
              type="button"
              onClick={() => onNavigate?.('assessment')}
              className="mt-2 rounded-[2px] text-xs font-semibold text-slate transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              View full assessment →
            </button>
          </div>
        </div>
      </Card>

      {sponsorship && sponsorship.status === 'offered' && (
        <Card className="mt-5 border-gold/40 bg-gold-soft/40 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Eyebrow>Micro-bond offer</Eyebrow>
                <Badge tone="gold">New</Badge>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink">
                <span className="font-bold">{sponsorship.orgName}</span> offers you a{' '}
                <span className="font-bold tabular-nums">RM {sponsorship.amount.toLocaleString()}</span>{' '}
                {sponsorship.title} — in exchange for a {sponsorship.commitmentMonths}-month{' '}
                {sponsorship.commitmentKind === 'contract' ? 'contract' : 'priority-hiring commitment'} once the track completes.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => void respondSponsor({ sponsorshipId: sponsorship.id as Id<'sponsorships'>, status: 'accepted' })}>
                Accept offer
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void respondSponsor({ sponsorshipId: sponsorship.id as Id<'sponsorships'>, status: 'declined' })}>
                Decline
              </Button>
            </div>
          </div>
        </Card>
      )}
      {sponsorship && sponsorship.status === 'accepted' && (
        <Card className="mt-5 border-success/30 bg-success-soft p-4">
          <p className="text-sm font-medium text-success-ink">
            ✓ You accepted {sponsorship.orgName}'s micro-bond (RM {sponsorship.amount.toLocaleString()},{' '}
            {sponsorship.commitmentMonths}-month {sponsorship.commitmentKind}).
          </p>
        </Card>
      )}

      {banner && (
        <div className="mt-5 flex items-start justify-between gap-4 rounded-[2px] border border-success/30 bg-success-soft px-4 py-3" role="status" aria-live="polite">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-success-ink"><CheckIcon /></span>
            <p className="text-sm font-medium text-success-ink">{banner}</p>
          </div>
          <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss notification" className="shrink-0 rounded-[2px] text-success-ink/70 transition-colors hover:text-success-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-success/40">
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <Eyebrow>This Track</Eyebrow>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">Tasks &amp; tracks</h2>
            </div>
            <span className="text-sm font-bold tabular-nums text-ink-soft">{done}/{total} reviewed</span>
          </div>

          <Card>
            {tasks.map((task) => {
              const meta = TASK_META[task.status as TaskStatus]
              const actionable = task.status === 'todo' || task.status === 'in-progress'
              const dimmed = task.status === 'done' || task.status === 'submitted'
              return (
                <div key={task.id} className="border-t border-line px-5 py-4 first:border-t-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                      <div>
                        <p className={`text-sm font-semibold leading-snug ${dimmed ? 'text-ink-soft' : 'text-ink'}`}>{task.title}</p>
                        {task.dueLabel && task.status !== 'submitted' && <p className="mt-1 text-xs font-medium text-gold">{task.dueLabel}</p>}
                      </div>
                    </div>
                    <Badge tone={meta.tone}>
                      {task.status === 'done' && <CheckIcon />}
                      {meta.label}
                    </Badge>
                  </div>

                  {task.status === 'done' && task.mentorNote && (
                    <div className="ml-5 mt-3 rounded-[2px] border-l-2 border-success/40 bg-success-soft/40 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-success-ink">Mentor note · {data.mentorName}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{task.mentorNote}</p>
                    </div>
                  )}
                  {task.status === 'blocked' && task.mentorNote && (
                    <p className="ml-5 mt-2 text-xs text-danger">{task.mentorNote}</p>
                  )}
                  {task.status === 'submitted' && (
                    <div className="ml-5 mt-3 rounded-[2px] border-l-2 border-slate/40 bg-slate-soft/50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-ink">Awaiting mentor review</p>
                    </div>
                  )}
                  {actionable && (
                    <div className="ml-5 mt-3">
                      <Button size="sm" variant={task.status === 'in-progress' ? 'primary' : 'secondary'} onClick={() => onSubmit(task.id, task.title)}>
                        {task.status === 'in-progress' ? 'Submit deliverable' : 'Mark submitted'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
          <p className="mt-3 text-xs text-ink-faint">{done} reviewed · {submitted} awaiting review · {total - done - submitted} open</p>
        </section>

        <aside>
          <div className="mb-3">
            <Eyebrow>From Your Mentor</Eyebrow>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-ink">Mentor feedback</h2>
          </div>
          <div className="flex flex-col gap-3">
            {data.feedback.map((f, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Monogram initials={f.author.split(/\s+/).map((w) => w[0]).join('').toUpperCase()} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{f.author}</p>
                    <p className="truncate text-xs text-ink-faint">{f.role}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] font-medium text-ink-faint">{f.when}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </Card>
            ))}
          </div>
        </aside>
      </div>
    </Page>
  )
}
