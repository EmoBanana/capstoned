import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => vi.fn(),
}))

import Marketplace from '@/src/screens/Marketplace'

const FW = { technicalSkills: 0.3, interests: 0.2, aspirations: 0.15, workingStyle: 0.25, commitment: 0.1 }

const track = (over: Record<string, unknown>) => ({
  department: 'Eng', summary: 's', domainTags: [], interestTags: [], aspirationTags: [],
  cultureAnimalAffinity: { owl: 70 }, factorWeights: FW, reliability: 97, slaHours: 48,
  ...over,
})

const TRACKS = [
  track({ id: '1', title: 'Frontend Architecture Mentorship', org: 'Talentbank', orgSlug: 'talentbank', intensity: 'moderate', weeklyHours: 10, durationWeeks: 12, cap: 50, applicants: 50, closesInDays: 3, requiredSkills: [{ name: 'React', weight: 0.6, targetLevel: 85 }, { name: 'TypeScript', weight: 0.4, targetLevel: 80 }], interestTags: ['UI Engineering'] }),
  track({ id: '2', title: 'Mobility Frontend Mentorship', org: 'Grab', orgSlug: 'grab', intensity: 'moderate', weeklyHours: 10, durationWeeks: 12, cap: 50, applicants: 47, closesInDays: 4, requiredSkills: [{ name: 'React', weight: 1, targetLevel: 85 }] }),
  track({ id: '3', title: 'Applied Machine Learning Sprint', org: 'Google', orgSlug: 'google', intensity: 'intense', weeklyHours: 40, durationWeeks: 4, cap: 48, applicants: 44, closesInDays: 1, requiredSkills: [{ name: 'Python', weight: 1, targetLevel: 85 }] }),
  track({ id: '4', title: 'Product Design Foundations', org: 'Airbnb', orgSlug: 'airbnb', intensity: 'light', weeklyHours: 8, durationWeeks: 10, cap: 30, applicants: 22, closesInDays: 9, requiredSkills: [{ name: 'Figma', weight: 1, targetLevel: 75 }] }),
]

const CANDIDATE = {
  id: 'c1', name: 'John Doe', headline: 'CS student', university: 'Sunway', program: 'CS',
  skills: [{ name: 'React', level: 88 }, { name: 'TypeScript', level: 82 }],
  interests: ['UI Engineering'], aspirations: ['Frontend Engineer'],
  availabilityHoursPerWeek: 12, animalKey: 'owl', reliabilityScore: 96,
}

beforeEach(() => {
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    if (name.includes('tracks')) return TRACKS
    if (name.includes('candidates')) return CANDIDATE
    if (name.includes('applications')) return []
    return undefined
  })
})

const cardTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Marketplace', () => {
  it('renders tracks, the Talentbank wordmark, and a real fit per card', () => {
    render(<Marketplace />)
    expect(screen.getByRole('heading', { name: /tracks open now/i })).toBeInTheDocument()
    expect(screen.getByText(/Showing 4 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(4)
    expect(screen.getByText('TALENTBANK')).toBeInTheDocument()
    // Real weighted-matrix fit is shown on every card.
    expect(screen.getAllByText(/your fit/i)).toHaveLength(4)
  })

  it('filters the grid by intensity', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.click(screen.getByRole('button', { name: 'Intense' }))
    expect(cardTitles()).toEqual(['Applied Machine Learning Sprint'])
    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(cardTitles()).toEqual(['Product Design Foundations'])
    await user.click(screen.getByRole('button', { name: 'Moderate' }))
    expect(cardTitles()).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(cardTitles()).toHaveLength(4)
  })

  it('narrows results with the search input', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'Figma')
    expect(cardTitles()).toEqual(['Product Design Foundations'])
  })

  it('sorts by closing date', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.selectOptions(screen.getByRole('combobox', { name: /sort tracks/i }), 'Closing soonest')
    expect(cardTitles()[0]).toBe('Applied Machine Learning Sprint')
  })

  it('shows a disabled Waitlist for a full track', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'Talentbank')
    expect(cardTitles()).toEqual(['Frontend Architecture Mentorship'])
    expect(screen.getByRole('button', { name: /waitlist/i })).toBeDisabled()
    expect(screen.getByText(/waitlist only/i)).toBeInTheDocument()
  })
})
