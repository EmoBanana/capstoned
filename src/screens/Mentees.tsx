'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow, ReliabilityScore, Field, Input, Select } from '../components/ui'
import MicroBondContract from '../components/MicroBondContract'

/* ------------------------------------------------------------------ */
/*  Recruiter · Mentees — live Convex enrollments, master-detail with   */
/*  each mentee's real tasks + micro-bond offers.                       */
/* ------------------------------------------------------------------ */

type MenteeStatus = 'ahead' | 'on-track' | 'needs-support' | 'at-risk'
type TaskStatus = 'todo' | 'in-progress' | 'submitted' | 'done' | 'blocked'
type MenteeData = {
  enrollmentId: string
  name: string
  university: string
  program: string
  animalKey: string
  reliability: number
  status: string
  weekProgress: number
  totalWeeks: number
  fit: number
  tasks: { id: string; title: string; status: string; dueLabel?: string; mentorNote?: string }[]
}

const STATUS_META: Record<MenteeStatus, { label: string; tone: 'success' | 'slate' | 'gold' | 'danger'; dot: string }> = {
  ahead: { label: 'Ahead', tone: 'success', dot: 'bg-success' },
  'on-track': { label: 'On track', tone: 'slate', dot: 'bg-slate' },
  'needs-support': { label: 'Needs support', tone: 'gold', dot: 'bg-gold' },
  'at-risk': { label: 'At risk', tone: 'danger', dot: 'bg-danger' },
}
const TASK_META: Record<TaskStatus, { label: string; tone: 'success' | 'gold' | 'neutral' | 'slate' | 'danger' }> = {
  done: { label: 'Done', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'gold' },
  submitted: { label: 'Submitted', tone: 'slate' },
  todo: { label: 'To do', tone: 'neutral' },
  blocked: { label: 'Blocked', tone: 'danger' },
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—'
const fitTone = (v: number): 'success' | 'gold' | 'danger' => (v >= 85 ? 'success' : v >= 70 ? 'gold' : 'danger')

function Monogram({ initials, size = 'md' }: { initials: string; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-paper font-bold tracking-tight text-ink ${cls}`} aria-hidden="true">
      {initials}
    </div>
  )
}

function MenteeDetail({ mentee, trackTitle }: { mentee: MenteeData; trackTitle: string }) {
  const sponsorship = useQuery(api.sponsorships.forEnrollment, { enrollmentId: mentee.enrollmentId as Id<'enrollments'> })
  const offer = useMutation(api.sponsorships.offer)
  const [action, setAction] = useState<'feedback' | 'message' | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showContract, setShowContract] = useState(false)
  const [amount, setAmount] = useState('3000')
  const [type, setType] = useState<'milestone' | 'period'>('milestone')
  const [commitmentKind, setCommitmentKind] = useState<'contract' | 'priority-hiring'>('contract')
  const [months, setMonths] = useState('3')

  const meta = STATUS_META[mentee.status as MenteeStatus]
  const firstName = mentee.name.split(' ')[0]
  const counts = {
    done: mentee.tasks.filter((t) => t.status === 'done').length,
    active: mentee.tasks.filter((t) => t.status === 'in-progress' || t.status === 'todo').length,
    blocked: mentee.tasks.filter((t) => t.status === 'blocked').length,
  }
  const actionCopy = {
    feedback: `Feedback shared with ${firstName}. Wei Chen has been copied on the thread.`,
    message: `Message drafted to ${firstName}. Open your inbox to continue the conversation.`,
  }

  const submitOffer = () => {
    void offer({
      enrollmentId: mentee.enrollmentId as Id<'enrollments'>,
      title: 'Early-Talent Micro-Bond',
      type,
      amount: Math.max(0, Math.round(Number(amount) || 0)),
      commitmentKind,
      commitmentMonths: Math.max(1, Math.round(Number(months) || 1)),
    })
    setModalOpen(false)
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Monogram initials={initialsOf(mentee.name)} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-ink">{mentee.name}</h3>
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{mentee.program} · {mentee.university}</p>
            <div className="mt-3"><ReliabilityScore value={mentee.reliability} /></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAction('message')} aria-label={`Message ${mentee.name}`}>Message</Button>
          <Button size="sm" variant="secondary" onClick={() => setAction('feedback')} aria-label={`Send feedback to ${mentee.name}`}>Send feedback</Button>
          {!sponsorship && (
            <Button size="sm" onClick={() => setModalOpen(true)} aria-label={`Offer micro-bond to ${mentee.name}`}>Offer micro-bond</Button>
          )}
        </div>
      </div>

      {action && (
        <div role="status" className="mt-6 flex items-start justify-between gap-3 rounded-[2px] border border-success/30 bg-success-soft px-4 py-3">
          <p className="text-sm font-medium text-success-ink">{actionCopy[action]}</p>
          <button type="button" onClick={() => setAction(null)} aria-label="Dismiss notice" className="shrink-0 text-success-ink/70 hover:text-success-ink">✕</button>
        </div>
      )}

      {sponsorship && (() => {
        const executed = sponsorship.status === 'signed' || sponsorship.status === 'accepted'
        return (
          <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border px-4 py-3 ${executed ? 'border-success/40 bg-success-soft/40' : 'border-gold/40 bg-gold-soft/40'}`}>
            <p className="text-sm text-ink">
              <span className="font-bold">Micro-bond</span> · RM {sponsorship.amount.toLocaleString()} ·{' '}
              {sponsorship.commitmentMonths}-month {sponsorship.commitmentKind === 'contract' ? 'contract' : 'priority hiring'}
              {executed && sponsorship.contractNo ? ` · ${sponsorship.contractNo}` : ''}
            </p>
            <div className="flex items-center gap-2">
              <Badge tone={executed ? 'success' : 'gold'}>{executed ? 'Signed' : 'Awaiting signature'}</Badge>
              {executed && (
                <Button size="sm" variant="secondary" onClick={() => setShowContract(true)}>View contract</Button>
              )}
            </div>
          </div>
        )
      })()}

      {showContract && sponsorship && (
        <MicroBondContract
          sponsorship={sponsorship}
          studentName={mentee.name}
          trackTitle={trackTitle}
          onClose={() => setShowContract(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-5 border-b border-line py-6 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Cohort week</span>
            <span className="text-sm font-bold tabular-nums text-ink">Week {mentee.weekProgress} <span className="text-xs font-bold text-ink-faint">/ {mentee.totalWeeks}</span></span>
          </div>
          <ProgressBar value={mentee.weekProgress} max={mentee.totalWeeks} tone="ink" />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">AI fit</span>
            <span className="text-sm font-bold tabular-nums text-ink">{mentee.fit}%</span>
          </div>
          <ProgressBar value={mentee.fit} tone={fitTone(mentee.fit)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-6">
        <Badge tone="success">{counts.done} done</Badge>
        <Badge tone="slate">{counts.active} active</Badge>
        {counts.blocked > 0 && <Badge tone="danger">{counts.blocked} blocked</Badge>}
      </div>

      <div className="mt-5">
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Ongoing tasks</h4>
        <div className="flex flex-col gap-3">
          {mentee.tasks.map((t) => {
            const tm = TASK_META[t.status as TaskStatus]
            return (
              <div key={t.id} className="rounded-[2px] border border-line bg-white px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm font-semibold text-ink ${t.status === 'done' ? 'opacity-70' : ''}`}>{t.title}</p>
                  <div className="shrink-0"><Badge tone={tm.tone}>{tm.label}</Badge></div>
                </div>
                {t.dueLabel && (
                  <div className="mt-2">
                    <span className={`text-[11px] font-bold uppercase tracking-[0.06em] tabular-nums ${t.status === 'blocked' ? 'text-danger-ink' : 'text-ink-faint'}`}>{t.dueLabel}</span>
                  </div>
                )}
                {t.mentorNote && (
                  <div className="mt-3 border-l-2 border-gold/40 bg-gold-soft/40 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Mentor note · Wei Chen</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{t.mentorNote}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8" onClick={() => setModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="mb-title" className="w-full max-w-md border border-line-strong bg-white rounded-[2px]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-line px-6 py-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Micro-bond</span>
              <h3 id="mb-title" className="mt-1 text-lg font-bold tracking-tight text-ink">Sponsor {firstName}</h3>
            </div>
            <div className="space-y-5 px-6 py-5">
              <p className="text-xs leading-relaxed text-ink-soft">
                A micro-bond sponsors this mentee in exchange for a short commitment — a lighter investment than a scholarship, made this early.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (RM)" htmlFor="mb-amount">
                  <Input id="mb-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
                </Field>
                <Field label="For" htmlFor="mb-type">
                  <Select id="mb-type" value={type} onChange={(e) => setType(e.target.value as 'milestone' | 'period')}>
                    <option value="milestone">A milestone</option>
                    <option value="period">A period</option>
                  </Select>
                </Field>
                <Field label="Commitment" htmlFor="mb-kind">
                  <Select id="mb-kind" value={commitmentKind} onChange={(e) => setCommitmentKind(e.target.value as 'contract' | 'priority-hiring')}>
                    <option value="contract">Contract</option>
                    <option value="priority-hiring">Priority hiring</option>
                  </Select>
                </Field>
                <Field label="Months" htmlFor="mb-months">
                  <Input id="mb-months" type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} className="tabular-nums" />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={submitOffer}>Send offer</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function Mentees() {
  const org = useQuery(api.organizations.mine)
  const orgSlug = org?.slug
  const data = useQuery(api.enrollments.menteesForOrg, orgSlug ? { orgSlug } : 'skip')
  const orgRel = useQuery(api.reliability.orgScore, orgSlug ? { orgSlug } : 'skip')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (data === undefined) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading mentees…</p>
        </Card>
      </Page>
    )
  }
  const mentees: MenteeData[] = data?.mentees ?? []
  if (mentees.length === 0) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No enrolled mentees yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Accept applicants to start mentoring them.</p>
        </Card>
      </Page>
    )
  }

  const selected = mentees.find((m) => m.enrollmentId === selectedId) ?? mentees[0]

  return (
    <Page>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Company · Mentees</Eyebrow>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">Enrolled mentees</h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            {data?.trackTitle} · {org?.name ?? '…'} · {data?.totalWeeks}-week track
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Cohort</div>
            <div className="text-xs font-medium text-ink-soft">{mentees.length} mentees enrolled</div>
          </div>
          <ReliabilityScore value={orgRel?.score ?? 98} label="Company" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Cohort roster</h2>
            <span className="text-[11px] font-bold tabular-nums text-ink-faint">{mentees.length}</span>
          </div>
          <Card className="overflow-hidden">
            {mentees.map((m) => {
              const rm = STATUS_META[m.status as MenteeStatus]
              const active = m.enrollmentId === selected.enrollmentId
              return (
                <button
                  key={m.enrollmentId}
                  type="button"
                  onClick={() => setSelectedId(m.enrollmentId)}
                  aria-pressed={active}
                  className={`block w-full border-b border-line px-4 py-4 text-left transition-colors duration-150 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-inset ${active ? 'border-l-2 border-l-ink bg-paper' : 'hover:bg-paper'}`}
                >
                  <div className="flex items-start gap-3">
                    <Monogram initials={initialsOf(m.name)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{m.name}</span>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${rm.dot}`} aria-hidden="true" />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-soft">{m.program} · {m.university}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">AI fit</span>
                        <div className="flex-1"><ProgressBar value={m.fit} tone={fitTone(m.fit)} height="h-1" /></div>
                        <span className="text-xs font-bold tabular-nums text-ink">{m.fit}%</span>
                      </div>
                      <div className="mt-2.5"><Badge tone={rm.tone}>{rm.label}</Badge></div>
                    </div>
                  </div>
                </button>
              )
            })}
          </Card>
        </div>

        <div>
          <MenteeDetail mentee={selected} trackTitle={data?.trackTitle ?? ''} key={selected.enrollmentId} />
        </div>
      </div>
    </Page>
  )
}
