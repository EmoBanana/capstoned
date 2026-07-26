import { computeMatch } from '@/src/lib/matching'
import type { CandidateProfile, Track } from '@/src/lib/domain'

const FW = { technicalSkills: 0.3, interests: 0.2, aspirations: 0.15, workingStyle: 0.25, commitment: 0.1 }

const candidate = {
  id: 'c1',
  name: 'Test Candidate',
  headline: '',
  university: '',
  program: '',
  skills: [{ name: 'React', level: 88 }, { name: 'TypeScript', level: 80 }],
  interests: ['UI Engineering'],
  aspirations: ['Frontend Engineer'],
  availabilityHoursPerWeek: 12,
  animalKey: 'owl',
  reliabilityScore: 95,
} as unknown as CandidateProfile

const track = {
  id: 't1',
  title: 'Frontend Architecture',
  requiredSkills: [{ name: 'React', weight: 0.5, targetLevel: 80 }, { name: 'Design Systems', weight: 0.5, targetLevel: 75 }],
  interestTags: ['prototyping'],
  aspirationTags: ['Product Engineer'],
  domainTags: ['Frontend'],
  cultureAnimalAffinity: { owl: 80 },
  factorWeights: FW,
  weeklyHours: 10,
  durationWeeks: 12,
} as unknown as Track

describe('computeMatch', () => {
  it('returns an overall 0–100 and all five weighted factors', () => {
    const r = computeMatch(candidate, track)
    expect(r.factors).toHaveLength(5)
    expect(r.overall).toBeGreaterThanOrEqual(0)
    expect(r.overall).toBeLessThanOrEqual(100)
    for (const f of r.factors) {
      expect(f.score).toBeGreaterThanOrEqual(0)
      expect(f.score).toBeLessThanOrEqual(100)
      expect(f.rationale.length).toBeGreaterThan(0)
    }
  })

  it('credits related aspirations/interests, not just exact tags', () => {
    // The track's interest tag is "prototyping" and aspiration "Product Engineer";
    // the candidate has neither verbatim but both relate to Frontend Engineer / UI.
    const interests = computeMatch(candidate, track).factors.find((f) => f.key === 'interests')!
    const aspirations = computeMatch(candidate, track).factors.find((f) => f.key === 'aspirations')!
    expect(interests.score).toBeGreaterThan(0)
    expect(aspirations.score).toBeGreaterThan(0)
  })

  it('gives partial technical credit for a related held skill (React → Design Systems)', () => {
    const tech = computeMatch(candidate, track).factors.find((f) => f.key === 'technicalSkills')!
    // React fully covers the React requirement and partially the Design Systems one.
    expect(tech.score).toBeGreaterThan(50)
  })
})
