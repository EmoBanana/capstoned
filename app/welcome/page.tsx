import LandingPage from '@/src/components/landing/LandingPage'

/* ------------------------------------------------------------------ */
/*  /welcome — the public front door. The landing page now owns its    */
/*  own sign-in / register flow (via the built-in AuthPanel modal), so  */
/*  this route simply renders it. Auth routes onward to '/' internally. */
/* ------------------------------------------------------------------ */

export default function WelcomePage() {
  return <LandingPage />
}
