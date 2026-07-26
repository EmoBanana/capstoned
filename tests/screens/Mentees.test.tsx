import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: (...a: unknown[]) => useQueryMock(...a),
  useMutation: () => vi.fn(),
}))

import Mentees from '@/src/screens/Mentees'

const mentee = (enrollmentId: string, name: string, program: string, status: string, fit: number, tasks: unknown[]) => ({
  enrollmentId, mentorName: 'Wei Chen', name, university: 'Sunway University', program, animalKey: 'owl', reliability: 96, status, weekProgress: 8, totalWeeks: 12, fit, tasks,
})
const DATA = {
  trackTitle: 'Frontend Architecture Mentorship',
  totalWeeks: 12,
  mentees: [
    mentee('e1', 'John Doe', 'Computer Science', 'on-track', 88, [
      { id: 't1', title: 'Build the responsive navigation shell', status: 'done', mentorNote: 'Clean component API.' },
      { id: 't2', title: 'Refactor data-fetching into hooks', status: 'in-progress', dueLabel: 'Due in 3 days' },
    ]),
    mentee('e2', 'Aisha Rahman', 'Data Science', 'ahead', 84, [{ id: 't3', title: 'Design the shared state architecture', status: 'done' }]),
    mentee('e3', 'Marcus Tan', 'Software Engineering', 'needs-support', 72, [{ id: 't4', title: 'Build the responsive card grid', status: 'in-progress' }]),
  ],
}

beforeEach(() => {
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    if (name.includes('enrollments')) return DATA
    if (name.includes('sponsorships')) return null
    if (name.includes('reliability')) return { score: 98, base: 98, events: [] }
    return undefined
  })
})

describe('Mentees', () => {
  it('renders the roster and the first mentee detail by default', () => {
    render(<Mentees />)
    expect(screen.getByRole('heading', { name: /enrolled mentees/i })).toBeInTheDocument()
    // roster names present
    expect(screen.getByText('Aisha Rahman')).toBeInTheDocument()
    // detail panel shows John Doe (first) and one of his tasks
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument()
    expect(screen.getByText(/Build the responsive navigation shell/i)).toBeInTheDocument()
  })

  it('swaps the detail panel when another mentee is selected', async () => {
    const user = userEvent.setup()
    render(<Mentees />)
    await user.click(screen.getByText('Aisha Rahman').closest('button') as HTMLElement)
    expect(screen.getByRole('heading', { name: 'Aisha Rahman' })).toBeInTheDocument()
    expect(screen.getByText(/Design the shared state architecture/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'John Doe' })).not.toBeInTheDocument()
  })

  it('opens a real feedback composer and confirms after sending', async () => {
    const user = userEvent.setup()
    render(<Mentees />)
    await user.click(screen.getByRole('button', { name: /send feedback to John Doe/i }))
    const box = screen.getByPlaceholderText(/visible to the mentee/i)
    await user.type(box, 'Strong progress this week — keep it up.')
    await user.click(screen.getByRole('button', { name: /^send feedback$/i }))
    expect(screen.getByText(/sent to John/i)).toBeInTheDocument()
  })
})
