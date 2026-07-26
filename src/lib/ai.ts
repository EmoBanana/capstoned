// Client helper for the streaming /api/chat endpoint (Gemma locally, Groq on
// Vercel). Appends tokens as they arrive; resolves with the full text.

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatOptions {
  system?: string
  temperature?: number
  signal?: AbortSignal
  /** Called for every streamed chunk, with the chunk and the accumulated text. */
  onToken?: (chunk: string, full: string) => void
}

export async function streamChat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: opts.system, temperature: opts.temperature }),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Chat request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      full += chunk
      opts.onToken?.(chunk, full)
    }
  }
  return full
}
