'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Page, Eyebrow, Card, Button, Field, Input } from '../components/ui'
import { errorText } from '../components/errors'
import { SkeletonGrid } from '../components/Skeleton'

const RESUME_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const isResumeFile = (f: File) => /\.(pdf|docx?)$/i.test(f.name)

/* ------------------------------------------------------------------ */
/*  Candidate settings — edit the matchable profile after onboarding.   */
/* ------------------------------------------------------------------ */

type Skill = { name: string; level: number }

export default function StudentSettings() {
  const me = useQuery(api.candidates.current)
  const saveProfile = useMutation(api.candidates.saveProfile)
  const generateResumeUploadUrl = useMutation(api.candidates.generateResumeUploadUrl)
  const setResume = useMutation(api.candidates.setResume)
  const removeResume = useMutation(api.candidates.removeResume)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [resumeBusy, setResumeBusy] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const [headline, setHeadline] = useState('')
  const [university, setUniversity] = useState('')
  const [program, setProgram] = useState('')
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillName, setSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState(70)
  const [interests, setInterests] = useState('')
  const [aspirations, setAspirations] = useState('')
  const [hours, setHours] = useState(10)
  const [animalKey, setAnimalKey] = useState('owl')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (me) {
      setName(me.name ?? '')
      setEmail(me.email ?? '')
      setPhone(me.phone ?? '')
      setHeadline(me.headline)
      setUniversity(me.university)
      setProgram(me.program)
      setSkills(me.skills)
      setInterests(me.interests.join(', '))
      setAspirations(me.aspirations.join(', '))
      setHours(me.availabilityHoursPerWeek || 10)
      setAnimalKey(me.animalKey || 'owl')
    }
  }, [me])

  const dirty = () => setSaved(false)
  const addSkill = () => {
    const name = skillName.trim()
    if (name && !skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkills([...skills, { name, level: skillLevel }])
      dirty()
    }
    setSkillName('')
    setSkillLevel(70)
  }
  const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await saveProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        headline: headline.trim(),
        university: university.trim(),
        program: program.trim(),
        skills,
        interests: csv(interests),
        aspirations: csv(aspirations),
        availabilityHoursPerWeek: hours,
        animalKey,
      })
      setSaved(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  const uploadResume = async (file: File) => {
    if (!isResumeFile(file)) { setResumeError('Attach a PDF or Word document (.pdf, .doc, .docx).'); return }
    if (file.size > 8 * 1024 * 1024) { setResumeError('That file is over 8 MB. Please choose a smaller one.'); return }
    setResumeBusy(true)
    setResumeError(null)
    try {
      const url = await generateResumeUploadUrl()
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      await setResume({ storageId, fileName: file.name })
    } catch (e) {
      setResumeError(errorText(e))
    } finally {
      setResumeBusy(false)
      if (resumeInputRef.current) resumeInputRef.current.value = ''
    }
  }

  const valid = skills.length > 0 && csv(interests).length > 0 && csv(aspirations).length > 0

  return (
    <Page>
      <header className="mb-6">
        <Eyebrow>Candidate · Settings</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Your profile</h1>
        <p className="mt-2 text-sm text-ink-soft">This drives your track matches — keep it current as your skills grow.</p>
      </header>

      {me === undefined ? (
        <SkeletonGrid count={1} className="" />
      ) : (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Full name"><Input value={name} onChange={(e) => { setName(e.target.value); dirty() }} placeholder="Your name" /></Field>
              <Field label="Email" hint="optional"><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); dirty() }} placeholder="you@email.com" /></Field>
            </div>
            <Field label="Phone" hint="optional"><Input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); dirty() }} placeholder="+60 12 345 6789" /></Field>

            <Field label="Resume" hint="PDF or Word, optional">
              {me?.resumeUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <a href={me.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-line-strong bg-paper px-3 py-1.5 text-sm font-semibold text-ink rounded-[2px] transition-colors hover:border-ink">
                    {me.resumeName || 'View resume'}
                  </a>
                  <Button variant="secondary" onClick={() => resumeInputRef.current?.click()} disabled={resumeBusy}>{resumeBusy ? 'Uploading…' : 'Replace'}</Button>
                  <Button variant="ghost" onClick={() => void removeResume()} disabled={resumeBusy}>Remove</Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => resumeInputRef.current?.click()} disabled={resumeBusy}>{resumeBusy ? 'Uploading…' : 'Attach resume'}</Button>
              )}
              <input ref={resumeInputRef} type="file" accept={RESUME_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadResume(f) }} aria-label="Resume file" />
              {resumeError && <p className="mt-2 text-xs font-medium text-danger">{resumeError}</p>}
            </Field>

            <Field label="Headline"><Input value={headline} onChange={(e) => { setHeadline(e.target.value); dirty() }} /></Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="University"><Input value={university} onChange={(e) => { setUniversity(e.target.value); dirty() }} /></Field>
              <Field label="Program"><Input value={program} onChange={(e) => { setProgram(e.target.value); dirty() }} /></Field>
            </div>

            <Field label="Skills" required>
              {skills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => { setSkills(skills.filter((x) => x.name !== s.name)); dirty() }}
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
                  <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink-faint"><span>Level</span><span className="tabular-nums text-ink">{skillLevel}</span></div>
                  <input type="range" min={0} max={100} value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))} className="w-full accent-gold" />
                </div>
                <Button variant="secondary" onClick={addSkill}>Add</Button>
              </div>
            </Field>

            <Field label="Interests" hint="comma-separated" required>
              <Input value={interests} onChange={(e) => { setInterests(e.target.value); dirty() }} placeholder="UI Engineering, Design Systems" />
            </Field>
            <Field label="Aspirations" hint="comma-separated" required>
              <Input value={aspirations} onChange={(e) => { setAspirations(e.target.value); dirty() }} placeholder="Frontend Engineer, Product Engineer" />
            </Field>
            <Field label="Availability" hint="hours per week">
              <div className="flex items-center gap-4">
                <input type="range" min={2} max={40} value={hours} onChange={(e) => { setHours(Number(e.target.value)); dirty() }} className="flex-1 accent-gold" />
                <span className="w-20 text-sm font-bold tabular-nums text-ink">{hours} hrs/wk</span>
              </div>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {saved && <span className="mr-auto text-xs font-medium text-success-ink">✓ Saved</span>}
            {error && <span className="mr-auto text-xs font-medium text-danger">{error}</span>}
            {!valid && !error && <span className="mr-auto text-xs text-ink-faint">Keep at least one skill, interest, and aspiration.</span>}
            <Button disabled={!valid || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </Card>
      )}
    </Page>
  )
}
