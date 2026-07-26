'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toCandidateProfile, toTrack } from '@/src/lib/convex-adapters'
import MatchReport from '@/src/components/match/MatchReport'
import { Page, Card, Eyebrow } from '../components/ui'

/* ------------------------------------------------------------------ */
/*  Recruiter · AI Assessment — pick a mentee, see the real weighted    */
/*  match report (Session A's MatchReport on live Convex data).         */
/* ------------------------------------------------------------------ */

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—'

export default function RecruiterAssessment() {
  const org = useQuery(api.organizations.mine)
  const orgSlug = org?.slug
  const data = useQuery(api.enrollments.assessmentData, orgSlug ? { orgSlug } : 'skip')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (data === undefined) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink-soft">Loading assessments…</p>
        </Card>
      </Page>
    )
  }
  const mentees = (data?.mentees ?? []).filter((m) => m.candidate)
  if (!data || mentees.length === 0) {
    return (
      <Page>
        <Card className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No mentees to assess yet.</p>
          <p className="mt-1.5 text-sm text-ink-soft">Accept applicants and they'll appear here.</p>
        </Card>
      </Page>
    )
  }

  const selected = mentees.find((m) => m.enrollmentId === selectedId) ?? mentees[0]
  const candidate = toCandidateProfile(selected.candidate!)
  const track = toTrack(data.track)

  return (
    <Page>
      <header className="mb-6">
        <Eyebrow>Company · AI Assessment</Eyebrow>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">Mentee match assessment</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {data.track.title} · A weighted match across skills, interests, aspirations, work style, and commitment.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Mentees</h2>
          <Card className="overflow-hidden">
            {mentees.map((m) => {
              const active = m.enrollmentId === selected.enrollmentId
              return (
                <button
                  key={m.enrollmentId}
                  type="button"
                  onClick={() => setSelectedId(m.enrollmentId)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-inset ${active ? 'border-l-2 border-l-ink bg-paper' : 'hover:bg-paper'}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-xs font-bold text-ink">
                    {initialsOf(m.name)}
                  </div>
                  <span className="truncate text-sm font-bold text-ink">{m.name}</span>
                </button>
              )
            })}
          </Card>
        </div>

        <MatchReport key={selected.enrollmentId} candidate={candidate} track={track} />
      </div>
    </Page>
  )
}
