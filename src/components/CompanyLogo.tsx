import {
  siGrab,
  siShopee,
  siGoogle,
  siIntel,
  siStripe,
  siAtlassian,
  siNvidia,
  siAirbnb,
  siSpotify,
} from 'simple-icons'
import { TalentbankLogo } from './ui'

type Icon = { path: string; hex: string; title: string }

const ICONS: Record<string, Icon> = {
  grab: siGrab,
  shopee: siShopee,
  google: siGoogle,
  intel: siIntel,
  stripe: siStripe,
  atlassian: siAtlassian,
  nvidia: siNvidia,
  airbnb: siAirbnb,
  spotify: siSpotify,
}

/**
 * Renders a company logo on a sharp tile. An uploaded logo wins when present;
 * otherwise a real brand logo via simple-icons, Talentbank's wordmark, and
 * finally a monogram derived from the company name.
 */
export function CompanyLogo({
  slug,
  name,
  logoUrl,
  className = 'h-11 w-11',
}: {
  slug: string
  name: string
  logoUrl?: string | null
  className?: string
}) {
  if (logoUrl) {
    return (
      <div className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
      </div>
    )
  }

  if (slug === 'talentbank') {
    return (
      <div className="flex shrink-0 items-center">
        <TalentbankLogo className="text-[9px]" />
      </div>
    )
  }

  const icon = ICONS[slug]
  if (!icon) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
    return (
      <div
        className={`flex shrink-0 items-center justify-center text-sm font-black tracking-tight text-ink ${className}`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={`flex shrink-0 items-center justify-center ${className}`}>
      <svg
        role="img"
        viewBox="0 0 24 24"
        className="h-full w-full"
        fill={`#${icon.hex}`}
        aria-label={icon.title}
      >
        <title>{icon.title}</title>
        <path d={icon.path} />
      </svg>
    </div>
  )
}
