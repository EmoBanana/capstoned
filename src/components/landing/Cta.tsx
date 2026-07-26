'use client'

import Link from 'next/link'
import { Button } from '../ui'

/* ------------------------------------------------------------------ */
/*  Landing CTA — renders a <button> when an onClick handler is given, */
/*  otherwise a next/link styled to match the shared Button primitive. */
/*  Keeps the landing page integration-agnostic: handlers win, links   */
/*  to /login are the graceful default.                                */
/* ------------------------------------------------------------------ */

type CtaVariant = 'primary' | 'secondary'

/* Class strings mirror ui.tsx Button so the Link case is visually identical. */
const CTA_BASE =
  'inline-flex items-center justify-center gap-2 border font-semibold rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1 focus-visible:ring-offset-cream'

const CTA_SIZE_LG = 'px-6 py-3 text-sm'

const CTA_VARIANT: Record<CtaVariant, string> = {
  primary: 'bg-ink text-cream border-ink hover:bg-black active:bg-black',
  secondary:
    'bg-white text-ink border-line-strong hover:border-ink hover:bg-paper',
}

export function Cta({
  variant = 'primary',
  label,
  onClick,
  href = '/welcome',
  className = '',
  dataAttr,
}: {
  variant?: CtaVariant
  label: string
  onClick?: () => void
  href?: string
  className?: string
  /** Optional GSAP hook attribute, e.g. 'data-hero-cta'. */
  dataAttr?: string
}) {
  const hook = dataAttr ? { [dataAttr]: '' } : {}

  if (onClick) {
    return (
      <Button
        variant={variant}
        size="lg"
        onClick={onClick}
        className={className}
        {...hook}
      >
        {label}
      </Button>
    )
  }

  return (
    <Link
      href={href}
      className={`${CTA_BASE} ${CTA_SIZE_LG} ${CTA_VARIANT[variant]} ${className}`}
      {...hook}
    >
      {label}
    </Link>
  )
}
