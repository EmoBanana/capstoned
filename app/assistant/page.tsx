import Link from 'next/link'
import TrackAssistantConnected from '@/src/components/ai/TrackAssistantConnected'
import { Page, Eyebrow } from '@/src/components/ui'

/* ------------------------------------------------------------------ */
/*  /assistant — Track Assistant.                                      */
/*  TrackAssistantConnected reads live Convex data and renders a Card  */
/*  that fills its parent height, so we give it a sized container.     */
/* ------------------------------------------------------------------ */

export default function AssistantPage() {
  return (
    <Page>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Assistant</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            Track Assistant
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft text-justify hyphens-auto">
            Search live mentorship tracks and get data-backed recommendations
            ranked by the weighted decision matrix.
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/discover" className="font-semibold text-ink-soft hover:text-ink">
            Discover
          </Link>
          <span className="text-line-strong">/</span>
          <Link href="/matches" className="font-semibold text-ink-soft hover:text-ink">
            Matches
          </Link>
        </nav>
      </header>

      <div className="h-[640px]">
        <TrackAssistantConnected />
      </div>
    </Page>
  )
}
