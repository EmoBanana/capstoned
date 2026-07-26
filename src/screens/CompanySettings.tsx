'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Page, Eyebrow, Card, Button, Field, Input, Textarea } from '../components/ui'
import { errorText } from '../components/errors'
import { SkeletonGrid } from '../components/Skeleton'

/* ------------------------------------------------------------------ */
/*  Company settings — edit the real organization after onboarding.     */
/* ------------------------------------------------------------------ */

const PALETTE = ['D81439', '00B14F', '4285F4', '635BFF', 'EE4D2D', '76B900', 'FF5A5F', '0052CC', '111111', '7C3AED']

export default function CompanySettings() {
  const org = useQuery(api.organizations.mine)
  const saveCompany = useMutation(api.organizations.saveCompany)

  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [about, setAbout] = useState('')
  const [brandColor, setBrandColor] = useState(PALETTE[8])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (org) {
      setName(org.name)
      setDepartment(org.department)
      setAbout(org.about)
      setBrandColor(org.brandColor)
    }
  }, [org])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await saveCompany({ name: name.trim(), department: department.trim(), about: about.trim(), brandColor })
      setSaved(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <header className="mb-6">
        <Eyebrow>Company · Settings</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Company profile</h1>
        <p className="mt-2 text-sm text-ink-soft">Update how your company appears to candidates across the marketplace.</p>
      </header>

      {org === undefined ? (
        <SkeletonGrid count={1} className="" />
      ) : (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-5">
            <Field label="Company name" required>
              <Input value={name} onChange={(e) => { setName(e.target.value); setSaved(false) }} />
            </Field>
            <Field label="Team / focus">
              <Input value={department} onChange={(e) => { setDepartment(e.target.value); setSaved(false) }} placeholder="e.g. Engineering · Web Platform" />
            </Field>
            <Field label="About">
              <Textarea rows={3} value={about} onChange={(e) => { setAbout(e.target.value); setSaved(false) }} />
            </Field>
            <Field label="Brand colour">
              <div className="flex flex-wrap items-center gap-2.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => { setBrandColor(c); setSaved(false) }}
                    className={`h-8 w-8 rounded-[2px] border-2 transition-transform ${brandColor === c ? 'border-ink scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: `#${c}` }}
                  />
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            {saved && <span className="mr-auto text-xs font-medium text-success-ink">✓ Saved</span>}
            {error && <span className="mr-auto text-xs font-medium text-danger">{error}</span>}
            <Button disabled={name.trim().length < 2 || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>
      )}
    </Page>
  )
}
