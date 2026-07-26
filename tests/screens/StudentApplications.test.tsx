import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: (...a: unknown[]) => useQueryMock(...a), useMutation: () => vi.fn() }))

import StudentApplications from '@/src/screens/StudentApplications'

const now = Date.now()
const h = (n: number) => n * 3_600_000
const APPS = [
  { id: '1', status: 'pending', matchScore: 90, appliedAt: now - h(38), slaDueAt: now + h(10), trackTitle: 'Frontend Architecture Mentorship', org: 'Talentbank', orgSlug: 'talentbank' },
  { id: '2', status: 'accepted', matchScore: 86, appliedAt: now - h(48), slaDueAt: now, trackTitle: 'Applied Machine Learning Sprint', org: 'Google', orgSlug: 'google' },
]

const setApps = (value: unknown) =>
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    return name.includes('applications') ? value : undefined
  })

describe('StudentApplications', () => {
  it('lists applications with their live status and fit', () => {
    setApps(APPS)
    render(<StudentApplications />)
    expect(screen.getByRole('heading', { name: /your applications/i })).toBeInTheDocument()
    expect(screen.getByText('Frontend Architecture Mentorship')).toBeInTheDocument()
    expect(screen.getByText('Applied Machine Learning Sprint')).toBeInTheDocument()
    expect(screen.getByText('Under review')).toBeInTheDocument()
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText(/Interview within 10h/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no applications', () => {
    setApps([])
    render(<StudentApplications />)
    expect(screen.getByText(/haven't applied to any tracks yet/i)).toBeInTheDocument()
  })
})
