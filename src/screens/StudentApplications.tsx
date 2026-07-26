'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Page, Card, Badge, ProgressBar, Eyebrow } from '../components/ui'
import { CompanyLogo } from '../components/CompanyLogo'

/* ------------------------------------------------------------------ */
/*  Student · My Applications — live status of every track applied to.  */
/* ------------------------------------------------------------------ */

type App = {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  matchScore: number
  appliedAt: number
  slaDueAt: number
  note: string
  availability: string
  hoursPerWeek: number
  trackTitle: string
  org: string
  orgSlug: string
}

const STATUS_META: Record<App['status'], { label: string; tone: 'gold' | 'success' | 'neutral' }> = {
  pending: { label: 'Under review', tone: 'gold' },
  accepted: { label: 'Interview scheduled', tone: 'success' },
  declined: { label: 'Not moving forward', tone: 'neutral' },
}
const matchTone = (v: number): 'success' | 'gold' | 'danger' => (v >= 75 ? 'success' : v >= 55 ? 'gold' : 'danger')

export default function StudentApplications() {
  const apps = useQuery(api.applications.mine) as App[] | undefined
  const now = Date.now()

  const appliedLabel = (ms: number) => {
    const h = Math.max(0, Math.round((now - ms) / 3_600_000))
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
  }
  const remaining = (ms: number) => Math.max(0, Math.round((ms - now) / 3_600_000))

  return (
    <Page>
      <header className="mb-8">
        <Eyebrow>Candidate · My Applications</Eyebrow>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">Your applications</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Every track you've applied to, with its live status and guaranteed-interview countdown.
        </p>
      </header>

      {apps === undefined ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading your applications…</p>
        </Card>
      ) : apps.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">You haven't applied to any tracks yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Browse the marketplace and apply to your best matches.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          {apps.map((a) => {
            const meta = STATUS_META[a.status]
            const rem = remaining(a.slaDueAt)
            return (
              <Card key={a.id} className="flex flex-col p-6">
                <div className="flex items-start gap-3">
                  <CompanyLogo slug={a.orgSlug} name={a.org} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{a.org}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <h3 className="mt-1 text-base font-bold leading-snug tracking-tight text-ink">{a.trackTitle}</h3>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-ink-faint">Your fit</span>
                    <span className="text-sm font-semibold tabular-nums text-ink">{a.matchScore}%</span>
                  </div>
                  <ProgressBar value={a.matchScore} tone={matchTone(a.matchScore)} height="h-1" />
                </div>

                {a.note && (
                  <p className="mt-4 line-clamp-2 text-xs italic leading-relaxed text-ink-soft">"{a.note}"</p>
                )}
                {(a.availability || a.hoursPerWeek > 0) && (
                  <p className="mt-2 text-xs text-ink-faint">
                    {[a.availability, a.hoursPerWeek > 0 ? `${a.hoursPerWeek} hrs/wk` : ''].filter(Boolean).join('  ·  ')}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs">
                  <span className="text-ink-faint">Applied {appliedLabel(a.appliedAt)}</span>
                  {a.status === 'pending' ? (
                    <span className={`${rem < 16 ? 'text-gold-ink font-medium' : 'text-ink-faint'}`}>
                      Interview within {rem}h
                    </span>
                  ) : a.status === 'accepted' ? (
                    <span className="font-semibold text-success-ink">✓ Interviewing</span>
                  ) : (
                    <span className="text-ink-faint">Closed</span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}
