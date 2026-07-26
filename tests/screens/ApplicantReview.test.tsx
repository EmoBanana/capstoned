import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock, mutSpy } = vi.hoisted(() => ({ useQueryMock: vi.fn(), mutSpy: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => mutSpy,
}))

import ApplicantReview from '@/src/screens/ApplicantReview'

const now = Date.now()
const h = (n: number) => n * 3_600_000
const app = (id: string, name: string, program: string, matchScore: number, slaOffset: number) => ({
  id, name, university: 'Sunway University', program, animalKey: 'owl', reliability: 96, matchScore,
  status: 'pending', appliedAt: now - h(8), slaDueAt: now + slaOffset,
  note: '', availability: 'Immediately', hoursPerWeek: 10,
  interviewAt: null, interviewProposedBy: null, interviewStatus: null, enrolled: false,
})
const DATA = {
  trackTitle: 'Frontend Architecture Mentorship',
  cap: 50,
  slaHours: 48,
  applicants: [
    app('1', 'John Doe', 'Computer Science', 90, h(10)),
    app('2', 'Priya Nair', 'HCI', 64, h(28)),
    app('3', 'Marcus Tan', 'Software Engineering', 52, h(40)),
  ],
}

beforeEach(() => {
  mutSpy.mockClear()
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    if (name.includes('organizations')) return { id: 'o1', name: 'Talentbank', slug: 'talentbank', brandColor: '000', reliability: 98, department: '', about: '' }
    if (name.includes('applications')) return DATA
    if (name.includes('reliability')) return { score: 98, base: 98, events: [] }
    return undefined
  })
})

const orderedNames = () => screen.getAllByText(/^(John Doe|Priya Nair|Marcus Tan)$/).map((e) => e.textContent)

describe('ApplicantReview', () => {
  it('renders the queue of pending applicants with match + SLA', () => {
    render(<ApplicantReview />)
    expect(screen.getByRole('heading', { name: /frontend architecture mentorship/i })).toBeInTheDocument()
    expect(orderedNames()).toHaveLength(3)
    const johnRow = screen.getByText('John Doe').closest('tr') as HTMLElement
    expect(within(johnRow).getByText('90%')).toBeInTheDocument()
    expect(within(johnRow).getByText(/SLA 10h/i)).toBeInTheDocument()
  })

  it('reorders rows by the sort controls', async () => {
    const user = userEvent.setup()
    render(<ApplicantReview />)
    expect(orderedNames()[0]).toBe('John Doe')
    await user.click(screen.getByRole('button', { name: /match: low/i }))
    expect(orderedNames()[0]).toBe('Marcus Tan')
    await user.click(screen.getByRole('button', { name: /sla: urgent/i }))
    expect(orderedNames()[0]).toBe('John Doe')
  })

  it('accepting opens the schedule modal and proposes an interview time', async () => {
    const user = userEvent.setup()
    render(<ApplicantReview />)
    const johnRow = screen.getByText('John Doe').closest('tr') as HTMLElement
    await user.click(within(johnRow).getByRole('button', { name: /accept & schedule/i }))
    expect(screen.getByRole('heading', { name: /propose an interview time/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /accept & propose/i }))
    expect(mutSpy).toHaveBeenCalledWith(expect.objectContaining({ applicationId: '1', status: 'accepted' }))
  })

  it('declines via the mutation', async () => {
    const user = userEvent.setup()
    render(<ApplicantReview />)
    const priyaRow = screen.getByText('Priya Nair').closest('tr') as HTMLElement
    await user.click(within(priyaRow).getByRole('button', { name: /decline/i }))
    expect(mutSpy).toHaveBeenCalledWith({ applicationId: '2', status: 'declined' })
  })
})
