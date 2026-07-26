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

import {
  basePromptForRole,
  buildToolSystemPrompt,
  parseAction,
  toolsForRole,
  type AssistantRole,
  type ParsedAction,
} from '../../../src/lib/ai-tools'

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
  /** The signed-in user's assistant persona. Scopes which tools the model
   *  is told about. Anything other than 'company' is treated as Candidate. */
  role?: string
}

/** Narrow the client-supplied role to a known persona, defaulting to the
 *  read-only Candidate set so a Company tool set is never exposed by a bad
 *  or missing value. */
function resolveRole(role: string | undefined): AssistantRole {
  return role === 'company' ? 'company' : 'candidate'
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

export async function POST(req: Request): Promise<Response> {
  let body: AgentRequestBody
  try {
    body = (await req.json()) as AgentRequestBody
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { messages = [], system, temperature = 0.4, role } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: '`messages` is required' }, 400)
  }

  // Build the prompt from ONLY the tools this role may use, so the model is
  // never told about actions outside the user's persona.
  const assistantRole = resolveRole(role)
  const base = system ?? basePromptForRole(assistantRole)
  const systemPrompt = buildToolSystemPrompt(base, toolsForRole(assistantRole))
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
