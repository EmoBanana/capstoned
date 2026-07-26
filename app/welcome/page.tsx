'use client'

import { useRouter } from 'next/navigation'
import LandingPage from '@/src/components/landing/LandingPage'

/* ------------------------------------------------------------------ */
/*  /welcome — public marketing landing.                               */
/*  Wires the LandingPage CTAs into the demo flow: "Get started" opens */
/*  candidate discovery, "Explore" jumps straight to live matches.     */
/* ------------------------------------------------------------------ */

export default function WelcomePage() {
  const router = useRouter()
  return (
    <LandingPage
      onGetStarted={() => router.push('/discover')}
      onExplore={() => router.push('/matches')}
    />
  )
}
