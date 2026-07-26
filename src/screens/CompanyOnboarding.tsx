'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Page, Eyebrow, Card, Button, Field, Input, Textarea } from '../components/ui'
import { CompanyLogo } from '../components/CompanyLogo'
import { errorText } from '../components/errors'

/* ------------------------------------------------------------------ */
/*  Company onboarding — a recruiter's real company profile. Creates    */
/*  (or claims) an organization owned by this account; every recruiter   */
/*  screen is then scoped to it. Nothing is hardcoded to Talentbank.     */
/* ------------------------------------------------------------------ */

const PALETTE = ['D81439', '00B14F', '4285F4', '635BFF', 'EE4D2D', '76B900', 'FF5A5F', '0052CC', '111111', '7C3AED']

export default function CompanyOnboarding() {
  const router = useRouter()
  const claimable = useQuery(api.organizations.claimable)
  const saveCompany = useMutation(api.organizations.saveCompany)

  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [about, setAbout] = useState('')
  const [brandColor, setBrandColor] = useState(PALETTE[8])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = name.trim().length >= 2

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveCompany({ name: name.trim(), department: department.trim(), about: about.trim(), brandColor })
      router.replace('/recruiter/dashboard')
    } catch (e) {
      setError(errorText(e))
      setSaving(false)
    }
  }

  return (
    <Page>
      <header className="mb-6">
        <Eyebrow>Welcome · Set up your company</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Create your company profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          This is the company candidates see and apply to. Every track you publish and every applicant you review belongs to it.
        </p>
      </header>

      {claimable && claimable.length > 0 && (
        <Card className="mb-6 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Representing an existing company?</p>
          <p className="mt-1 text-sm text-ink-soft">Pick it to manage its existing tracks and applicants — otherwise just fill in your own below.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {claimable.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => { setName(c.name); setBrandColor(c.brandColor) }}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold rounded-[2px] transition-colors ${
                  name === c.name ? 'border-ink bg-ink text-cream' : 'border-line-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                <CompanyLogo slug={c.slug} name={c.name} className="h-5 w-5" />
                {c.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-5">
          <Field label="Company name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Talentbank" />
          </Field>
          <Field label="Team / focus" hint="optional">
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering · Web Platform" />
          </Field>
          <Field label="About" hint="optional — shown to candidates">
            <Textarea rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="One or two lines on what your team does and why someone would want to learn here." />
          </Field>
          <Field label="Brand colour">
            <div className="flex flex-wrap items-center gap-2.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setBrandColor(c)}
                  className={`h-8 w-8 rounded-[2px] border-2 transition-transform ${brandColor === c ? 'border-ink scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: `#${c}` }}
                />
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-xs text-ink-faint">
            {error ? <span className="font-medium text-danger">{error}</span> : 'Candidates apply to your company, not the platform.'}
          </p>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? 'Saving…' : 'Create company & continue'}
          </Button>
        </div>
      </Card>
    </Page>
  )
}
