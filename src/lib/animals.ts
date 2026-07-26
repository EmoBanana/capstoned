/* ------------------------------------------------------------------ */
/*  CapStoned — The 12 Animals roster, quiz, and scoring               */
/*                                                                      */
/*  Pure data + one pure function. The animals are the discovery hook:  */
/*  a fast, qualitative work-style archetype. A short quiz accumulates  */
/*  trait weights, and scoreQuizToAnimal picks the nearest archetype.   */
/* ------------------------------------------------------------------ */

import {
  ANIMAL_KEYS,
  TRAIT_KEYS,
  type Animal,
  type AnimalKey,
  type AnimalTraits,
  type QuizAnswers,
  type QuizQuestion,
  type TraitKey,
} from './domain'

/* ================================================================== */
/*  The roster                                                         */
/* ================================================================== */

export const ANIMALS: Record<AnimalKey, Animal> = {
  owl: {
    key: 'owl',
    emoji: '🦉',
    name: 'The Analyst',
    tagline: 'Methodical, evidence-first.',
    description:
      'Owls dig until the data is clean and the answer is defensible. They thrive on research, QA, and problems that reward patience over speed.',
    suitedTags: ['research', 'data', 'qa', 'analytics'],
    traits: {
      analytical: 92,
      creative: 30,
      independent: 65,
      collaborative: 50,
      structured: 88,
      adaptive: 35,
    },
  },
  eagle: {
    key: 'eagle',
    emoji: '🦅',
    name: 'The Visionary',
    tagline: 'Sees the whole board.',
    description:
      'Eagles zoom out to strategy and product direction, connecting dots others miss. They set the destination and trust others to fly the legs.',
    suitedTags: ['strategy', 'product', 'vision'],
    traits: {
      analytical: 78,
      creative: 82,
      independent: 80,
      collaborative: 55,
      structured: 45,
      adaptive: 70,
    },
  },
  fox: {
    key: 'fox',
    emoji: '🦊',
    name: 'The Adaptor',
    tagline: 'Comfortable in the fog.',
    description:
      'Foxes are at home in ambiguity, pivoting fast as the ground shifts. They flourish in early-stage startups and generalist roles.',
    suitedTags: ['startup', 'generalist', 'growth'],
    traits: {
      analytical: 60,
      creative: 65,
      independent: 75,
      collaborative: 50,
      structured: 30,
      adaptive: 92,
    },
  },
  wolf: {
    key: 'wolf',
    emoji: '🐺',
    name: 'The Driver',
    tagline: 'Decisive and outcome-focused.',
    description:
      'Wolves push work over the line. They own delivery and operations, making the call when others hesitate and keeping the pack moving.',
    suitedTags: ['ops', 'delivery', 'operations'],
    traits: {
      analytical: 62,
      creative: 30,
      independent: 70,
      collaborative: 58,
      structured: 82,
      adaptive: 55,
    },
  },
  dolphin: {
    key: 'dolphin',
    emoji: '🐬',
    name: 'The Connector',
    tagline: 'Reads the room, builds the bridge.',
    description:
      'Dolphins turn relationships into momentum. They shine in client-facing, marketing, and people roles where communication is the work.',
    suitedTags: ['client', 'marketing', 'people', 'sales'],
    traits: {
      analytical: 45,
      creative: 68,
      independent: 35,
      collaborative: 92,
      structured: 40,
      adaptive: 72,
    },
  },
  beaver: {
    key: 'beaver',
    emoji: '🦫',
    name: 'The Builder',
    tagline: 'Hands-on. Ships.',
    description:
      'Beavers are happiest constructing something real and durable. They live in engineering, turning specs into working, well-made systems.',
    suitedTags: ['engineering', 'backend', 'infrastructure'],
    traits: {
      analytical: 75,
      creative: 45,
      independent: 62,
      collaborative: 55,
      structured: 85,
      adaptive: 48,
    },
  },
  bee: {
    key: 'bee',
    emoji: '🐝',
    name: 'The Coordinator',
    tagline: 'Process is a superpower.',
    description:
      'Bees keep the hive in sync. They excel at project management, dependencies, and the reliable cadence that lets everyone else move fast.',
    suitedTags: ['project-management', 'process', 'coordination'],
    traits: {
      analytical: 58,
      creative: 32,
      independent: 40,
      collaborative: 85,
      structured: 92,
      adaptive: 42,
    },
  },
  peacock: {
    key: 'peacock',
    emoji: '🦚',
    name: 'The Creator',
    tagline: 'Expressive craft, on display.',
    description:
      'Peacocks lead with taste and originality. They own design, content, and brand, where a distinctive point of view is the deliverable.',
    suitedTags: ['design', 'content', 'brand', 'creative'],
    traits: {
      analytical: 35,
      creative: 95,
      independent: 60,
      collaborative: 58,
      structured: 38,
      adaptive: 68,
    },
  },
  tortoise: {
    key: 'tortoise',
    emoji: '🐢',
    name: 'The Specialist',
    tagline: 'Patient mastery of one deep domain.',
    description:
      'Tortoises go deep, not wide, compounding expertise over years. They thrive in specialised domains that reward rigour and staying power.',
    suitedTags: ['specialist', 'deep-domain', 'research'],
    traits: {
      analytical: 85,
      creative: 35,
      independent: 78,
      collaborative: 38,
      structured: 88,
      adaptive: 28,
    },
  },
  octopus: {
    key: 'octopus',
    emoji: '🐙',
    name: 'The Generalist',
    tagline: 'Many hats, all at once.',
    description:
      'Octopuses juggle full-stack, multi-hat roles with ease, wiring themselves into whatever needs doing. Versatility is their edge.',
    suitedTags: ['full-stack', 'generalist', 'multi-disciplinary'],
    traits: {
      analytical: 68,
      creative: 62,
      independent: 72,
      collaborative: 60,
      structured: 55,
      adaptive: 85,
    },
  },
  ant: {
    key: 'ant',
    emoji: '🐜',
    name: 'The Executor',
    tagline: 'Disciplined, relentless follow-through.',
    description:
      'Ants turn a long list into a finished one. They thrive on execution-heavy work where consistency and persistence carry the day.',
    suitedTags: ['execution', 'support', 'operations'],
    traits: {
      analytical: 55,
      creative: 28,
      independent: 45,
      collaborative: 78,
      structured: 90,
      adaptive: 40,
    },
  },
  lion: {
    key: 'lion',
    emoji: '🦁',
    name: 'The Leader',
    tagline: 'Rallies people, takes ownership.',
    description:
      'Lions set direction and get others to follow. They step into management, own the outcome, and shoulder responsibility for the pride.',
    suitedTags: ['management', 'leadership', 'team-lead'],
    traits: {
      analytical: 60,
      creative: 55,
      independent: 82,
      collaborative: 80,
      structured: 60,
      adaptive: 62,
    },
  },
}

/* ================================================================== */
/*  The quiz — 7 questions, options carry trait weightings            */
/* ================================================================== */

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'A new project lands on your desk. Your first move is to…',
    options: [
      {
        id: 'q1a',
        label: 'Break it into a structured plan with clear milestones.',
        traitWeights: { structured: 30, analytical: 15 },
      },
      {
        id: 'q1b',
        label: 'Sketch a bold vision for where it could go.',
        traitWeights: { creative: 25, independent: 15 },
      },
      {
        id: 'q1c',
        label: 'Start building a rough version to learn by doing.',
        traitWeights: { adaptive: 25, independent: 15 },
      },
      {
        id: 'q1d',
        label: 'Pull the right people together and align on it.',
        traitWeights: { collaborative: 30, structured: 10 },
      },
    ],
  },
  {
    id: 'q2',
    prompt: 'You do your best work when…',
    options: [
      {
        id: 'q2a',
        label: 'Left alone to go deep on a hard problem.',
        traitWeights: { independent: 30, analytical: 15 },
      },
      {
        id: 'q2b',
        label: 'Bouncing energy off a tight-knit team.',
        traitWeights: { collaborative: 30, adaptive: 10 },
      },
      {
        id: 'q2c',
        label: 'Following a proven, repeatable process.',
        traitWeights: { structured: 30, analytical: 10 },
      },
      {
        id: 'q2d',
        label: 'The rules are loose and I can improvise.',
        traitWeights: { adaptive: 30, creative: 15 },
      },
    ],
  },
  {
    id: 'q3',
    prompt: 'Which compliment lands best?',
    options: [
      {
        id: 'q3a',
        label: '"Your analysis was airtight."',
        traitWeights: { analytical: 30, structured: 10 },
      },
      {
        id: 'q3b',
        label: '"That was so original."',
        traitWeights: { creative: 30, independent: 10 },
      },
      {
        id: 'q3c',
        label: '"You kept the whole thing on track."',
        traitWeights: { structured: 25, collaborative: 15 },
      },
      {
        id: 'q3d',
        label: '"You brought everyone together."',
        traitWeights: { collaborative: 30, adaptive: 10 },
      },
    ],
  },
  {
    id: 'q4',
    prompt: 'The plan just changed mid-flight. You…',
    options: [
      {
        id: 'q4a',
        label: 'Love it — improvising is where I thrive.',
        traitWeights: { adaptive: 30, creative: 10 },
      },
      {
        id: 'q4b',
        label: 'Re-plan carefully before moving again.',
        traitWeights: { structured: 30, analytical: 10 },
      },
      {
        id: 'q4c',
        label: 'Make a fast call and drive forward.',
        traitWeights: { independent: 25, adaptive: 15 },
      },
      {
        id: 'q4d',
        label: 'Check in with the team to re-align.',
        traitWeights: { collaborative: 30 },
      },
    ],
  },
  {
    id: 'q5',
    prompt: 'Pick the work that energises you most.',
    options: [
      {
        id: 'q5a',
        label: 'Designing something people will see and feel.',
        traitWeights: { creative: 30, adaptive: 10 },
      },
      {
        id: 'q5b',
        label: 'Getting a complex system to actually work.',
        traitWeights: { analytical: 20, structured: 20 },
      },
      {
        id: 'q5c',
        label: 'Mastering one domain deeply over time.',
        traitWeights: { independent: 25, analytical: 15 },
      },
      {
        id: 'q5d',
        label: 'Wearing many hats across the whole product.',
        traitWeights: { adaptive: 25, collaborative: 15 },
      },
    ],
  },
  {
    id: 'q6',
    prompt: 'In a group project, you naturally become the…',
    options: [
      {
        id: 'q6a',
        label: 'Person who sets direction and rallies everyone.',
        traitWeights: { independent: 20, collaborative: 20 },
      },
      {
        id: 'q6b',
        label: 'Person who tracks tasks and keeps us on schedule.',
        traitWeights: { structured: 30, collaborative: 10 },
      },
      {
        id: 'q6c',
        label: 'Person who quietly does the heavy execution.',
        traitWeights: { structured: 20, independent: 15 },
      },
      {
        id: 'q6d',
        label: 'Person who dreams up the bold idea.',
        traitWeights: { creative: 30, independent: 10 },
      },
    ],
  },
  {
    id: 'q7',
    prompt: 'What frustrates you most at work?',
    options: [
      {
        id: 'q7a',
        label: 'Sloppy reasoning and untested assumptions.',
        traitWeights: { analytical: 30, structured: 10 },
      },
      {
        id: 'q7b',
        label: 'Rigid process that kills momentum.',
        traitWeights: { adaptive: 30, creative: 10 },
      },
      {
        id: 'q7c',
        label: 'Poor communication and people out of sync.',
        traitWeights: { collaborative: 30 },
      },
      {
        id: 'q7d',
        label: 'Shallow work that never goes deep enough.',
        traitWeights: { independent: 20, analytical: 20 },
      },
    ],
  },
]

/* ================================================================== */
/*  Scoring                                                            */
/* ================================================================== */

const ZERO_TRAITS: AnimalTraits = {
  analytical: 0,
  creative: 0,
  independent: 0,
  collaborative: 0,
  structured: 0,
  adaptive: 0,
}

/** Maximum possible Euclidean distance across six 0..100 axes. */
const MAX_TRAIT_DISTANCE = Math.sqrt(TRAIT_KEYS.length * 100 * 100)

function euclideanTraitDistance(a: AnimalTraits, b: AnimalTraits): number {
  let sum = 0
  for (const key of TRAIT_KEYS) {
    const d = a[key] - b[key]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * Trait-space similarity of two vectors, 0..100 (100 = identical).
 * Exported for reuse by the working-style match factor.
 */
export function traitSimilarity(a: AnimalTraits, b: AnimalTraits): number {
  const distance = euclideanTraitDistance(a, b)
  return Math.round((1 - distance / MAX_TRAIT_DISTANCE) * 100)
}

/**
 * Accumulate the trait weights of the chosen quiz options into a single
 * vector, then proportionally scale it into the 0..100 range so it can be
 * compared to the animals' trait vectors.
 */
export function accumulateTraits(answers: QuizAnswers): AnimalTraits {
  const totals: AnimalTraits = { ...ZERO_TRAITS }
  for (const option of answers) {
    for (const key of TRAIT_KEYS) {
      totals[key] += option.traitWeights[key] ?? 0
    }
  }

  let max = 0
  for (const key of TRAIT_KEYS) {
    if (totals[key] > max) max = totals[key]
  }
  if (max === 0) return { ...ZERO_TRAITS }

  const scaled: AnimalTraits = { ...ZERO_TRAITS }
  for (const key of TRAIT_KEYS) {
    scaled[key] = Math.round((totals[key] / max) * 100)
  }
  return scaled
}

/** Nearest animal to an explicit trait vector, by Euclidean distance. */
export function scoreTraitsToAnimal(traits: AnimalTraits): AnimalKey {
  let best: AnimalKey = ANIMAL_KEYS[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const key of ANIMAL_KEYS) {
    const distance = euclideanTraitDistance(traits, ANIMALS[key].traits)
    if (distance < bestDistance) {
      bestDistance = distance
      best = key
    }
  }
  return best
}

/**
 * Score a completed quiz to its nearest animal archetype.
 * Pure and deterministic: accumulate → normalize → nearest neighbour.
 */
export function scoreQuizToAnimal(answers: QuizAnswers): AnimalKey {
  return scoreTraitsToAnimal(accumulateTraits(answers))
}
