import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { getFunctionName } from 'convex/server'

const { useQueryMock, submitSpy } = vi.hoisted(() => ({ useQueryMock: vi.fn(), submitSpy: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => submitSpy,
}))

import StudentMentorship from '@/src/screens/StudentMentorship'

const fb = (when: string, body: string) => ({ author: 'Wei Chen', role: 'Senior Frontend Engineer', when, body })
const DATA = {
  trackTitle: 'Frontend Architecture Mentorship',
  org: 'Talentbank',
  mentorName: 'Wei Chen',
  weekProgress: 8,
  totalWeeks: 12,
  hoursCommitted: 78,
  fit: 88,
  status: 'on-track',
  feedback: [fb('2 days ago', 'PR review turnaround has been excellent.'), fb('1 week ago', 'Great initiative on the demo.'), fb('Week 1', 'Welcome to the squad.')],
  tasks: [
    { id: '1', title: 'Build the responsive navigation shell', status: 'done', mentorNote: 'Clean component API.' },
    { id: '2', title: 'Lead the Week 8 sprint demo', status: 'done', mentorNote: 'Confident walkthrough.' },
    { id: '3', title: 'Refactor data-fetching into reusable hooks', status: 'in-progress', dueLabel: 'Due in 3 days' },
    { id: '4', title: 'Write tests for the rating module', status: 'todo' },
    { id: '5', title: 'Document the onboarding runbook', status: 'blocked', mentorNote: 'Waiting on infra access.' },
  ],
}

beforeEach(() => {
  submitSpy.mockClear()
  useQueryMock.mockImplementation((ref: unknown) => {
    const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
    if (name.includes('enrollments')) return DATA
    if (name.includes('sponsorships')) return null
    return undefined
  })
})

describe('StudentMentorship', () => {
  it('renders the track, progress, tasks, and mentor feedback', () => {
    render(<StudentMentorship />)
    expect(screen.getByRole('heading', { name: /frontend architecture mentorship/i })).toBeInTheDocument()
    expect(screen.getAllByText('Wei Chen').length).toBeGreaterThanOrEqual(3) // 3 feedback cards
    expect(screen.getByText(/Refactor data-fetching/i)).toBeInTheDocument()
    expect(screen.getByText(/2\/5 reviewed/)).toBeInTheDocument()
  })

  it('submits a deliverable via the mutation and shows a banner', async () => {
    const user = userEvent.setup()
    render(<StudentMentorship />)
    await user.click(screen.getByRole('button', { name: /submit deliverable/i }))
    expect(submitSpy).toHaveBeenCalledWith({ taskId: '3' })
    expect(screen.getByRole('status')).toHaveTextContent(/sent to Wei Chen for review/i)
  })

  it('dismisses the banner', async () => {
    const user = userEvent.setup()
    render(<StudentMentorship />)
    await user.click(screen.getByRole('button', { name: /submit deliverable/i }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('signs the micro-bond contract via the mutation', async () => {
    const user = userEvent.setup()
    useQueryMock.mockImplementation((ref: unknown) => {
      const name = getFunctionName(ref as Parameters<typeof getFunctionName>[0])
      if (name.includes('enrollments')) return DATA
      if (name.includes('candidates')) return { name: 'Jane Doe', profileComplete: true }
      if (name.includes('sponsorships'))
        return { id: 's1', orgName: 'Talentbank', title: 'Early-Talent Micro-Bond', type: 'milestone', amount: 3000, commitmentKind: 'contract', commitmentMonths: 3, status: 'offered', createdAt: 1700000000000, contractNo: null, signedName: null, signedAt: null }
      return undefined
    })
    render(<StudentMentorship />)
    expect(screen.getByText(/Micro-bond offer/i)).toBeInTheDocument()

    // Open the contract, sign it, submit.
    await user.click(screen.getByRole('button', { name: /review & sign contract/i }))
    expect(screen.getByPlaceholderText(/full legal name/i)).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(/full legal name/i), 'Jane Doe')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /sign & submit/i }))
    expect(submitSpy).toHaveBeenCalledWith({ sponsorshipId: 's1', signedName: 'Jane Doe' })
  })
})
