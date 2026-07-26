// Streaming chat endpoint with two backends, selected by environment:
//   - Ollama (local Gemma) for development / the live demo
//   - Groq (Llama 3.3 70B, OpenAI-compatible) for the deployed Vercel link,
//     which cannot reach a localhost Ollama server.
// Local always uses Gemma; the deployed link always uses Groq. No simulated
// fallback — if the backend is down the route returns a real 503 so failures
// are visible rather than masked by fake output.

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
interface ChatRequestBody {
  messages?: ChatMessage[]
  system?: string
  temperature?: number
}

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache',
}

// Prefer hosted Groq whenever a key is present (dev too, so it works without a
// local Ollama), else fall back to local Ollama. AI_PROVIDER forces one.
function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER
  if (explicit === 'ollama' || explicit === 'groq') return explicit
  return GROQ_API_KEY ? 'groq' : 'ollama'
}

// Try the preferred provider, then the other as a fallback. Groq is only tried
// when a key exists.
function providerOrder(): Provider[] {
  const primary = resolveProvider()
  const order: Provider[] = primary === 'groq' ? ['groq', 'ollama'] : ['ollama', 'groq']
  return order.filter((p) => (p === 'groq' ? Boolean(GROQ_API_KEY) : true))
}

export async function POST(req: Request): Promise<Response> {
  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { messages = [], system, temperature = 0.7 } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('`messages` is required', { status: 400 })
  }

  const fullMessages: ChatMessage[] = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  for (const provider of providerOrder()) {
    const res = await streamFromProvider(provider, fullMessages, temperature)
    if (res) return res
  }
  return new Response(
    'AI backend unavailable. Locally, run `ollama serve` and ensure the Gemma model is installed; ' +
      'in deployment, check GROQ_API_KEY.',
    { status: 503, headers: TEXT_HEADERS },
  )
}

async function streamFromProvider(
  provider: Provider,
  messages: ChatMessage[],
  temperature: number,
): Promise<Response | null> {
  try {
    const upstream =
      provider === 'groq'
        ? await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({ model: GROQ_MODEL, messages, temperature, stream: true }),
          })
        : await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true, options: { temperature } }),
          })

    if (!upstream.ok || !upstream.body) return null
    const parseLine = provider === 'groq' ? parseGroqLine : parseOllamaLine
    return new Response(toTextStream(upstream.body, parseLine), { headers: TEXT_HEADERS })
  } catch {
    return null
  }
}

interface ParsedToken {
  token?: string
  done?: boolean
}

// Ollama streams newline-delimited JSON: { message: { content }, done }.
function parseOllamaLine(line: string): ParsedToken {
  try {
    const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
    return { token: json.message?.content, done: json.done }
  } catch {
    return {}
  }
}

// Groq streams OpenAI SSE: `data: { choices: [{ delta: { content } }] }` / `data: [DONE]`.
function parseGroqLine(line: string): ParsedToken {
  if (!line.startsWith('data:')) return {}
  const data = line.slice(5).trim()
  if (data === '[DONE]') return { done: true }
  try {
    const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
    return { token: json.choices?.[0]?.delta?.content }
  } catch {
    return {}
  }
}

// Re-emit whatever the upstream sends as a plain-text token stream, so the
// client can append chunks directly regardless of provider wire format.
function toTextStream(
  upstream: ReadableStream<Uint8Array>,
  parseLine: (line: string) => ParsedToken,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = upstream.getReader()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let newline: number
          while ((newline = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (!line) continue
            const { token, done: finished } = parseLine(line)
            if (token) controller.enqueue(encoder.encode(token))
            if (finished) {
              controller.close()
              return
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() {
      void reader.cancel()
    },
  })
}
