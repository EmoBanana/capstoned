'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ANIMALS,
  QUIZ_QUESTIONS,
  accumulateTraits,
  scoreQuizToAnimal,
} from '../../lib/animals'
import {
  TRAIT_KEYS,
  type AnimalKey,
  type AnimalTraits,
  type QuizOption,
  type TraitKey,
} from '../../lib/domain'
import { Badge, Button, Card, Eyebrow, ProgressBar } from '../ui'

/* ------------------------------------------------------------------ */
/*  The 12 Animals — quick work-style quiz                            */
/*                                                                     */
/*  A fast, delightful discovery hook: one question at a time, then    */
/*  one work-style archetype (an animal) with the mentorship track     */
/*  types worth exploring. Scoring lives in ../../lib/animals — this   */
/*  component only collects answers and renders the result.            */
/* ------------------------------------------------------------------ */

/** Human labels for the six trait axes, for the result readout. */
const TRAIT_LABELS: Record<TraitKey, string> = {
  analytical: 'Analytical',
  creative: 'Creative',
  independent: 'Independent',
  collaborative: 'Collaborative',
  structured: 'Structured',
  adaptive: 'Adaptive',
}

type QuizResult = {
  animalKey: AnimalKey
  traits: AnimalTraits
}

export type AnimalQuizProps = {
  /**
   * Fired once the result is computed (on finishing the quiz, and again
   * on each retake+finish). A later phase can persist it via a Convex
   * mutation — this component stays integration-agnostic.
   */
  onComplete?: (result: QuizResult) => void
  className?: string
}

/* ------------------------------------------------------------------ */

export default function AnimalQuiz({
  onComplete,
  className = '',
}: AnimalQuizProps) {
  const total = QUIZ_QUESTIONS.length

  // One slot per question; null until answered.
  const [answers, setAnswers] = useState<(QuizOption | null)[]>(() =>
    Array.from({ length: total }, () => null),
  )
  const [step, setStep] = useState<number>(0)
  const [result, setResult] = useState<QuizResult | null>(null)

  const question = QUIZ_QUESTIONS[step]
  const current = answers[step] ?? null
  const isLast = step === total - 1
  const answeredCount = answers.filter((a) => a !== null).length

  const select = useCallback(
    (option: QuizOption) => {
      setAnswers((prev) => {
        const next = [...prev]
        next[step] = option
        return next
      })
    },
    [step],
  )

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const finish = useCallback(() => {
    const chosen = answers.filter((a): a is QuizOption => a !== null)
    if (chosen.length !== total) return
    const animalKey = scoreQuizToAnimal(chosen)
    const traits = accumulateTraits(chosen)
    const computed: QuizResult = { animalKey, traits }
    setResult(computed)
    onComplete?.(computed)
  }, [answers, total, onComplete])

  const goNext = useCallback(() => {
    if (current === null) return
    if (isLast) {
      finish()
    } else {
      setStep((s) => Math.min(total - 1, s + 1))
    }
  }, [current, isLast, finish, total])

  const retake = useCallback(() => {
    setAnswers(Array.from({ length: total }, () => null))
    setStep(0)
    setResult(null)
  }, [total])

  // Keyboard: number keys 1..N pick an option; Enter advances; Backspace
  // steps back. Disabled once the result is shown.
  useEffect(() => {
    if (result) return
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      const n = Number.parseInt(e.key, 10)
      if (!Number.isNaN(n) && n >= 1 && n <= question.options.length) {
        e.preventDefault()
        select(question.options[n - 1])
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (current !== null) goNext()
        return
      }
      if (e.key === 'Backspace' && step > 0) {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, question, current, step, select, goNext, goBack])

  if (result) {
    return (
      <ResultView
        result={result}
        onRetake={retake}
        className={className}
      />
    )
  }

  const progressValue = answeredCount

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* ---------- Progress header ---------- */}
      <div className="border-b border-line px-6 py-4 sm:px-8">
        <div className="flex items-baseline justify-between">
          <Eyebrow>The 12 Animals</Eyebrow>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint tabular-nums">
            Question {step + 1} of {total}
          </span>
        </div>
        <ProgressBar
          value={progressValue}
          max={total}
          tone="gold"
          className="mt-3"
        />
      </div>

      {/* ---------- Question ---------- */}
      <div className="px-6 py-7 sm:px-8">
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          {question.prompt}
        </h2>
        <p className="mt-2 text-xs text-ink-faint">
          Pick the option that fits you best — press 1–{question.options.length},
          or click.
        </p>

        <div
          role="radiogroup"
          aria-label={question.prompt}
          className="mt-6 grid gap-3"
        >
          {question.options.map((option, i) => {
            const selected = current?.id === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => select(option)}
                className={`group flex items-center gap-4 border px-4 py-3.5 text-left rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-1 focus-visible:ring-offset-cream ${
                  selected
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line-strong bg-white text-ink hover:border-ink hover:bg-paper'
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center border text-xs font-bold tabular-nums rounded-[2px] ${
                    selected
                      ? 'border-cream/40 bg-cream/10 text-cream'
                      : 'border-line-strong bg-paper text-ink-soft group-hover:border-ink'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-semibold leading-snug">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- Navigation ---------- */}
      <div className="flex items-center justify-between border-t border-line px-6 py-4 sm:px-8">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={goNext}
          disabled={current === null}
        >
          {isLast ? 'See my animal' : 'Next'}
        </Button>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Result                                                            */

function ResultView({
  result,
  onRetake,
  className,
}: {
  result: QuizResult
  onRetake: () => void
  className: string
}) {
  const animal = ANIMALS[result.animalKey]

  // Traits, ordered strongest-first for a punchier readout.
  const orderedTraits = useMemo(
    () =>
      [...TRAIT_KEYS].sort((a, b) => result.traits[b] - result.traits[a]),
    [result.traits],
  )

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* ---------- Hero ---------- */}
      <div className="border-b border-line bg-paper px-6 py-8 text-center sm:px-8 sm:py-10">
        <Eyebrow>Your work-style animal</Eyebrow>
        <div className="mt-4 text-6xl leading-none sm:text-7xl" aria-hidden="true">
          {animal.emoji}
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {animal.name}
        </h2>
        <p className="mt-2 text-sm font-semibold text-gold">{animal.tagline}</p>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
          {animal.description}
        </p>
      </div>

      {/* ---------- Suited tracks ---------- */}
      <div className="border-b border-line px-6 py-6 sm:px-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Tracks worth exploring
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {animal.suitedTags.map((tag) => (
            <Badge key={tag} tone="slate">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* ---------- Trait readout ---------- */}
      <div className="px-6 py-6 sm:px-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Your trait mix
        </span>
        <div className="mt-4 space-y-4">
          {orderedTraits.map((key) => (
            <div key={key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink">
                  {TRAIT_LABELS[key]}
                </span>
                <span className="text-sm font-bold tabular-nums text-ink-soft">
                  {result.traits[key]}
                </span>
              </div>
              <ProgressBar value={result.traits[key]} tone="ink" />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Actions ---------- */}
      <div className="flex items-center justify-between border-t border-line px-6 py-4 sm:px-8">
        <p className="text-xs text-ink-faint">
          A quick read — explore a track to feel the fit for real.
        </p>
        <Button variant="secondary" onClick={onRetake}>
          Retake
        </Button>
      </div>
    </Card>
  )
}
