import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock, setStatusSpy } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  setStatusSpy: vi.fn(),
}))
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => setStatusSpy,
}))

import ApplicantReview from '@/src/screens/ApplicantReview'

const now = Date.now()
const h = (n: number) => n * 3_600_000
const DATA = {
  trackTitle: 'Frontend Architecture Mentorship',
  cap: 50,
  slaHours: 48,
  applicants: [
    { id: '1', name: 'John Doe', university: 'Sunway University', program: 'Computer Science', animalKey: 'owl', reliability: 96, matchScore: 90, status: 'pending', appliedAt: now - h(38), slaDueAt: now + h(10) },
    { id: '2', name: 'Priya Nair', university: 'Monash University Malaysia', program: 'HCI', animalKey: 'peacock', reliability: 94, matchScore: 64, status: 'pending', appliedAt: now - h(20), slaDueAt: now + h(28) },
    { id: '3', name: 'Marcus Tan', university: "Taylor's University", program: 'Software Engineering', animalKey: 'beaver', reliability: 90, matchScore: 52, status: 'pending', appliedAt: now - h(8), slaDueAt: now + h(40) },
  ],
}

beforeEach(() => {
  setStatusSpy.mockClear()
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    if (name.includes('applications')) return DATA
    if (name.includes('reliability')) return { score: 98, base: 98, events: [] }
    return undefined
  })
})

const orderedNames = () =>
  screen.getAllByText(/^(John Doe|Priya Nair|Marcus Tan)$/).map((e) => e.textContent)

describe('ApplicantReview', () => {
  it('renders the track, applicants, and real match scores', () => {
    render(<ApplicantReview />)
    expect(screen.getByRole('heading', { name: /frontend architecture mentorship/i })).toBeInTheDocument()
    expect(orderedNames()).toHaveLength(3)
    const johnRow = screen.getByText('John Doe').closest('tr') as HTMLElement
    expect(within(johnRow).getByText('90%')).toBeInTheDocument()
    // John's SLA (10h left) is urgent; Marcus's (40h) is not.
    expect(within(johnRow).getByText(/Remaining/i)).toBeInTheDocument()
    const marcusRow = screen.getByText('Marcus Tan').closest('tr') as HTMLElement
    expect(within(marcusRow).queryByText(/Remaining/i)).not.toBeInTheDocument()
  })

  it('reorders rows by the sort controls', async () => {
    const user = userEvent.setup()
    render(<ApplicantReview />)
    expect(orderedNames()[0]).toBe('John Doe') // Match: High (default)
    await user.click(screen.getByRole('button', { name: /match: low/i }))
    expect(orderedNames()[0]).toBe('Marcus Tan')
    await user.click(screen.getByRole('button', { name: /sla: urgent/i }))
    expect(orderedNames()[0]).toBe('John Doe')
  })

  it('accepts and declines via the Convex mutation', async () => {
    const user = userEvent.setup()
    render(<ApplicantReview />)
    const johnRow = screen.getByText('John Doe').closest('tr') as HTMLElement
    await user.click(within(johnRow).getByRole('button', { name: /accept & interview/i }))
    expect(setStatusSpy).toHaveBeenCalledWith({ applicationId: '1', status: 'accepted' })

    const priyaRow = screen.getByText('Priya Nair').closest('tr') as HTMLElement
    await user.click(within(priyaRow).getByRole('button', { name: /decline/i }))
    expect(setStatusSpy).toHaveBeenCalledWith({ applicationId: '2', status: 'declined' })
  })
})
