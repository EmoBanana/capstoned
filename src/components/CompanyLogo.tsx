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
 * Renders a real brand logo (via simple-icons) on a sharp tile. Talentbank uses
 * its wordmark; unknown slugs fall back to a monogram from the company name.
 */
export function CompanyLogo({
  slug,
  name,
  className = 'h-11 w-11',
}: {
  slug: string
  name: string
  className?: string
}) {
  if (slug === 'talentbank') {
    return (
      <div className={`flex shrink-0 items-center justify-center ${className}`}>
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
        className={`flex shrink-0 items-center justify-center border border-line-strong bg-paper text-sm font-black tracking-tight text-ink rounded-[2px] ${className}`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-line bg-white rounded-[2px] ${className}`}
    >
      <svg
        role="img"
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2"
        fill={`#${icon.hex}`}
        aria-label={icon.title}
      >
        <title>{icon.title}</title>
        <path d={icon.path} />
      </svg>
    </div>
  )
}
