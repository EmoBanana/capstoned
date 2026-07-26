'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { streamChat, type ChatMessage } from '../../lib/ai'
import { ANIMALS } from '../../lib/animals'
import { ANIMAL_KEYS } from '../../lib/domain'
import { Badge, Button, Card, Eyebrow, inputClass } from '../ui'

/** useLayoutEffect on the client (runs before paint so the entrance tween's
 *  hidden start state is applied without a flash); useEffect during SSR. */
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* ------------------------------------------------------------------ */
/*  AI Career Coach                                                    */
/*  A warm career-discovery guide. Streams from /api/chat via         */
/*  streamChat (Gemma locally, Groq/Llama when deployed). Helps a      */
/*  lost explorer find directions worth *experiencing* through        */
/*  CapStoned mentorship tracks — never a job-application bot.         */
/* ------------------------------------------------------------------ */

/** One-line roster of the 12 Animals, fed into the system prompt so the
 *  coach can reference archetypes accurately without inventing them. */
const ANIMAL_ROSTER: string = ANIMAL_KEYS.map((key) => {
  const a = ANIMALS[key]
  return `${a.emoji} ${a.name} — ${a.tagline}`
}).join('\n')

const SYSTEM_PROMPT: string = `You are the CapStoned Career Coach, a warm and curious career-discovery guide.

CapStoned's whole idea is "experience careers before committing": instead of guessing, people explore real companies through short, structured mentorship TRACKS, then decide what's worth pursuing for the long term. You help someone who feels lost — "I don't know what suits me" — find directions genuinely worth *experiencing*.

How you talk:
- Warm, encouraging, human. Never clinical or corporate.
- Keep replies SHORT and conversational — 2 to 4 sentences, plain text (no markdown, no headings, no bullet lists).
- End almost every reply with ONE thoughtful follow-up question that helps them discover more about themselves.
- Reflect back what you heard before nudging forward.

What you steer toward:
- Gently connect their interests to the idea of trying a mentorship track — a low-stakes way to *experience* a direction before committing to it.
- You are a discovery guide, NOT a job-application or resume bot. Never ask for a CV, never promise a job, never do interview prep.

The "12 Animals" (a light, fun work-style self-discovery lens you may mention when it fits — never force it):
${ANIMAL_ROSTER}

You can invite someone to take the quick 12 Animals quiz to name their work-style, but only when it feels natural. Above all: be brief, be kind, and always leave them with a question worth thinking about.`

/* ---- Suggested openers ------------------------------------------- */

const STARTERS: readonly string[] = [
  "I don't know what career suits me",
  'What is a mentorship track?',
  'I like solving problems but hate meetings',
  'How do the 12 Animals work?',
]

/* ---- Message model ----------------------------------------------- */

type Turn = { role: 'user' | 'assistant'; content: string }

const GENERIC_ERROR =
  'The Career Coach is unavailable right now — please try again in a moment.'

/* ---- Icons (match StudentMentorship stroke convention) ----------- */

function SendIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Coach is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  )
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[2px] border px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'border-ink bg-ink text-cream'
            : 'border-line-strong bg-paper text-ink'
        }`}
      >
        {turn.content.length > 0 ? turn.content : <TypingDots />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function CareerCoach({ className = '' }: { className?: string }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  /** The last user message we attempted — used by "Retry" after a failure. */
  const lastUserRef = useRef<string | null>(null)
  /** Message count at the previous render, so we can tell a genuinely NEW
   *  bubble (count grew) from a streaming token update (count unchanged). */
  const prevCountRef = useRef(0)

  // Entrance-animate only bubbles that were just added. Keyed on the message
  // COUNT, so streaming token updates (same count, new content) never
  // re-trigger it. Animates transform/autoAlpha only, leaving layout — and
  // therefore the auto-scroll math below — untouched.
  useIso(() => {
    const el = scrollRef.current
    const count = turns.length
    const prev = prevCountRef.current
    prevCountRef.current = count
    if (!el || count <= prev) return
    // prefers-reduced-motion → no tween; the new bubble simply appears.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const added = Array.from(el.children).slice(prev)
    if (added.length === 0) return
    const ctx = gsap.context(() => {
      gsap.from(added, { y: 8, autoAlpha: 0, duration: 0.28, ease: 'power2.out' })
    }, el)
    return () => ctx.revert()
  }, [turns.length])

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, streaming, error])

  // Abort any in-flight request if the component unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /**
   * Send `text` as a new user turn and stream the coach's reply.
   * `history` is the transcript to build context from (defaults to current).
   */
  async function send(text: string, history: Turn[] = turns): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    lastUserRef.current = trimmed
    setError(null)

    const nextHistory: Turn[] = [...history, { role: 'user', content: trimmed }]
    // Optimistically render the user turn plus an empty assistant placeholder.
    setTurns([...nextHistory, { role: 'assistant', content: '' }])
    setDraft('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    const payload: ChatMessage[] = nextHistory.map((t) => ({
      role: t.role,
      content: t.content,
    }))

    try {
      await streamChat(payload, {
        system: SYSTEM_PROMPT,
        temperature: 0.7,
        signal: controller.signal,
        onToken: (_chunk, full) => {
          setTurns([...nextHistory, { role: 'assistant', content: full }])
        },
      })
    } catch (err) {
      if (controller.signal.aborted) {
        // User pressed Stop: keep whatever streamed so far, drop empty bubbles.
        setTurns((prev) => prev.filter((t) => t.content.length > 0))
      } else {
        // Show a friendly message; keep the technical detail in the console.
        console.error('Career Coach chat failed:', err)
        setError(GENERIC_ERROR)
        // Roll the empty assistant placeholder back off the transcript.
        setTurns(nextHistory)
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setStreaming(false)
    }
  }

  function handleStop(): void {
    abortRef.current?.abort()
  }

  function handleRetry(): void {
    const last = lastUserRef.current
    if (!last) return
    // The failed turn was rolled back to end on the user's message; retry from
    // the transcript *before* that user turn to avoid duplicating it.
    const priorHistory = turns.slice(0, -1)
    void send(last, priorHistory)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(draft)
    }
  }

  const isEmpty = turns.length === 0

  return (
    <Card className={`flex h-full min-h-[32rem] flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-gold">
            <SparkIcon />
          </span>
          <div>
            <Eyebrow>AI Career Coach</Eyebrow>
            <p className="mt-0.5 text-sm font-bold tracking-tight text-ink">
              Find a direction worth experiencing
            </p>
          </div>
        </div>
        <Badge tone="gold">Beta</Badge>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-5"
        aria-live="polite"
        aria-atomic="false"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[2px] border border-line-strong bg-paper text-gold">
              <SparkIcon />
            </span>
            <h3 className="text-base font-bold tracking-tight text-ink">
              Not sure what suits you? Let&apos;s explore.
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              Tell me what you enjoy — or what you can&apos;t stand — and I&apos;ll help you
              find mentorship tracks worth experiencing before you commit.
            </p>
          </div>
        ) : (
          turns.map((turn, i) => <Bubble key={i} turn={turn} />)
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mx-5 mb-3 flex items-start justify-between gap-3 rounded-[2px] border border-danger/30 bg-danger-soft px-3.5 py-2.5"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-danger-ink">
              <AlertIcon />
            </span>
            <p className="text-sm leading-relaxed text-danger-ink">{error}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRetry} className="shrink-0">
            Retry
          </Button>
        </div>
      )}

      {/* Suggested starters */}
      {isEmpty && !error && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              disabled={streaming}
              className="rounded-[2px] border border-line-strong bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-line bg-paper px-5 py-4">
        <div className="flex items-end gap-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about careers, interests, or tracks…"
            aria-label="Message the Career Coach"
            className={`${inputClass} max-h-40 resize-none leading-relaxed`}
          />
          {streaming ? (
            <Button
              variant="danger"
              onClick={handleStop}
              aria-label="Stop generating"
              className="shrink-0"
            >
              <StopIcon />
              Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void send(draft)}
              disabled={draft.trim().length === 0}
              aria-label="Send message"
              className="shrink-0"
            >
              <SendIcon />
              Send
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </Card>
  )
}
