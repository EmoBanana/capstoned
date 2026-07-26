import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: (...a: unknown[]) => useQueryMock(...a) }))
// Stub Session A's animated MatchReport (avoids gsap in jsdom); assert wiring only.
vi.mock('@/src/components/match/MatchReport', () => ({
  default: ({ candidate, track }: { candidate: { name: string }; track: { title: string } }) => (
    <div data-testid="report">
      {candidate.name} — {track.title}
    </div>
  ),
}))

import RecruiterAssessment from '@/src/screens/RecruiterAssessment'

const FW = { technicalSkills: 0.3, interests: 0.2, aspirations: 0.15, workingStyle: 0.25, commitment: 0.1 }
const track = {
  id: 't1', _id: 't1', title: 'Frontend Architecture Mentorship', org: 'Talentbank', department: 'Eng',
  summary: 's', objectives: [], deliverables: [], milestones: [], durationWeeks: 12, intensity: 'moderate',
  weeklyHours: 10, cap: 50, applicants: 50, requiredSkills: [], domainTags: [], interestTags: [], aspirationTags: [],
  cultureAnimalAffinity: {}, factorWeights: FW, reliability: 98, brandColor: 'D81439',
}
const cand = (id: string, name: string) => ({ _id: id, name, headline: 'h', university: 'Sunway', program: 'CS', skills: [], interests: [], aspirations: [], availabilityHoursPerWeek: 12, animalKey: 'owl', reliabilityScore: 96 })
const DATA = {
  track,
  mentees: [
    { enrollmentId: 'e1', name: 'John Doe', candidate: cand('c1', 'John Doe') },
    { enrollmentId: 'e2', name: 'Aisha Rahman', candidate: cand('c2', 'Aisha Rahman') },
  ],
}

beforeEach(() => {
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    return name.includes('enrollments') ? DATA : undefined
  })
})

describe('RecruiterAssessment', () => {
  it('shows the first mentee report and swaps on selection', async () => {
    const user = userEvent.setup()
    render(<RecruiterAssessment />)
    expect(screen.getByTestId('report')).toHaveTextContent('John Doe — Frontend Architecture Mentorship')
    await user.click(screen.getByRole('button', { name: /Aisha Rahman/i }))
    expect(screen.getByTestId('report')).toHaveTextContent('Aisha Rahman')
  })
})
