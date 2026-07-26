/* ------------------------------------------------------------------ */
/*  CapStoned — AI tool-calling protocol (provider-agnostic)            */
/*                                                                      */
/*  The app runs local Gemma via Ollama in dev and Groq in deploy.      */
/*  Gemma's native tool-calling through Ollama is unreliable, so we do  */
/*  NOT depend on OpenAI-style `tools` / `tool_calls`. Instead the      */
/*  model is instructed (see buildToolSystemPrompt) to reply with       */
/*  EITHER normal prose OR a single fenced ```action JSON block when it  */
/*  wants to act. parseAction extracts that block; an executor runs it;  */
/*  the result is fed back to the model, which writes the final reply.  */
/*                                                                      */
/*  Pure module: no React, no server-only imports. Safe on client +     */
/*  server (the /api/agent route reuses buildToolSystemPrompt +         */
/*  parseAction; TrackAssistant.tsx runs the executors).                */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  Tool registry                                                      */
/* ================================================================== */

/**
 * A tool the model may invoke. `parameters` maps each arg name to a
 * short human description (used verbatim in the system prompt); `example`
 * is a concrete args object shown to the model so it copies the shape.
 */
export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, string>
  example: object
}

export const TOOLS: ToolDef[] = [
  {
    name: 'create_track',
    description:
      'Create a new mentorship track (as a draft) when the user asks to make, add, or set up a track.',
    parameters: {
      title: 'string — the track name',
      skills: 'string[] — skills/technologies the track requires',
      durationWeeks: 'number — how many weeks the track runs',
      weeklyHours: 'number — expected hours per week',
      intensity: "string — one of 'light' | 'moderate' | 'intense'",
      description: 'string — a one or two sentence summary of the track',
    },
    example: {
      title: 'Backend Intern Track',
      skills: ['Go', 'PostgreSQL'],
      durationWeeks: 8,
      weeklyHours: 10,
      intensity: 'moderate',
      description: 'Hands-on backend fundamentals for interns building real services.',
    },
  },
  {
    name: 'search_tracks',
    description:
      'Search existing open tracks when the user wants to find, browse, or filter tracks. Provide any of the fields; leave the rest out.',
    parameters: {
      query: 'string — free-text search over title/summary (optional)',
      skill: 'string — a specific skill to filter by, e.g. "React" (optional)',
      keyword: 'string — a domain/interest keyword, e.g. "backend" (optional)',
    },
    example: { skill: 'React' },
  },
  {
    name: 'recommend_track',
    description:
      "Recommend a single best-fit track when the user asks for a suggestion based on their interests or 12-Animals work-style archetype.",
    parameters: {
      interests: 'string[] — the user\'s stated interests (optional)',
      animal: 'string — the user\'s 12-Animals archetype key, e.g. "owl" (optional)',
    },
    example: { interests: ['data', 'problem solving'], animal: 'owl' },
  },
]

/* ================================================================== */
/*  System prompt                                                      */
/* ================================================================== */

/**
 * Append tool-calling instructions to a base system prompt. The result
 * tells the model exactly how and when to emit a ```action block, lists
 * every tool with its parameters, and shows a concrete example per tool.
 */
export function buildToolSystemPrompt(base: string): string {
  const toolLines = TOOLS.map((tool) => {
    const params = Object.entries(tool.parameters)
      .map(([name, desc]) => `      - ${name}: ${desc}`)
      .join('\n')
    const example = JSON.stringify({ tool: tool.name, args: tool.example })
    return `- ${tool.name}: ${tool.description}\n    args:\n${params}\n    example: ${example}`
  }).join('\n')

  return `${base}

---
TOOLS

You can take real actions by calling tools. When (and only when) the user asks you to DO something that a tool covers, respond with a SINGLE fenced code block tagged \`action\` containing one JSON object — nothing else, no prose around it:

\`\`\`action
{ "tool": "<tool name>", "args": { ... } }
\`\`\`

Rules:
- Emit at most ONE action block per reply, and only when the user is asking you to act.
- The block must be valid JSON with exactly two keys: "tool" and "args".
- Only use a tool listed below, and only the args it defines. Omit optional args you don't have.
- Do NOT invent tool results. After you emit an action you will receive the tool's real result and then write the final natural-language reply.
- If the user is just chatting, asking a question, or you have already received a tool result, reply normally in plain prose with NO action block.

Available tools:
${toolLines}`
}

/* ================================================================== */
/*  Action parsing                                                     */
/* ================================================================== */

/** A parsed tool invocation extracted from a model reply. */
export interface ParsedAction {
  tool: string
  args: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coerce arbitrary JSON into a ParsedAction, or null if it doesn't have
 * a string `tool`. A missing/invalid `args` is tolerated as `{}`.
 */
function toParsedAction(value: unknown): ParsedAction | null {
  if (!isRecord(value)) return null
  const tool = value.tool
  if (typeof tool !== 'string' || tool.length === 0) return null
  const args = isRecord(value.args) ? value.args : {}
  return { tool, args }
}

/**
 * Extract the first balanced `{...}` JSON object starting at or after
 * `from`, respecting string literals so braces inside strings don't
 * throw off the depth count. Returns the substring or null.
 */
function extractJsonObject(text: string, from = 0): string | null {
  const start = text.indexOf('{', from)
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function tryParse(candidate: string): ParsedAction | null {
  try {
    return toParsedAction(JSON.parse(candidate))
  } catch {
    return null
  }
}

/**
 * Robustly extract the first tool action from a model reply. Handles:
 *   - a proper ```action fenced block,
 *   - any other fenced block whose JSON looks like an action,
 *   - a bare {"tool":...} object embedded in prose (no fences).
 * Returns null when the text contains no recognisable action — i.e. it's
 * an ordinary chat reply.
 */
export function parseAction(modelText: string): ParsedAction | null {
  if (!modelText) return null

  // 1. Preferred: an ```action fenced block. Tolerate casing/whitespace.
  const fenceRe = /```[ \t]*action[ \t]*\r?\n([\s\S]*?)```/i
  const fenced = fenceRe.exec(modelText)
  if (fenced) {
    const body = extractJsonObject(fenced[1]) ?? fenced[1].trim()
    const parsed = tryParse(body)
    if (parsed) return parsed
  }

  // 2. Any other fenced block that parses into an action shape.
  const anyFenceRe = /```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/g
  for (let m = anyFenceRe.exec(modelText); m; m = anyFenceRe.exec(modelText)) {
    const body = extractJsonObject(m[1]) ?? m[1].trim()
    const parsed = tryParse(body)
    if (parsed) return parsed
  }

  // 3. Last resort: scan for a bare {...} object anywhere that has a "tool".
  let searchFrom = modelText.indexOf('{')
  while (searchFrom !== -1) {
    const obj = extractJsonObject(modelText, searchFrom)
    if (!obj) break
    if (obj.includes('"tool"')) {
      const parsed = tryParse(obj)
      if (parsed) return parsed
    }
    searchFrom = modelText.indexOf('{', searchFrom + 1)
  }

  return null
}

/* ================================================================== */
/*  Executors                                                          */
/* ================================================================== */

/** The outcome of running a tool. `summary` is shown to the user and fed
 *  back to the model; `data` is optional structured payload. */
export type ToolResult = { ok: boolean; summary: string; data?: unknown }

/** Maps a tool name to the function that performs it. Injected into the
 *  UI so real Convex-backed executors can replace the stubs at mount. */
export type ToolExecutors = Record<
  string,
  (args: Record<string, unknown>) => Promise<ToolResult>
>

/* ---- small arg-narrowing helpers (strict, no `any`) -------------- */

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    // Tolerate a comma-separated string where an array was expected.
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

/* ---- canned data for the stub executors -------------------------- */
/* NOTE: PLACEHOLDER data. These stubs let the whole agent loop run    */
/* end-to-end without a backend. Real executors that call Convex        */
/* mutations/queries are injected via TrackAssistant's `executors`      */
/* prop at mount — see the file header + component docs.                */

interface StubTrack {
  title: string
  skills: string[]
  durationWeeks: number
  keywords: string[]
}

const CANNED_TRACKS: StubTrack[] = [
  { title: 'Frontend Foundations', skills: ['React', 'TypeScript', 'CSS'], durationWeeks: 6, keywords: ['frontend', 'web', 'ui'] },
  { title: 'Backend Intern Track', skills: ['Go', 'PostgreSQL', 'Docker'], durationWeeks: 8, keywords: ['backend', 'api', 'infra'] },
  { title: 'Data & Analytics Sprint', skills: ['Python', 'SQL', 'Pandas'], durationWeeks: 5, keywords: ['data', 'analytics', 'research'] },
  { title: 'Product Design Studio', skills: ['Figma', 'User Research'], durationWeeks: 7, keywords: ['design', 'ux', 'product'] },
]

function matchesTrack(track: StubTrack, needle: string): boolean {
  const hay = [track.title, ...track.skills, ...track.keywords].join(' ').toLowerCase()
  return hay.includes(needle.toLowerCase())
}

/**
 * Deterministic placeholder executors. Every one is safe to run offline
 * and returns a plausible ToolResult. Swap for real Convex-backed
 * executors by passing an `executors` prop to <TrackAssistant/>.
 */
export const STUB_EXECUTORS: ToolExecutors = {
  // PLACEHOLDER — echoes the args back as a "created draft". A real
  // executor would call a Convex `tracks.create` mutation.
  async create_track(args) {
    const title = asString(args.title).trim() || 'Untitled Track'
    const skills = asStringArray(args.skills)
    const durationWeeks = asNumber(args.durationWeeks, 6)
    const weeklyHours = asNumber(args.weeklyHours, 8)
    const intensity = asString(args.intensity, 'moderate')
    const description = asString(args.description)
    const skillText = skills.length > 0 ? ` requiring ${skills.join(', ')}` : ''
    return {
      ok: true,
      summary: `Created track "${title}" (draft) — ${durationWeeks} weeks, ${weeklyHours} h/week, ${intensity}${skillText}.`,
      data: { title, skills, durationWeeks, weeklyHours, intensity, description, status: 'draft' },
    }
  },

  // PLACEHOLDER — filters a canned in-memory list. A real executor would
  // query Convex `tracks.list` and filter/rank the live results.
  async search_tracks(args) {
    const needle =
      asString(args.skill) || asString(args.keyword) || asString(args.query)
    const results = needle
      ? CANNED_TRACKS.filter((t) => matchesTrack(t, needle))
      : CANNED_TRACKS
    if (results.length === 0) {
      return { ok: true, summary: `No tracks matched "${needle}".`, data: { tracks: [] } }
    }
    const list = results
      .map((t) => `${t.title} (${t.skills.join(', ')}, ${t.durationWeeks}w)`)
      .join('; ')
    const scope = needle ? ` matching "${needle}"` : ''
    return {
      ok: true,
      summary: `Found ${results.length} track${results.length === 1 ? '' : 's'}${scope}: ${list}.`,
      data: { tracks: results },
    }
  },

  // PLACEHOLDER — picks a canned track by interest/animal keyword. A real
  // executor would run the weighted match against live tracks.
  async recommend_track(args) {
    const interests = asStringArray(args.interests)
    const animal = asString(args.animal)
    const signals = [...interests, animal].filter(Boolean)
    const pick =
      signals
        .map((s) => CANNED_TRACKS.find((t) => matchesTrack(t, s)))
        .find((t): t is StubTrack => t !== undefined) ?? CANNED_TRACKS[0]
    const basis = signals.length > 0 ? ` based on ${signals.join(', ')}` : ''
    return {
      ok: true,
      summary: `Recommended "${pick.title}"${basis} — builds ${pick.skills.join(', ')} over ${pick.durationWeeks} weeks.`,
      data: { track: pick },
    }
  },
}
