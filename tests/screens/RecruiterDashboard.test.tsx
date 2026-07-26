import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))
vi.mock('convex/react', () => ({ useQuery: (...a: unknown[]) => useQueryMock(...a) }))

import RecruiterDashboard from '@/src/screens/RecruiterDashboard'

const DATA = {
  org: { name: 'Talentbank', slug: 'talentbank', reliability: 98 },
  programs: [
    { id: 'p1', title: 'Frontend Architecture Mentorship', status: 'open', intensity: 'moderate', durationWeeks: 12, weeklyHours: 10, cap: 50, applicants: 15, enrolled: 2, avgFit: 83 },
    { id: 'p2', title: 'Payments Reliability Track', status: 'draft', intensity: 'moderate', durationWeeks: 12, weeklyHours: 8, cap: 40, applicants: 0, enrolled: 0, avgFit: null },
  ],
}

beforeEach(() => useQueryMock.mockReturnValue(DATA))

describe('RecruiterDashboard', () => {
  it('renders the header, real stat aggregates and the org programs', () => {
    render(<RecruiterDashboard />)
    expect(screen.getByRole('heading', { name: /your mentorship programs/i })).toBeInTheDocument()
    expect(screen.getByText('Active programs').parentElement).toHaveTextContent('1') // one open
    expect(screen.getByText('Applicants in review').parentElement).toHaveTextContent('15')
    expect(screen.getByText('Enrolled mentees').parentElement).toHaveTextContent('2')
    expect(screen.getByText('Frontend Architecture Mentorship')).toBeInTheDocument()
    expect(screen.getByText('Payments Reliability Track')).toBeInTheDocument()
  })

  it('filters to only Open programs when the Open filter is clicked', async () => {
    render(<RecruiterDashboard />)
    await userEvent.click(screen.getByRole('button', { name: /^Open/i }))
    expect(screen.getByText('Frontend Architecture Mentorship')).toBeInTheDocument()
    expect(screen.queryByText('Payments Reliability Track')).not.toBeInTheDocument()
  })

  it('fires onNavigate("applicants") when Review applicants is clicked', async () => {
    const onNavigate = vi.fn()
    render(<RecruiterDashboard onNavigate={onNavigate} />)
    await userEvent.click(screen.getAllByRole('button', { name: /review applicants/i })[0])
    expect(onNavigate).toHaveBeenCalledWith('applicants')
  })

  it('fires onNavigate("new-track") when New Track is clicked', async () => {
    const onNavigate = vi.fn()
    render(<RecruiterDashboard onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('button', { name: /new track/i }))
    expect(onNavigate).toHaveBeenCalledWith('new-track')
  })

  it('shows an empty state when the company has no tracks', () => {
    useQueryMock.mockReturnValue({ org: DATA.org, programs: [] })
    render(<RecruiterDashboard />)
    expect(screen.getByText(/no tracks yet/i)).toBeInTheDocument()
  })
})
