'use client'

import { useState } from 'react'
import {
  Page,
  Button,
  Badge,
  Card,
  ProgressBar,
  Eyebrow,
  Field,
  Input,
  Textarea,
  Select,
  inputClass,
} from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Deliverable = {
  id: number
  title: string
  detail: string
}

type Checkpoint = {
  id: number
  label: string
  weight: number
}

const STEPS: { n: number; label: string; tag: string }[] = [
  { n: 1, label: 'Track Basics', tag: 'Identity' },
  { n: 2, label: 'Commitment & Schedule', tag: 'Cadence' },
  { n: 3, label: 'Deliverables & AI Checkpoints', tag: 'Scoring' },
]

const INTENSITY_OPTIONS = ['Part-time', 'Full-time'] as const
type Intensity = (typeof INTENSITY_OPTIONS)[number]

const COMPANY_NAME = 'Talentbank'

/* ------------------------------------------------------------------ */
/*  Tiny inline icons (sharp, currentColor, 1.5 stroke)                */
/* ------------------------------------------------------------------ */

function IconPlus() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconArrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {dir === 'right' ? (
        <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function TrackBuilder() {
  const [step, setStep] = useState<number>(1)

  // Step 1 — Basics
  const [title, setTitle] = useState<string>('Frontend Platform Mentorship')
  const [department, setDepartment] = useState<string>('Engineering · Web Platform')
  const [description, setDescription] = useState<string>(
    'A milestone-driven track where pre-final-year students build production UI alongside our platform engineers — components, testing, and release workflows.',
  )

  // Step 2 — Commitment
  const [intensity, setIntensity] = useState<Intensity>('Part-time')
  const [durationWeeks, setDurationWeeks] = useState<number>(12)
  const [weeklyHours, setWeeklyHours] = useState<number>(12)
  const [cap, setCap] = useState<number>(50)
  const [slaHours, setSlaHours] = useState<number>(48)

  // Step 3 — Deliverables + Checkpoints
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { id: 1, title: 'Ship a reusable component to the design system', detail: 'Reviewed and merged to main' },
    { id: 2, title: 'Build a data-fetching layer for a live feature', detail: 'Typed hooks with error + loading states' },
  ])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: 1, label: 'Task Velocity', weight: 30 },
    { id: 2, label: 'Code Quality', weight: 25 },
    { id: 3, label: 'Communication Cadence', weight: 25 },
    { id: 4, label: 'Initiative & Ownership', weight: 20 },
  ])

  const [published, setPublished] = useState<boolean>(false)

  /* --- dynamic row handlers --- */
  const addDeliverable = () =>
    setDeliverables((rows) => [
      ...rows,
      { id: Date.now(), title: '', detail: '' },
    ])

  const removeDeliverable = (id: number) =>
    setDeliverables((rows) => rows.filter((r) => r.id !== id))

  const updateDeliverable = (id: number, key: keyof Deliverable, value: string) =>
    setDeliverables((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    )

  const addCheckpoint = () =>
    setCheckpoints((rows) => [
      ...rows,
      { id: Date.now(), label: '', weight: 0 },
    ])

  const removeCheckpoint = (id: number) =>
    setCheckpoints((rows) => rows.filter((r) => r.id !== id))

  const updateCheckpoint = (id: number, key: keyof Checkpoint, value: string) =>
    setCheckpoints((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, [key]: key === 'weight' ? clampWeight(value) : value }
          : r,
      ),
    )

  const totalWeight = checkpoints.reduce((sum, c) => sum + (c.weight || 0), 0)
  const weightBalanced = totalWeight === 100
  const validDeliverableCount = deliverables.filter((d) => d.title.trim().length > 0).length

  /* --- navigation --- */
  const goBack = () => setStep((s) => Math.max(1, s - 1))
  const goNext = () => setStep((s) => Math.min(STEPS.length, s + 1))
  const publish = () => setPublished(true)

  const commitmentLine =
    intensity === 'Full-time'
      ? `Full-time · ${durationWeeks} weeks`
      : `${weeklyHours} hrs/week · ${durationWeeks} weeks`

  return (
    <Page width="max-w-6xl">
      {/* ---------------- Header ---------------- */}
      <header className="mb-8 max-w-3xl">
        <Eyebrow>Company · New Track</Eyebrow>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Design Mentorship Track
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
          Define a milestone-driven track tailored to how your team actually works — deliverables,
          weekly commitment, and the checkpoints your mentees are assessed against.
        </p>
      </header>

      {/* ---------------- Stepper ---------------- */}
      <ol className="mb-8 flex items-stretch border border-line bg-white rounded-[2px]">
        {STEPS.map((s, i) => {
          const state: 'done' | 'active' | 'todo' =
            step > s.n ? 'done' : step === s.n ? 'active' : 'todo'
          return (
            <li
              key={s.n}
              className={`flex flex-1 items-center gap-3 px-4 py-3.5 ${
                i !== STEPS.length - 1 ? 'border-r border-line' : ''
              } ${state === 'active' ? 'bg-paper' : ''}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border text-xs font-bold tabular-nums ${
                  state === 'done'
                    ? 'border-ink bg-ink text-cream'
                    : state === 'active'
                      ? 'border-gold bg-gold text-gold-ink'
                      : 'border-line-strong bg-cream text-ink-faint'
                }`}
              >
                {state === 'done' ? <IconCheck /> : s.n}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  {s.tag}
                </span>
                <span
                  className={`block truncate text-[13px] font-semibold ${
                    state === 'todo' ? 'text-ink-faint' : 'text-ink'
                  }`}
                >
                  {s.label}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      {/* ---------------- Body: form + sticky preview ---------------- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* ===== Form column ===== */}
        <div>
          {/* ---- Step 1 ---- */}
          {step === 1 && (
            <Card className="p-6 sm:p-7">
              <StepHeading
                tag="Step 1"
                title="Track Basics"
                desc="The identity students see first. Be specific — generic titles get skipped."
              />
              <div className="mt-6 space-y-5">
                <Field label="Track Title" htmlFor="title" required>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Civil Engineering Digital Twin Track"
                  />
                </Field>
                <Field
                  label="Department / Function"
                  htmlFor="dept"
                  required
                  hint="Owning team"
                >
                  <Input
                    id="dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Infrastructure · Digital Delivery"
                  />
                </Field>
                <Field
                  label="Short Description"
                  htmlFor="desc"
                  hint={`${description.length}/240`}
                >
                  <Textarea
                    id="desc"
                    rows={4}
                    maxLength={240}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will a student actually do, and why does your team care?"
                  />
                </Field>
              </div>
            </Card>
          )}

          {/* ---- Step 2 ---- */}
          {step === 2 && (
            <Card className="p-6 sm:p-7">
              <StepHeading
                tag="Step 2"
                title="Commitment & Schedule"
                desc="Set how much time mentees commit each week and how quickly you'll respond to applicants."
              />
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Format" htmlFor="intensity" required>
                    <Select
                      id="intensity"
                      value={intensity}
                      onChange={(e) => setIntensity(e.target.value as Intensity)}
                    >
                      {INTENSITY_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Duration (weeks)" htmlFor="duration" hint="No fixed term">
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(clampInt(e.target.value, 1, 104))}
                      className="tabular-nums"
                    />
                  </Field>
                </div>

                <Field
                  label="Expected Weekly Hours"
                  htmlFor="hours"
                  hint={<span className="tabular-nums">{weeklyHours} hrs / week</span>}
                >
                  <div className="flex items-center gap-4">
                    <input
                      id="hours"
                      type="range"
                      min={2}
                      max={40}
                      step={1}
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(clampInt(e.target.value, 2, 40))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-[1px] bg-line accent-ink"
                    />
                    <Input
                      type="number"
                      min={2}
                      max={40}
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(clampInt(e.target.value, 2, 40))}
                      className="w-20 text-center tabular-nums"
                      aria-label="Expected weekly hours"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field
                    label="Applicant Cap"
                    htmlFor="cap"
                    hint="Hard limit"
                  >
                    <Input
                      id="cap"
                      type="number"
                      min={1}
                      value={cap}
                      onChange={(e) => setCap(clampInt(e.target.value, 1, 500))}
                      className="tabular-nums"
                    />
                  </Field>
                  <Field
                    label="Interview SLA (hours)"
                    htmlFor="sla"
                    hint="Response time"
                  >
                    <Input
                      id="sla"
                      type="number"
                      min={1}
                      value={slaHours}
                      onChange={(e) => setSlaHours(clampInt(e.target.value, 1, 168))}
                      className="tabular-nums"
                    />
                  </Field>
                </div>

                <p className="border-l-2 border-gold/50 bg-cream px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
                  Candidates see the <span className="font-semibold text-ink">applicant cap</span> and
                  your <span className="font-semibold text-ink">{slaHours}-hour interview window</span>{' '}
                  before they apply.
                </p>
              </div>
            </Card>
          )}

          {/* ---- Step 3 ---- */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Deliverables */}
              <Card className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <StepHeading
                    tag="Step 3"
                    title="Deliverables"
                    desc="Concrete artifacts a student produces. These become the milestones on their track."
                  />
                  <Button variant="secondary" size="sm" onClick={addDeliverable}>
                    <IconPlus />
                    Add
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  {deliverables.length === 0 && (
                    <EmptyRow text="No deliverables yet. Add the first artifact students will ship." />
                  )}
                  {deliverables.map((d, i) => (
                    <div
                      key={d.id}
                      className="border border-line bg-cream p-4 rounded-[2px]"
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint tabular-nums">
                          Milestone {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDeliverable(d.id)}
                          className="inline-flex items-center gap-1 text-ink-faint transition-colors hover:text-danger"
                          aria-label="Remove deliverable"
                        >
                          <IconTrash />
                        </button>
                      </div>
                      <input
                        value={d.title}
                        onChange={(e) => updateDeliverable(d.id, 'title', e.target.value)}
                        placeholder="Deliverable title"
                        className={`${inputClass} mb-2 bg-white font-semibold`}
                      />
                      <input
                        value={d.detail}
                        onChange={(e) => updateDeliverable(d.id, 'detail', e.target.value)}
                        placeholder="Tools, gate, or acceptance criteria (optional)"
                        className={`${inputClass} bg-white text-ink-soft`}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* AI Checkpoints */}
              <Card className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <StepHeading
                    tag="Scoring"
                    title="AI Evaluation Checkpoints"
                    desc="Weighted metrics the post-track AI report scores each student against. Weights must total 100%."
                  />
                  <Button variant="secondary" size="sm" onClick={addCheckpoint}>
                    <IconPlus />
                    Add
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  {checkpoints.length === 0 && (
                    <EmptyRow text="No checkpoints yet. Define how the AI report should grade outcomes." />
                  )}
                  {checkpoints.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 border border-line bg-cream p-3 rounded-[2px]"
                    >
                      <input
                        value={c.label}
                        onChange={(e) => updateCheckpoint(c.id, 'label', e.target.value)}
                        placeholder="Checkpoint label (e.g. Task Velocity)"
                        className={`${inputClass} bg-white`}
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={c.weight}
                          onChange={(e) => updateCheckpoint(c.id, 'weight', e.target.value)}
                          className={`${inputClass} w-20 bg-white text-center tabular-nums`}
                          aria-label="Weight percent"
                        />
                        <span className="text-sm font-semibold text-ink-faint">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCheckpoint(c.id)}
                        className="shrink-0 text-ink-faint transition-colors hover:text-danger"
                        aria-label="Remove checkpoint"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>

                {/* weight tally */}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm font-semibold text-ink">Total weight</span>
                  <div className="flex items-center gap-3">
                    {weightBalanced ? (
                      <Badge tone="success">Balanced</Badge>
                    ) : (
                      <Badge tone="danger">
                        {totalWeight > 100 ? 'Over by' : 'Short by'} {Math.abs(100 - totalWeight)}%
                      </Badge>
                    )}
                    <span
                      className={`text-base font-bold tabular-nums ${
                        weightBalanced ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {totalWeight}%
                    </span>
                  </div>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={Math.min(totalWeight, 100)}
                  tone={weightBalanced ? 'success' : 'danger'}
                />
              </Card>
            </div>
          )}

          {/* ---- Wizard controls ---- */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="md"
              onClick={goBack}
              disabled={step === 1}
            >
              <IconArrow dir="left" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-ink-faint sm:inline tabular-nums">
                Step {step} of {STEPS.length}
              </span>
              {step < STEPS.length ? (
                <Button variant="primary" size="md" onClick={goNext}>
                  Continue
                  <IconArrow dir="right" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={publish}
                  disabled={!weightBalanced || validDeliverableCount === 0 || published}
                >
                  {published ? (
                    <>
                      <IconCheck />
                      Track Published
                    </>
                  ) : (
                    'Publish Track'
                  )}
                </Button>
              )}
            </div>
          </div>

          {step === STEPS.length && !weightBalanced && (
            <p className="mt-3 text-right text-xs text-danger">
              Checkpoint weights must total 100% before publishing.
            </p>
          )}
          {published && (
            <p className="mt-3 text-right text-xs text-success">
              Live in the marketplace. Candidates can now apply against your {cap}-seat cap.
            </p>
          )}
        </div>

        {/* ===== Live preview rail ===== */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2.5 flex items-center justify-between">
            <Eyebrow>Marketplace preview</Eyebrow>
            <Badge tone="slate">Live</Badge>
          </div>

          <Card className="overflow-hidden">
            {/* company strip */}
            <div className="flex items-center gap-3 border-b border-line bg-paper px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-white text-sm font-black text-ink">
                TB
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-bold text-ink">{COMPANY_NAME}</div>
                <div className="text-[11px] text-ink-faint">{department || 'Department'}</div>
              </div>
            </div>

            {/* body */}
            <div className="px-5 py-5">
              <h3 className="text-lg font-bold leading-snug tracking-tight text-ink">
                {title || 'Untitled Track'}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-ink-soft line-clamp-3">
                {description || 'Add a description to tell students what they will build.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="neutral">{intensity}</Badge>
                <Badge tone="gold">{commitmentLine}</Badge>
              </div>

              {/* applicants */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    Applicants
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-ink">
                    0 / {cap} cap
                  </span>
                </div>
                <ProgressBar value={0} max={cap || 1} tone="slate" />
              </div>

              {/* meta grid */}
              <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line rounded-[2px] text-center">
                <div className="bg-white px-3 py-3">
                  <div className="text-base font-bold tabular-nums text-ink">{weeklyHours}h</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Per week
                  </div>
                </div>
                <div className="bg-white px-3 py-3">
                  <div className="text-base font-bold tabular-nums text-ink">
                    {validDeliverableCount}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Deliverables
                  </div>
                </div>
              </div>

              {/* SLA */}
              <div className="mt-4">
                <Badge tone="danger" className="w-full justify-center">
                  SLA: Interview within {slaHours} Hrs
                </Badge>
              </div>

              <Button variant="primary" size="md" className="mt-4 w-full" disabled>
                Apply to Track
              </Button>
              <p className="mt-2 text-center text-[10px] text-ink-faint">
                Candidate-side preview · interactions disabled
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function clampWeight(value: string): number {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function clampInt(value: string, min: number, max: number): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function StepHeading({
  tag,
  title,
  desc,
}: {
  tag: string
  title: string
  desc: string
}) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{tag}</span>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">{desc}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-line-strong bg-cream px-4 py-6 text-center text-xs text-ink-faint rounded-[2px]">
      {text}
    </div>
  )
}
