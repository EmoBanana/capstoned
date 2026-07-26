'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AnimalQuiz from '@/src/components/ai/AnimalQuiz'
import CareerCoach from '@/src/components/ai/CareerCoach'
import { ANIMALS } from '@/src/lib/animals'
import type { AnimalKey } from '@/src/lib/domain'
import { Page, Eyebrow, Card, Button } from '@/src/components/ui'

/* ------------------------------------------------------------------ */
/*  /discover — candidate discovery.                                   */
/*  Two tabs: the 12 Animals quiz and the AI Career Coach. Completing  */
/*  the quiz surfaces a forward affordance into /matches. Persistence  */
/*  isn't wired yet, so we guide — we don't write a profile.           */
/* ------------------------------------------------------------------ */

type Tab = 'quiz' | 'coach'

const tabClass = (active: boolean): string =>
  `border px-4 py-2 text-sm font-semibold rounded-[2px] transition-colors duration-150 ${
    active
      ? 'bg-ink text-cream border-ink'
      : 'bg-white text-ink-soft border-line-strong hover:border-ink hover:text-ink'
  }`

export default function DiscoverPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('quiz')
  const [animalKey, setAnimalKey] = useState<AnimalKey | null>(null)

  return (
    <Page>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Discover</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            Find your direction
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft text-justify hyphens-auto">
            Take the 12 Animals quiz to reveal your archetype, or talk it through
            with the Career Coach. Then see how you match real mentorship tracks.
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/matches" className="font-semibold text-ink-soft hover:text-ink">
            Matches
          </Link>
          <span className="text-line-strong">/</span>
          <Link href="/assistant" className="font-semibold text-ink-soft hover:text-ink">
            Assistant
          </Link>
        </nav>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <button type="button" onClick={() => setTab('quiz')} className={tabClass(tab === 'quiz')}>
          12 Animals Quiz
        </button>
        <button type="button" onClick={() => setTab('coach')} className={tabClass(tab === 'coach')}>
          Career Coach
        </button>
      </div>

      {animalKey && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-gold/40 bg-gold-soft px-5 py-4">
          <p className="text-sm font-semibold text-ink">
            You&apos;re {ANIMALS[animalKey].emoji} {ANIMALS[animalKey].name}. Now see how you
            match real tracks.
          </p>
          <Button onClick={() => router.push('/matches')}>See your matches</Button>
        </Card>
      )}

      {tab === 'quiz' ? (
        <AnimalQuiz onComplete={(result) => setAnimalKey(result.animalKey)} />
      ) : (
        <div className="h-[560px]">
          <CareerCoach />
        </div>
      )}
    </Page>
  )
}
