import Link from 'next/link'
import MatchExplorer from '@/src/components/match/MatchExplorer'

/* ------------------------------------------------------------------ */
/*  /matches — live weighted matching.                                 */
/*  MatchExplorer reads live Convex data and supplies its OWN <Page>   */
/*  wrapper (consistent gutters), so we render it directly beneath a   */
/*  slim nav strip rather than nesting a second Page primitive.        */
/* ------------------------------------------------------------------ */

export default function MatchesPage() {
  return (
    <>
      <div className="border-b border-line bg-paper">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 text-sm">
          <Link href="/discover" className="font-semibold text-ink-soft hover:text-ink">
            Discover
          </Link>
          <span className="text-line-strong">/</span>
          <Link href="/assistant" className="font-semibold text-ink-soft hover:text-ink">
            Assistant
          </Link>
        </nav>
      </div>
      <MatchExplorer />
    </>
  )
}
