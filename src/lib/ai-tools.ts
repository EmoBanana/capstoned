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
/*  Roles                                                              */
/* ================================================================== */

/** The assistant's two personas. The signed-in user's account role maps
 *  to exactly one of these, and it decides which tools and prompt text
 *  the assistant may use. `student` -> Candidate, `recruiter` -> Company. */
export type AssistantRole = 'candidate' | 'company'

/** Map the raw account role to an assistant persona. Anything other than a
 *  recruiter, including a still-loading or signed-out state, defaults to the
 *  read-only Candidate persona so a Company set is never exposed by accident. */
export function assistantRoleFromUserRole(
  role: 'student' | 'recruiter' | null | undefined,
): AssistantRole {
  return role === 'recruiter' ? 'company' : 'candidate'
}

/* ================================================================== */
/*  Tool registry                                                      */
/* ================================================================== */

/**
 * A tool the model may invoke. `roles` lists the persona(s) allowed to use
 * it. `parameters` maps each arg name to a short human description (used
 * verbatim in the system prompt); `example` is a concrete args object shown
 * to the model so it copies the shape.
 */
export interface ToolDef {
  name: string
  description: string
  roles: AssistantRole[]
  parameters: Record<string, string>
  example: object
}

export const TOOLS: ToolDef[] = [
  {
    name: 'create_track',
    description:
      'Create a new mentorship track as a draft when the user asks to make, add, or set up a track.',
    roles: ['company'],
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
      'Search open tracks whenever the user asks anything factual about tracks — to find/browse/filter them, OR to answer comparative and aggregate questions (which track is longest, shortest, most intensive, needs the most hours, has open seats, or best fits them). Call it with NO args to get every open track, then answer from the returned data (each track includes duration, weekly hours, intensity, SLA, open seats, required skills, and the candidate\'s fit). Never claim you lack track data without searching first.',
    roles: ['candidate', 'company'],
    parameters: {
      query: 'string — optional free-text search over title/summary',
      skill: 'string — an optional skill to filter by, e.g. "React"',
      keyword: 'string — an optional domain/interest keyword, e.g. "backend"',
    },
    example: { skill: 'React' },
  },
  {
    name: 'recommend_track',
    description:
      "Recommend a single best-fit track when the user asks for a suggestion based on their interests or 12-Animals work-style archetype.",
    roles: ['candidate'],
    parameters: {
      interests: 'string[] — the user\'s stated interests, if any',
      animal: 'string — the user\'s 12-Animals archetype key, e.g. "owl", if known',
    },
    example: { interests: ['data', 'problem solving'], animal: 'owl' },
  },
  {
    name: 'apply_to_track',
    description:
      "Apply to an open track on the user's behalf when they ask to apply to, sign up for, or join a track. Identify the track by the company or track name they mention.",
    roles: ['candidate'],
    parameters: {
      track: 'string — the company or track name to apply to',
      note: 'string — an optional 1-2 sentence motivation for applying',
    },
    example: {
      track: 'Stripe',
      note: "I'm keen to deepen my backend skills on a real payments track.",
    },
  },
]

/** The tools a given persona is allowed to use. Used to build both the
 *  executor set on the client and the tool list in the system prompt, so
 *  the model is never even told about tools outside the user's role. */
export function toolsForRole(role: AssistantRole): ToolDef[] {
  return TOOLS.filter((tool) => tool.roles.includes(role))
}

/* ================================================================== */
/*  System prompt                                                      */
/* ================================================================== */

/** Base persona text for a Candidate. Discovery, matching, and applying
 *  only. Never authors tracks, never reaches company-private data. */
const PRODUCT_CONTEXT =
  'About CapStoned: a career-discovery platform where candidates experience real, mentored ' +
  'tracks at companies before committing to a path. Matching is a transparent weighted score ' +
  'across technical skills, interests, aspirations, work style (the 12-Animals archetype), and ' +
  'commitment. A company can back a promising mentee with a "micro-bond" — a small sponsorship in ' +
  'exchange for a short commitment — signed as a real contract. Everyone carries a reliability ' +
  'score built from their actions.'

export const CANDIDATE_BASE_PROMPT =
  'You are the CapStoned assistant for a Candidate. You help the candidate understand their ' +
  'work style, discover open mentorship tracks, get data-backed recommendations, and apply to a ' +
  'track on their behalf when they ask. Be warm and concise, and reply in plain text with no ' +
  'markdown. ' +
  PRODUCT_CONTEXT +
  ' Candidate areas you can explain and point to by name: the "AI Assessment" tab (take the ' +
  '12-Animals work-style quiz for a weighted fit report — if the user asks to "do my AI ' +
  'assessment", tell them it lives on the AI Assessment tab and offer to recommend a best-fit ' +
  'track meanwhile using their profile); the Marketplace (browse open tracks); My Applications ' +
  '(status and the guaranteed-interview countdown); My Mentorship (their enrolled track, tasks, ' +
  'mentor feedback, and any micro-bond offer to sign); and Settings (edit their profile). Answer ' +
  'product questions and guide the user to the right tab rather than saying you cannot help. You ' +
  'never create or edit tracks, and you never surface other people or company-private data. If ' +
  'the user asks for a Company task such as creating a track, explain it is only available on a ' +
  'Company account.'

/** Base persona text for a Company. Authoring and managing tracks only.
 *  Never applies on anyone's behalf. */
export const COMPANY_BASE_PROMPT =
  'You are the CapStoned assistant for a Company. You help the recruiter author and manage ' +
  'mentorship tracks and search open tracks. Be warm and concise, and reply in plain text with ' +
  'no markdown. ' +
  PRODUCT_CONTEXT +
  ' Company areas you can explain and point to by name: the Dashboard (your tracks with live ' +
  'applicant and mentee counts, and edit/close); New Track (publish a track); Applicants (review ' +
  'and accept — accepting opens a real mentorship); Mentees (progress, tasks you approve, feedback ' +
  'you leave, and micro-bond offers); the AI Assessment tab (a per-mentee weighted match report); ' +
  'and Settings (edit your company profile). Guide the user to the right tab rather than refusing. ' +
  'You never apply to tracks on anyone\'s behalf and you never act as a candidate. If the user ' +
  'asks for a Candidate task such as applying to a track, explain it is only available on a ' +
  'Candidate account.'

/** The role-specific base prompt. Defaults to the Candidate persona. */
export function basePromptForRole(role: AssistantRole): string {
  return role === 'company' ? COMPANY_BASE_PROMPT : CANDIDATE_BASE_PROMPT
}

/**
 * Append tool-calling instructions to a base system prompt, advertising
 * ONLY the tools passed in. The result tells the model exactly how and when
 * to emit a ```action block, lists each allowed tool with its parameters,
 * and shows a concrete example per tool.
 */
export function buildToolSystemPrompt(base: string, tools: ToolDef[]): string {
  const toolLines = tools.map((tool) => {
    const params = Object.entries(tool.parameters)
      .map(([name, desc]) => `      - ${name}: ${desc}`)
      .join('\n')
    const example = JSON.stringify({ tool: tool.name, args: tool.example })
    return `- ${tool.name}: ${tool.description}\n    args:\n${params}\n    example: ${example}`
  }).join('\n')

  return `${base}

---
TOOLS

You can take real actions by calling tools. Only when the user asks you to DO something that a tool covers should you respond with a SINGLE fenced code block tagged \`action\` containing one JSON object and nothing else, with no prose around it:

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
      summary: `Created draft track "${title}": ${durationWeeks} weeks, ${weeklyHours} h/week, ${intensity}${skillText}.`,
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
      .map((t) => `${t.title} using ${t.skills.join(', ')} over ${t.durationWeeks}w`)
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
      summary: `Recommended "${pick.title}"${basis}. It builds ${pick.skills.join(', ')} over ${pick.durationWeeks} weeks.`,
      data: { track: pick },
    }
  },

  // PLACEHOLDER — echoes a "would apply to X" summary. No real application is
  // submitted here. The REAL executor (injected by TrackAssistantConnected)
  // calls the Convex `applications.apply` mutation against live data.
  async apply_to_track(args) {
    const track = asString(args.track).trim() || 'that track'
    const note = asString(args.note).trim()
    const noteText = note ? ` with the note "${note}"` : ''
    return {
      ok: true,
      summary: `Would apply to ${track}${noteText}. Demo mode: no real application was submitted.`,
      data: { track, note, status: 'stub' },
    }
  },
}
