// Non-streaming agent endpoint for the tool-calling loop. Mirrors the
// provider handling of /api/chat (Ollama local Gemma in dev, Groq on
// Vercel) but returns a FULL JSON response so the server can detect a
// ```action block before replying:
//
//   POST { messages, system?, temperature? }
//     -> { text: string, action: ParsedAction | null }
//
// The route prepends the tool system prompt (buildToolSystemPrompt) and
// parses the model's reply with parseAction. No simulated fallback — if
// the backend is down it returns a real 503 so failures stay visible.

import { buildToolSystemPrompt, parseAction, type ParsedAction } from '../../../src/lib/ai-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:e4b-it-qat'
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
const GROQ_API_KEY = process.env.GROQ_API_KEY

type Provider = 'ollama' | 'groq'
type ChatRole = 'system' | 'user' | 'assistant'
interface ChatMessage {
  role: ChatRole
  content: string
}
interface AgentRequestBody {
  messages?: ChatMessage[]
  system?: string
  temperature?: number
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }

// Local Ollama in dev; Groq once deployed (VERCEL is set in that environment).
function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER
  if (explicit === 'ollama' || explicit === 'groq') return explicit
  if (process.env.VERCEL) return GROQ_API_KEY ? 'groq' : 'ollama'
  return 'ollama'
}

function providerOrder(): Provider[] {
  return resolveProvider() === 'groq' ? ['groq'] : ['ollama']
}

const DEFAULT_BASE_PROMPT =
  'You are the CapStoned assistant. You help staff manage mentorship tracks. ' +
  'Be concise and friendly, and reply in plain text (no markdown).'

export async function POST(req: Request): Promise<Response> {
  let body: AgentRequestBody
  try {
    body = (await req.json()) as AgentRequestBody
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { messages = [], system, temperature = 0.4 } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: '`messages` is required' }, 400)
  }

  const systemPrompt = buildToolSystemPrompt(system ?? DEFAULT_BASE_PROMPT)
  const fullMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...messages]

  for (const provider of providerOrder()) {
    const text = await completeFromProvider(provider, fullMessages, temperature)
    if (text !== null) {
      const action: ParsedAction | null = parseAction(text)
      return json({ text, action }, 200)
    }
  }

  return json(
    {
      error:
        'AI backend unavailable. Locally, run `ollama serve` and ensure the Gemma model is installed; ' +
        'in deployment, check GROQ_API_KEY.',
    },
    503,
  )
}

// Returns the full assistant message text, or null if the provider is
// unreachable / errored (so the caller can fall through to a 503).
async function completeFromProvider(
  provider: Provider,
  messages: ChatMessage[],
  temperature: number,
): Promise<string | null> {
  try {
    if (provider === 'groq') {
      const upstream = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature, stream: false }),
      })
      if (!upstream.ok) return null
      const data = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content
      return typeof content === 'string' ? content : null
    }

    const upstream = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, options: { temperature } }),
    })
    if (!upstream.ok) return null
    const data = (await upstream.json()) as { message?: { content?: string } }
    const content = data.message?.content
    return typeof content === 'string' ? content : null
  } catch {
    return null
  }
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}
