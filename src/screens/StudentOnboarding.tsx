'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import AnimalQuiz from '@/src/components/ai/AnimalQuiz'
import { ANIMALS } from '@/src/lib/animals'
import { Page, Eyebrow, Card, Button, Field, Input, Select, ProgressBar } from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Student onboarding — builds a REAL, matchable profile and persists  */
/*  it to Convex. Nothing is mocked: matching only works once this is    */
/*  done, which is why a fresh account is routed straight here.          */
/* ------------------------------------------------------------------ */

type Skill = { name: string; level: number }

const SUGGESTED_INTERESTS = [
  'UI Engineering', 'Design Systems', 'Machine Learning', 'Systems', 'Reliability',
  'Product', 'Developer Tools', 'Research', 'Scalability', 'User Research', 'Performance', 'APIs',
]
const SUGGESTED_ASPIRATIONS = [
  'Frontend Engineer', 'Backend Engineer', 'Product Engineer', 'ML Engineer',
  'Platform Engineer', 'Product Designer', 'Researcher', 'SRE', 'Mobile Engineer',
]

function TagPicker({
  label, hint, options, value, onChange,
}: { label: string; hint: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = (t: string) => {
    const tag = t.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }
  const pool = options.filter((o) => !value.includes(o))
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="inline-flex items-center gap-1.5 border border-ink bg-ink px-2.5 py-1 text-xs font-semibold text-cream rounded-[2px]"
            >
              {t} <span className="text-cream/70">✕</span>
            </button>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft) }
        }}
        placeholder="Type and press Enter to add"
      />
      {pool.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pool.slice(0, 10).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => add(o)}
              className="border border-line-strong bg-white px-2.5 py-1 text-xs font-medium text-ink-soft rounded-[2px] transition-colors hover:border-ink hover:text-ink"
            >
              + {o}
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}

export default function StudentOnboarding() {
  const router = useRouter()
  const saveProfile = useMutation(api.candidates.saveProfile)

  const [step, setStep] = useState(0)
  const [headline, setHeadline] = useState('')
  const [university, setUniversity] = useState('')
  const [program, setProgram] = useState('')
  const [animalKey, setAnimalKey] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillName, setSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState(70)
  const [interests, setInterests] = useState<string[]>([])
  const [aspirations, setAspirations] = useState<string[]>([])
  const [hours, setHours] = useState(10)
  const [saving, setSaving] = useState(false)

  const steps = ['Basics', 'Your archetype', 'Skills & goals']
  const addSkill = () => {
    const name = skillName.trim()
    if (name && !skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkills([...skills, { name, level: skillLevel }])
    }
    setSkillName('')
    setSkillLevel(70)
  }

  const basicsValid = headline.trim() && university.trim() && program.trim()
  const finalValid = skills.length > 0 && interests.length > 0 && aspirations.length > 0

  const submit = async () => {
    setSaving(true)
    try {
      await saveProfile({
        headline: headline.trim(),
        university: university.trim(),
        program: program.trim(),
        skills,
        interests,
        aspirations,
        availabilityHoursPerWeek: hours,
        animalKey: animalKey || 'owl',
      })
      router.replace('/student/marketplace')
    } catch {
      setSaving(false)
    }
  }

  const animal = animalKey ? ANIMALS[animalKey as keyof typeof ANIMALS] : null

  return (
    <Page>
      <header className="mb-6">
        <Eyebrow>Welcome · Build your profile</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Let's set up your matching profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          This is what our weighted matching engine uses to rank tracks for you. It takes a couple of minutes and you can refine it later.
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`text-[11px] font-bold uppercase tracking-[0.1em] ${i === step ? 'text-ink' : 'text-ink-faint'}`}>
              {i + 1}. {s}
            </div>
            <ProgressBar value={i <= step ? 100 : 0} tone={i <= step ? 'success' : 'gold'} className="mt-1" />
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-5">
            <Field label="Headline" hint="One line about you" required>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Final-year CS student, frontend-focused" />
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="University" required>
                <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. Sunway University" />
              </Field>
              <Field label="Program" required>
                <Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="e.g. Computer Science" />
              </Field>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!basicsValid} onClick={() => setStep(1)}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div>
          {animal ? (
            <Card className="p-6 text-center">
              <div className="text-5xl">{animal.emoji}</div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-ink">Your archetype: {animal.name}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">{animal.tagline}</p>
              <div className="mt-5 flex justify-center gap-3">
                <Button variant="secondary" onClick={() => setAnimalKey('')}>Retake quiz</Button>
                <Button onClick={() => setStep(2)}>Continue</Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 sm:p-6">
              <AnimalQuiz onComplete={(r) => setAnimalKey(r.animalKey)} />
            </Card>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            {!animal && (
              <button className="text-xs font-semibold text-ink-faint hover:text-ink" onClick={() => { setAnimalKey('owl'); setStep(2) }}>
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="p-6">
          <Field label="Skills" hint="Add a few, with your level" required>
            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSkills(skills.filter((x) => x.name !== s.name))}
                    className="inline-flex items-center gap-2 border border-line-strong bg-paper px-2.5 py-1 text-xs font-semibold text-ink rounded-[2px]"
                  >
                    {s.name} <span className="tabular-nums text-ink-faint">{s.level}</span> <span className="text-ink-faint">✕</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} placeholder="e.g. React" />
              </div>
              <div className="sm:w-56">
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-faint">
                  <span>Level</span><span className="tabular-nums text-ink">{skillLevel}</span>
                </div>
                <input type="range" min={0} max={100} value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))} className="w-full accent-gold" />
              </div>
              <Button variant="secondary" onClick={addSkill}>Add</Button>
            </div>
          </Field>

          <div className="mt-5 grid grid-cols-1 gap-5">
            <TagPicker label="Interests" hint="What you enjoy" options={SUGGESTED_INTERESTS} value={interests} onChange={setInterests} />
            <TagPicker label="Aspirations" hint="Roles you're aiming for" options={SUGGESTED_ASPIRATIONS} value={aspirations} onChange={setAspirations} />
            <Field label="Availability" hint="Hours per week you can commit">
              <div className="flex items-center gap-4">
                <input type="range" min={2} max={40} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="flex-1 accent-gold" />
                <span className="w-20 text-sm font-bold tabular-nums text-ink">{hours} hrs/wk</span>
              </div>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!finalValid || saving} onClick={submit}>
              {saving ? 'Saving…' : 'Finish & see my matches'}
            </Button>
          </div>
          {!finalValid && (
            <p className="mt-2 text-right text-xs text-ink-faint">Add at least one skill, interest, and aspiration.</p>
          )}
        </Card>
      )}
    </Page>
  )
}
