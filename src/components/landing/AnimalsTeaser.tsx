'use client'

import { Eyebrow } from '../ui'
import { ANIMALS } from '../../lib/animals'
import { ANIMAL_KEYS } from '../../lib/domain'

/* ------------------------------------------------------------------ */
/*  The 12 Animals teaser — the playful discovery hook. A staggered    */
/*  row of work-style archetypes pulled straight from the roster so    */
/*  the emoji + names always match the real quiz.                      */
/* ------------------------------------------------------------------ */

export function AnimalsTeaser() {
  return (
    <section className="border-b border-line bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl" data-reveal>
          <Eyebrow className="text-gold">The 12 Animals</Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-cream sm:text-4xl">
            Which animal do you work like?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-cream/70">
            A two-minute quiz maps you to one of twelve work-style archetypes — the
            fast, playful way in. It becomes the signal that steers you toward tracks
            where you will genuinely thrive.
          </p>
        </div>

        <div
          data-animal-grid
          className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-cream/15 bg-cream/15 sm:grid-cols-3 lg:grid-cols-4"
        >
          {ANIMAL_KEYS.map((key) => {
            const a = ANIMALS[key]
            return (
              <div
                key={key}
                data-animal
                className="group flex items-center gap-3.5 bg-ink px-4 py-4 transition-colors duration-150 hover:bg-[#111]"
              >
                <span
                  className="text-3xl leading-none transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-cream">{a.name}</p>
                  <p className="truncate text-[11px] uppercase tracking-[0.08em] text-cream/50">
                    {a.tagline}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
