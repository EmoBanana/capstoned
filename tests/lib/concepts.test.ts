import { relatedness, coverage, bestMatch } from '@/src/lib/concepts'

describe('concepts.relatedness', () => {
  it('scores identical concepts as 1 (case-insensitive)', () => {
    expect(relatedness('React', 'react')).toBe(1)
    expect(relatedness('Frontend Engineer', 'frontend engineer')).toBe(1)
  })

  it('links curated related concepts that share no exact text', () => {
    expect(relatedness('Frontend Engineer', 'prototyping')).toBeGreaterThan(0)
    expect(relatedness('Frontend Engineer', 'React')).toBeGreaterThan(0)
    expect(relatedness('ML Engineer', 'TensorFlow')).toBeGreaterThan(0)
  })

  it('scores clearly unrelated concepts as 0', () => {
    expect(relatedness('CUDA', 'UX Research')).toBe(0)
  })

  it('picks the best related term from a pool', () => {
    const best = bestMatch('Frontend Engineer', ['CUDA', 'prototyping', 'PostgreSQL'])
    expect(best.term).toBe('prototyping')
    expect(best.r).toBeGreaterThan(0)
  })
})

describe('concepts.coverage', () => {
  it('is 1 when the candidate exactly holds every wanted concept', () => {
    expect(coverage(['React'], ['React'])).toBe(1)
  })

  it('gives partial credit for related-but-not-exact concepts', () => {
    const c = coverage(['UI Engineering'], ['Frontend Engineer'])
    expect(c).toBeGreaterThan(0)
    expect(c).toBeLessThan(1)
  })

  it('is 0 when nothing relates', () => {
    expect(coverage(['CUDA'], ['UX Research'])).toBe(0)
    expect(coverage(['React'], [])).toBe(0)
  })
})
