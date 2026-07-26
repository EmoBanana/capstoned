/* ------------------------------------------------------------------ */
/*  CapStoned — concept relatedness                                     */
/*                                                                      */
/*  Matching used to be pure string equality, so "Frontend Engineer"    */
/*  scored 0 against "prototyping" or "React" even though they're        */
/*  obviously related. This module gives a deterministic 0..1 semantic   */
/*  relatedness between two concepts (skills / interests / aspirations / */
/*  domain tags) via a curated ontology + a lexical fallback. No ML,     */
/*  no network — just a hand-tuned graph over the vocabulary we use.     */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.trim().toLowerCase()

/** Generic words that shouldn't, on their own, imply relatedness. */
const STOP = new Set(['engineer', 'engineering', 'developer', 'dev', 'senior', 'junior', 'the', 'a', 'an', 'of', 'and', 'for'])

/** Crude stemmer: lowercase alpha tokens, drop stopwords, strip a few suffixes. */
function tokens(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9+]+/)
    .filter(Boolean)
    .map((t) => t.replace(/(ing|ers|er|s)$/, ''))
    .filter((t) => t.length > 1 && !STOP.has(t) && !STOP.has(t + 'r') && !STOP.has(t + 'ing'))
}

/* Clusters of related concepts. Any two members of the same cluster are
   treated as related. Terms may appear in several clusters (e.g. React sits
   in both frontend and product). Keep entries lowercased. */
const CLUSTERS: string[][] = [
  // Frontend / UI
  ['frontend engineer', 'frontend developer', 'product engineer', 'ui engineering', 'react',
   'typescript', 'javascript', 'design systems', 'prototyping', 'figma', 'web', 'frontend',
   'mobile engineer', 'maps sdk', 'accessibility'],
  // Product design
  ['product designer', 'ux researcher', 'ux research', 'user research', 'figma', 'prototyping',
   'design', 'design systems', 'ui engineering', 'product'],
  // Machine learning / research
  ['ml engineer', 'researcher', 'research', 'machine learning', 'python', 'tensorflow', 'pytorch',
   'mlops', 'data science', 'sql', 'ai', 'ml', 'cuda', 'performance'],
  // Backend / platform / reliability
  ['backend engineer', 'platform engineer', 'sre', 'systems engineer', 'go', 'node.js', 'postgresql',
   'sql', 'grpc', 'rest apis', 'apis', 'distributed systems', 'systems', 'reliability', 'scalability',
   'backend', 'platform', 'payments', 'developer tools', 'java', 'commerce'],
  // Accelerated computing / HPC
  ['systems engineer', 'cuda', 'c++', 'pytorch', 'performance', 'hpc', 'gpu', 'accelerated computing'],
  // Mobility
  ['mobile engineer', 'maps', 'maps sdk', 'mobility', 'frontend engineer'],
]

/** term -> set of related terms (0.6), built once from the clusters. */
const RELATED: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (!m.has(a)) m.set(a, new Set())
    m.get(a)!.add(b)
  }
  for (const cluster of CLUSTERS) {
    const c = cluster.map(norm)
    for (const a of c) for (const b of c) if (a !== b) link(a, b)
  }
  return m
})()

/** Lexical similarity via shared meaningful stems (0..~0.75). */
function lexical(a: string, b: string): number {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  if (shared === 0) return 0
  const jaccard = shared / (ta.size + tb.size - shared)
  return Math.min(0.75, 0.35 + 0.55 * jaccard)
}

/**
 * Semantic relatedness of two concepts, 0..1.
 * 1 = identical, ~0.6 = curated related, up to ~0.75 = strong lexical overlap,
 * 0 = unrelated.
 */
export function relatedness(a: string, b: string): number {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return 1
  const curated = RELATED.get(na)?.has(nb) ? 0.6 : 0
  return Math.max(curated, lexical(na, nb))
}

/** Best-matching term in `pool` for `term`, with its relatedness. */
export function bestMatch(term: string, pool: string[]): { term: string; r: number } {
  let best = { term: '', r: 0 }
  for (const p of pool) {
    const r = relatedness(term, p)
    if (r > best.r) best = { term: p, r }
  }
  return best
}

/**
 * How well `have` covers `want`, 0..1: for each wanted concept, take the best
 * relatedness to anything the candidate has, then average. Related concepts
 * earn partial credit instead of the old all-or-nothing exact match.
 */
export function coverage(want: string[], have: string[]): number {
  if (want.length === 0) return 0
  if (have.length === 0) return 0
  const total = want.reduce((sum, w) => sum + bestMatch(w, have).r, 0)
  return total / want.length
}
