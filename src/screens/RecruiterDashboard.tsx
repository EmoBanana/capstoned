'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Card, Badge, Button, ProgressBar, Eyebrow, ReliabilityScore, Field, Input, Select, Textarea } from '../components/ui'
import { SkeletonGrid } from '../components/Skeleton'
import { useDialog } from '../components/useDialog'
import { errorText } from '../components/errors'
import { CompanyLogo } from '../components/CompanyLogo'

/* ------------------------------------------------------------------ */
/*  Company home — real mentorship programs for the recruiter's org.    */
/* ------------------------------------------------------------------ */

type Status = 'draft' | 'open' | 'in-progress' | 'closed'
type Intensity = 'light' | 'moderate' | 'intense'
type Program = {
  id: string
  title: string
  department: string
  summary: string
  status: Status
  intensity: Intensity
  durationWeeks: number
  weeklyHours: number
  slaHours: number
  cap: number
  deliverables: string[]
  skills: string[]
  checkpoints: { label: string; weight: number }[]
  applicants: number
  enrolled: number
  avgFit: number | null
}

const STATUS_META: Record<Status, { label: string; tone: 'gold' | 'success' | 'neutral' | 'slate' }> = {
  'in-progress': { label: 'In progress', tone: 'gold' },
  open: { label: 'Open', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'slate' },
}

const commitmentLine = (p: Program) =>
  p.intensity === 'intense' ? `Full-time · ${p.durationWeeks} weeks` : `${p.weeklyHours} hrs/week · ${p.durationWeeks} weeks`

type Filter = 'all' | Status
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'draft', label: 'Draft' },
]

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="mt-2 text-3xl font-black tabular-nums tracking-tight text-ink">{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </Card>
  )
}

function ProgramCard({
  program,
  onNavigate,
  onEdit,
  onCloseTrack,
}: {
  program: Program
  onNavigate?: (id: string) => void
  onEdit: (p: Program) => void
  onCloseTrack: (p: Program) => void
}) {
  const meta = STATUS_META[program.status]
  const fillPct = program.cap ? Math.round((program.applicants / program.cap) * 100) : 0
  const [confirmClose, setConfirmClose] = useState(false)
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {program.avgFit !== null && (
          <span className="text-xs text-ink-faint">
            Avg fit <span className="font-bold text-ink">{program.avgFit}%</span>
          </span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-ink">{program.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{commitmentLine(program)}</p>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-ink-faint">Applicants</span>
          <span className="text-sm font-semibold tabular-nums text-ink">{program.applicants}/{program.cap}</span>
        </div>
        <ProgressBar value={program.applicants} max={program.cap} tone={fillPct >= 90 ? 'danger' : 'slate'} height="h-1" />
      </div>

      <div className="mt-4 flex gap-6 text-xs text-ink-faint">
        <span><span className="font-bold text-ink">{program.enrolled}</span> enrolled</span>
        <span><span className="font-bold text-ink">{program.applicants}</span> applied</span>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onNavigate?.('applicants')}>
            Review applicants
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('mentees')}>
            Mentees
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button type="button" onClick={() => onEdit(program)} className="font-semibold text-ink-faint transition-colors hover:text-ink">
            Edit
          </button>
          {program.status !== 'closed' &&
            (confirmClose ? (
              <>
                <button type="button" onClick={() => onCloseTrack(program)} className="font-semibold text-danger">
                  Confirm close
                </button>
                <button type="button" onClick={() => setConfirmClose(false)} className="text-ink-faint hover:text-ink">
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmClose(true)} className="font-semibold text-ink-faint transition-colors hover:text-danger">
                Close track
              </button>
            ))}
        </div>
      </div>
    </Card>
  )
}

function TrackEditModal({
  program,
  onClose,
}: {
  program: Program
  onClose: () => void
}) {
  const updateTrack = useMutation(api.tracks.update)
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const [title, setTitle] = useState(program.title)
  const [department, setDepartment] = useState(program.department)
  const [skillsText, setSkillsText] = useState(program.skills.join(', '))
  const [summary, setSummary] = useState(program.summary)
  const [cap, setCap] = useState(String(program.cap))
  const [weeklyHours, setWeeklyHours] = useState(String(program.weeklyHours))
  const [durationWeeks, setDurationWeeks] = useState(String(program.durationWeeks))
  const [slaHours, setSlaHours] = useState(String(program.slaHours))
  const [intensity, setIntensity] = useState<Intensity>(program.intensity)
  const [deliverables, setDeliverables] = useState<string[]>(program.deliverables.length ? program.deliverables : [''])
  const [checkpoints, setCheckpoints] = useState<{ label: string; weight: number }[]>(program.checkpoints ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setDeliverable = (i: number, val: string) => setDeliverables((d) => d.map((x, j) => (j === i ? val : x)))
  const addDeliverable = () => setDeliverables((d) => [...d, ''])
  const removeDeliverable = (i: number) => setDeliverables((d) => (d.length > 1 ? d.filter((_, j) => j !== i) : d))

  const setCp = (i: number, key: 'label' | 'weight', val: string) =>
    setCheckpoints((c) => c.map((x, j) => (j === i ? { ...x, [key]: key === 'weight' ? Math.max(0, Math.min(100, Math.round(Number(val) || 0))) : val } : x)))
  const addCheckpoint = () => setCheckpoints((c) => [...c, { label: '', weight: 0 }])
  const removeCheckpoint = (i: number) => setCheckpoints((c) => c.filter((_, j) => j !== i))
  const cpTotal = checkpoints.reduce((s, c) => s + (c.weight || 0), 0)
  const cpValid = checkpoints.length === 0 || cpTotal === 100

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateTrack({
        trackId: program.id as Id<'tracks'>,
        title: title.trim(),
        department: department.trim(),
        summary: summary.trim(),
        cap: Math.max(1, Math.round(Number(cap) || program.cap)),
        weeklyHours: Math.max(1, Math.round(Number(weeklyHours) || program.weeklyHours)),
        durationWeeks: Math.max(1, Math.round(Number(durationWeeks) || program.durationWeeks)),
        slaHours: Math.max(1, Math.round(Number(slaHours) || program.slaHours)),
        intensity,
        requiredSkills: skillsText.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, weight: 1, targetLevel: 80 })),
        deliverables: deliverables.map((d) => d.trim()).filter(Boolean),
        checkpoints: checkpoints.map((c) => ({ label: c.label.trim(), weight: c.weight })).filter((c) => c.label),
      })
      onClose()
    } catch (e) {
      setError(errorText(e))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${program.title}`}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-line-strong bg-cream rounded-t-[6px] focus:outline-none sm:rounded-[4px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Edit track</p>
          <h3 className="text-base font-black tracking-tight text-ink">{program.title}</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Department / function"><Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering · Web Platform" /></Field>
          <Field label="Summary"><Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          <Field label="Required skills" hint="comma-separated — drives matching"><Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="React, TypeScript, Design Systems" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seat cap"><Input type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} /></Field>
            <Field label="Interview SLA (hrs)"><Input type="number" min={1} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} /></Field>
            <Field label="Duration (weeks)"><Input type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} /></Field>
            <Field label="Weekly hours"><Input type="number" min={1} value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} /></Field>
            <Field label="Intensity">
              <Select value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)}>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="intense">Intense</option>
              </Select>
            </Field>
          </div>

          <Field label="Deliverables" hint="each becomes a milestone + a mentee's starter task">
            <div className="space-y-2">
              {deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={d} onChange={(e) => setDeliverable(i, e.target.value)} placeholder={`Deliverable ${i + 1}`} />
                  {deliverables.length > 1 && (
                    <button type="button" onClick={() => removeDeliverable(i)} aria-label={`Remove deliverable ${i + 1}`} className="shrink-0 px-2 text-ink-faint transition-colors hover:text-danger">✕</button>
                  )}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addDeliverable}>+ Add deliverable</Button>
            </div>
          </Field>

          <Field
            label="AI evaluation checkpoints"
            hint={checkpoints.length ? `weights total ${cpTotal}% ${cpValid ? '✓' : '(must be 100%)'}` : 'what the AI assessment scores'}
          >
            <div className="space-y-2">
              {checkpoints.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={c.label} onChange={(e) => setCp(i, 'label', e.target.value)} placeholder={`Checkpoint ${i + 1}`} />
                  <div className="flex shrink-0 items-center gap-1">
                    <Input type="number" min={0} max={100} value={String(c.weight)} onChange={(e) => setCp(i, 'weight', e.target.value)} className="w-16 tabular-nums" aria-label={`Weight for checkpoint ${i + 1}`} />
                    <span className="text-xs text-ink-faint">%</span>
                  </div>
                  <button type="button" onClick={() => removeCheckpoint(i)} aria-label={`Remove checkpoint ${i + 1}`} className="shrink-0 px-1 text-ink-faint transition-colors hover:text-danger">✕</button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addCheckpoint}>+ Add checkpoint</Button>
            </div>
          </Field>

          <p className="text-xs text-ink-faint">Edits apply to future applicants and mentees. Mentees already enrolled keep their current plan, tasks, and progress.</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          {error && <span className="mr-auto text-xs font-medium text-danger">{error}</span>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={title.trim().length < 2 || !cpValid || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </div>
    </div>
  )
}

export default function RecruiterDashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const data = useQuery(api.tracks.forOrgManage)
  const org = useQuery(api.organizations.mine)
  const closeTrack = useMutation(api.tracks.close)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Program | null>(null)

  const programs = useMemo<Program[]>(() => (data?.programs ?? []) as Program[], [data])
  const visible = filter === 'all' ? programs : programs.filter((p) => p.status === filter)

  const activePrograms = programs.filter((p) => p.status === 'open' || p.status === 'in-progress').length
  const applicantsInReview = programs.reduce((s, p) => s + p.applicants, 0)
  const enrolledMentees = programs.reduce((s, p) => s + p.enrolled, 0)

  return (
    <Page>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Company · Dashboard</Eyebrow>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Your mentorship programs</h1>
          <div className="mt-3 flex items-center gap-2.5">
            {org && <CompanyLogo slug={org.slug} name={org.name} logoUrl={org.logoUrl} className="h-6 w-6" />}
            <p className="text-sm text-ink-soft">{data?.org.name ?? '…'}</p>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={() => onNavigate?.('new-track')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Track
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active programs" value={String(activePrograms)} sub="Open or running now" />
        <Stat label="Applicants in review" value={String(applicantsInReview)} sub="Across your tracks" />
        <Stat label="Enrolled mentees" value={String(enrolledMentees)} sub="Currently mentoring" />
        <Card className="flex flex-col justify-between p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Company standing</div>
          <div className="mt-3"><ReliabilityScore value={org?.reliabilityDisplay ?? null} /></div>
        </Card>
      </div>

      <div className="mt-8 mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = f.key === 'all' ? programs.length : programs.filter((p) => p.status === f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`border px-3.5 py-2 text-xs font-semibold tracking-tight rounded-[2px] transition-colors duration-150 ${
                active ? 'border-ink bg-ink text-cream' : 'border-line-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 tabular-nums ${active ? 'text-cream/60' : 'text-ink-faint'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {data === undefined ? (
        <SkeletonGrid count={4} className="sm:grid-cols-2" />
      ) : programs.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No tracks yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Publish your first mentorship track to start receiving applicants.</p>
          <div className="mt-5"><Button size="sm" onClick={() => onNavigate?.('new-track')}>Create a track</Button></div>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="px-6 py-16 text-center"><p className="text-sm font-semibold text-ink">No programs in this state.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          {visible.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onNavigate={onNavigate}
              onEdit={setEditing}
              onCloseTrack={(prog) => void closeTrack({ trackId: prog.id as Id<'tracks'> })}
            />
          ))}
        </div>
      )}

      {editing && <TrackEditModal program={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
