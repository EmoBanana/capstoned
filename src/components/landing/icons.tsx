import React from 'react'

/* ------------------------------------------------------------------ */
/*  Sharp, 1.5px stroke, currentColor icons — matches the house style  */
/*  used across CapStoned screens (see Marketplace.tsx).               */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string }

export function CompassIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" strokeLinejoin="round" />
    </svg>
  )
}

export function RouteIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.5" strokeLinecap="square" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
  )
}

export function UserIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="square" />
    </svg>
  )
}

export function BuildingIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path d="M4 21V5l8-2v18M12 21h8V9l-8-2" strokeLinejoin="round" />
      <path d="M7 8v0M7 12v0M7 16v0M16 12v0M16 16v0" strokeLinecap="round" />
    </svg>
  )
}

export function CapIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path d="M2 9l10-4 10 4-10 4z" strokeLinejoin="round" />
      <path d="M6 11v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5M22 9v5" strokeLinecap="square" />
    </svg>
  )
}
