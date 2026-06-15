import React from 'react'

/* ------------------------------------------------------------------ */
/*  CapStoned shared UI primitives                                     */
/*  Premium corporate incubator look: cream surfaces, charcoal ink,    */
/*  muted gold / slate accents, sharp 2px corners, crisp 1px borders.  */
/* ------------------------------------------------------------------ */

type Tone = 'gold' | 'slate' | 'success' | 'danger' | 'neutral' | 'ink'

const badgeTones: Record<Tone, string> = {
  gold: 'bg-gold-soft text-gold-ink border-gold/30',
  slate: 'bg-slate-soft text-slate-ink border-slate/30',
  success: 'bg-success-soft text-success-ink border-success/30',
  danger: 'bg-danger-soft text-danger-ink border-danger/30',
  neutral: 'bg-paper text-ink-soft border-line-strong',
  ink: 'bg-ink text-cream border-ink',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-[2px] ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-cream border-ink hover:bg-black active:bg-black',
  secondary:
    'bg-white text-ink border-line-strong hover:border-ink hover:bg-paper',
  danger: 'bg-danger text-white border-danger hover:bg-[#9c3025]',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:text-ink hover:bg-paper',
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: keyof typeof buttonSizes
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 border font-semibold rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1 focus-visible:ring-offset-cream disabled:opacity-45 disabled:cursor-not-allowed ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */

export function Card({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-line bg-white rounded-[2px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */

type BarTone = 'ink' | 'gold' | 'slate' | 'success' | 'danger'

const barFill: Record<BarTone, string> = {
  ink: 'bg-ink',
  gold: 'bg-gold',
  slate: 'bg-slate',
  success: 'bg-success',
  danger: 'bg-danger',
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'ink',
  className = '',
  height = 'h-1.5',
}: {
  value: number
  max?: number
  tone?: BarTone
  className?: string
  height?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div
      className={`w-full ${height} bg-line rounded-[1px] overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full ${barFill[tone]} transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-[0.18em] text-gold ${className}`}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */

export const inputClass =
  'w-full border border-line-strong bg-cream px-3.5 py-2.5 text-sm text-ink rounded-[2px] placeholder:text-ink-faint focus:border-ink focus:bg-white focus:outline-none transition-colors duration-150'

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
  className = '',
}: {
  label: string
  hint?: React.ReactNode
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

export function Textarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} resize-none leading-relaxed ${className}`} {...props} />
}

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat row for AI Match Report — label + bar + score                 */
export function StatBar({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description?: string
}) {
  const tone: BarTone = value >= 75 ? 'success' : value >= 55 ? 'gold' : 'danger'
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-sm font-bold tabular-nums text-ink">{value}%</span>
      </div>
      <ProgressBar value={value} tone={tone} />
      {description && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{description}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Reliability Score badge — public accountability signal             */
export function ReliabilityScore({
  value,
  label = 'Reliability',
  className = '',
}: {
  value: number
  label?: string
  className?: string
}) {
  const tone: Tone = value >= 90 ? 'success' : value >= 70 ? 'gold' : 'danger'
  const dot =
    value >= 90 ? 'bg-success' : value >= 70 ? 'bg-gold' : 'bg-danger'
  return (
    <div
      className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-[2px] ${badgeTones[tone]} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums">{value}%</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Brand mark — stylized cannabis leaf (CapStoned). Uses currentColor. */
export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  const L0 = 'M12 21 C11 16 11.1 9 12 3.5 C12.9 9 13 16 12 21 Z'
  const L1 = 'M12 21 C11.1 16.5 11.2 11 12 7 C12.8 11 12.9 16.5 12 21 Z'
  const L2 = 'M12 21 C11.2 17 11.3 13 12 10.5 C12.7 13 12.8 17 12 21 Z'
  const L3 = 'M12 21 C11.3 18 11.4 15 12 13 C12.6 15 12.7 18 12 21 Z'
  const leaflets: { a: number; d: string }[] = [
    { a: 0, d: L0 },
    { a: 28, d: L1 },
    { a: -28, d: L1 },
    { a: 56, d: L2 },
    { a: -56, d: L2 },
    { a: 84, d: L3 },
    { a: -84, d: L3 },
  ]
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      {leaflets.map((l, i) => (
        <path key={i} d={l.d} transform={`rotate(${l.a} 12 21)`} />
      ))}
      <path d="M11.4 20.8 L12.6 20.8 L12 23.7 Z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Talentbank wordmark logo — white heavy-italic "TALENTBANK™" on the  */
/*  brand crimson, matching the official lockup. Font size is driven by */
/*  the caller's className (e.g. text-xs / text-sm).                    */
export function TalentbankLogo({ className = 'text-sm' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] px-2 py-1 leading-none ${className}`}
      style={{ backgroundColor: '#D81439' }}
      role="img"
      aria-label="Talentbank"
    >
      <span className="font-black italic tracking-tight text-white">TALENTBANK</span>
      <span className="ml-px self-start text-[0.5em] font-bold not-italic text-white">™</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page wrapper — consistent gutters across screens                   */
export function Page({
  children,
  className = '',
  width = 'max-w-7xl',
}: {
  children: React.ReactNode
  className?: string
  width?: string
}) {
  return (
    <div className={`mx-auto ${width} px-6 py-10 sm:py-12 ${className}`}>{children}</div>
  )
}
