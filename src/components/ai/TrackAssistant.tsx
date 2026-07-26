'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { ChatMessage } from '../../lib/ai'
import {
  STUB_EXECUTORS,
  type ParsedAction,
  type ToolExecutors,
  type ToolResult,
} from '../../lib/ai-tools'
import { Badge, Button, Card, Eyebrow, inputClass } from '../ui'

/** useLayoutEffect on the client (runs before paint so the entrance tween's
 *  hidden start state is applied without a flash); useEffect during SSR. */
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* ------------------------------------------------------------------ */
/*  Track Assistant                                                    */
/*  A chat UI that can take REAL actions. It POSTs to /api/agent,      */
/*  which returns either prose or a parsed tool ACTION. When an action */
/*  comes back the component runs the matching executor, shows a       */
/*  "ran <tool>" affordance with the executor's result, then POSTs     */
/*  again (feeding the result back) so the model writes the final      */
/*  natural-language reply.                                            */
/*                                                                     */
/*  Executors are INJECTABLE via the `executors` prop. By default it   */
/*  uses STUB_EXECUTORS (deterministic placeholders). Real Convex-     */
/*  backed executors can be passed later without changing this file —  */
/*  e.g. an executor whose create_track calls a Convex mutation and    */
/*  whose search_tracks reads the live `tracks.list` query.           */
/* ------------------------------------------------------------------ */

const BASE_SYSTEM_PROMPT =
  'You are the CapStoned Track Assistant, helping people create, find, recommend, and ' +
  'apply to mentorship tracks. Be warm and concise, and reply in plain text (no markdown). ' +
  'When the user asks you to create, search, or recommend a track, use the matching tool. ' +
  'You can also apply to a track on the user\'s behalf when they ask.'

const STARTERS: readonly string[] = [
  'Create an 8-week backend track that needs Go and SQL',
  'Find tracks that use React',
  'Recommend a track for someone who loves data',
  'Apply me to the Stripe track',
]

const GENERIC_ERROR =
  'The assistant is unavailable right now. Please try again in a moment.'

/* ---- agent response shape --------------------------------------- */

interface AgentResponse {
  text: string
  action: ParsedAction | null
}

async function postAgent(messages: ChatMessage[], signal: AbortSignal): Promise<AgentResponse> {
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: BASE_SYSTEM_PROMPT }),
    signal,
  })
  if (!res.ok) {
    const detail = await res
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => '')
    throw new Error(detail || `Agent request failed (${res.status})`)
  }
  return (await res.json()) as AgentResponse
}

/* ---- transcript model ------------------------------------------- */

type Turn =
  | { kind: 'user'; content: string }
  | { kind: 'assistant'; content: string }
  | { kind: 'pending' }
  | {
      kind: 'tool'
      tool: string
      /** The model's original action block, replayed to the model next call. */
      actionText: string
      result: ToolResult
      isStub: boolean
    }

/** Build the provider message list the /api/agent route expects. A tool
 *  turn expands into the assistant action + a user tool-result message,
 *  exactly as the protocol feeds results back to the model. */
function toApiMessages(turns: Turn[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const turn of turns) {
    if (turn.kind === 'user') out.push({ role: 'user', content: turn.content })
    else if (turn.kind === 'assistant') out.push({ role: 'assistant', content: turn.content })
    else if (turn.kind === 'tool') {
      out.push({ role: 'assistant', content: turn.actionText })
      out.push({
        role: 'user',
        content: `Tool ${turn.tool} returned: ${JSON.stringify(turn.result)}. Reply to the user.`,
      })
    }
    // 'pending' turns are UI-only and never sent.
  }
  return out
}

/* ---- Icons (match CareerCoach stroke convention) ---------------- */

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

function ToolIcon() {
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
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.7 2.7-2.2-.5-.5-2.2 2.7-2.7Z" />
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

function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={label}>
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

/* ---- transcript renderers --------------------------------------- */

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[2px] border px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'border-ink bg-ink text-cream' : 'border-line-strong bg-paper text-ink'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

/** The "ran a tool" affordance. Shows ONLY what the executor returned —
 *  never fabricated — plus whether the executor is a stub or real. */
function ToolCard({
  tool,
  result,
  isStub,
}: {
  tool: string
  result: ToolResult
  isStub: boolean
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-[2px] border border-line-strong bg-cream px-3.5 py-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={result.ok ? 'text-gold' : 'text-danger'}>
            <ToolIcon />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            Ran {tool}
          </span>
          <Badge tone={isStub ? 'slate' : 'success'} className="ml-1">
            {isStub ? 'Stub' : 'Live'}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-ink">{result.summary}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function TrackAssistant({
  executors = STUB_EXECUTORS,
  className = '',
}: {
  executors?: ToolExecutors
  className?: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastUserRef = useRef<string | null>(null)
  /** Transcript length at the previous render, used to detect a genuinely
   *  NEW turn (count grew) versus an in-place update of an existing turn
   *  (e.g. a pending bubble becoming an assistant reply — same count). */
  const prevCountRef = useRef(0)

  // Entrance-animate only turns that were just added. Keyed on the turn
  // COUNT, so in-place swaps (pending → assistant/tool at the same length)
  // never re-trigger it. Animates transform/autoAlpha only, so layout — and
  // the auto-scroll math below — is unaffected.
  useIso(() => {
    const el = scrollRef.current
    const count = turns.length
    const prev = prevCountRef.current
    prevCountRef.current = count
    if (!el || count <= prev) return
    // prefers-reduced-motion → no tween; the new turn simply appears.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const added = Array.from(el.children).slice(prev)
    if (added.length === 0) return
    const ctx = gsap.context(() => {
      gsap.from(added, { y: 8, autoAlpha: 0, duration: 0.28, ease: 'power2.out' })
    }, el)
    return () => ctx.revert()
  }, [turns.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, busy, error])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  /** Run one executor, mapping missing tools / thrown errors to a result. */
  async function runExecutor(action: ParsedAction): Promise<{ result: ToolResult; isStub: boolean }> {
    const executor = executors[action.tool]
    if (!executor) {
      return {
        result: { ok: false, summary: `No executor registered for "${action.tool}".` },
        isStub: false,
      }
    }
    const isStub = executor === STUB_EXECUTORS[action.tool]
    const result = await executor(action.args)
    return { result, isStub }
  }

  async function send(text: string, history: Turn[] = turns): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    lastUserRef.current = trimmed
    setError(null)

    const afterUser: Turn[] = [...history, { kind: 'user', content: trimmed }]
    setTurns([...afterUser, { kind: 'pending' }])
    setDraft('')
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Turn 1: does the model want to act, or just reply?
      const first = await postAgent(toApiMessages(afterUser), controller.signal)

      if (!first.action) {
        setTurns([...afterUser, { kind: 'assistant', content: first.text }])
        return
      }

      // Run the executor and show the affordance (only real results).
      const { result, isStub } = await runExecutor(first.action)
      const withTool: Turn[] = [
        ...afterUser,
        {
          kind: 'tool',
          tool: first.action.tool,
          actionText: first.text,
          result,
          isStub,
        },
      ]
      setTurns([...withTool, { kind: 'pending' }])

      // Turn 2: feed the result back so the model writes the final reply.
      const second = await postAgent(toApiMessages(withTool), controller.signal)
      setTurns([...withTool, { kind: 'assistant', content: second.text }])
    } catch (err) {
      if (controller.signal.aborted) {
        setTurns((prev) => prev.filter((t) => t.kind !== 'pending'))
      } else {
        // Show a friendly message; keep the technical detail in the console.
        console.error('Track assistant request failed:', err)
        setError(GENERIC_ERROR)
        setTurns(afterUser)
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setBusy(false)
    }
  }

  function handleRetry(): void {
    const last = lastUserRef.current
    if (!last) return
    // The failed turn was rolled back to end on the user's message; retry
    // from the transcript before that user turn to avoid duplicating it.
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
  const usingStubs = executors === STUB_EXECUTORS

  return (
    <Card className={`flex h-full min-h-[32rem] flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-gold">
            <ToolIcon />
          </span>
          <div>
            <Eyebrow>AI Track Assistant</Eyebrow>
            <p className="mt-0.5 text-sm font-bold tracking-tight text-ink">
              Create, find, and recommend tracks
            </p>
          </div>
        </div>
        <Badge tone={usingStubs ? 'slate' : 'gold'}>{usingStubs ? 'Demo' : 'Live'}</Badge>
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
              <ToolIcon />
            </span>
            <h3 className="text-base font-bold tracking-tight text-ink">
              Tell me what to do with tracks.
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              I can create a new mentorship track, search existing ones, or recommend a
              fit. Just ask in plain language.
            </p>
          </div>
        ) : (
          turns.map((turn, i) => {
            if (turn.kind === 'pending') {
              return (
                <div key={i} className="flex justify-start">
                  <div className="rounded-[2px] border border-line-strong bg-paper px-3.5 py-2.5">
                    <TypingDots label="Assistant is working" />
                  </div>
                </div>
              )
            }
            if (turn.kind === 'tool') {
              return (
                <ToolCard key={i} tool={turn.tool} result={turn.result} isStub={turn.isStub} />
              )
            }
            return <ChatBubble key={i} role={turn.kind} content={turn.content} />
          })
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
              disabled={busy}
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
            placeholder="e.g. Create a 6-week React track…"
            aria-label="Message the Track Assistant"
            className={`${inputClass} max-h-40 resize-none leading-relaxed`}
          />
          <Button
            variant="primary"
            onClick={() => void send(draft)}
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
            className="shrink-0"
          >
            <SendIcon />
            Send
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </Card>
  )
}
