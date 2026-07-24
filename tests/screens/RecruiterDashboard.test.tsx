import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import RecruiterDashboard from '@/src/screens/RecruiterDashboard'

describe('RecruiterDashboard', () => {
  it('renders the header, stat cards and all four programs', () => {
    render(<RecruiterDashboard />)

    expect(
      screen.getByRole('heading', { name: /your mentorship programs/i }),
    ).toBeInTheDocument()

    // Stat cards: derived aggregates. The label is a div inside the Card div,
    // so its parent card element carries both the label and the value text.
    // active programs = non-draft = 3
    expect(screen.getByText('Active programs').parentElement).toHaveTextContent('3')
    // applicants in review = 47 + 32 = 79
    expect(screen.getByText('Applicants in review').parentElement).toHaveTextContent('79')
    // enrolled mentees = 6 + 4 = 10
    expect(screen.getByText('Enrolled mentees').parentElement).toHaveTextContent('10')

    // All four program cards render by default
    expect(screen.getByText('Frontend Architecture Mentorship')).toBeInTheDocument()
    expect(screen.getByText('Mobile Growth Analytics Track')).toBeInTheDocument()
    expect(screen.getByText('Backend Reliability Sprint')).toBeInTheDocument()
    expect(screen.getByText('Data Platform Mentorship')).toBeInTheDocument()
  })

  it('shows the in-progress week tracker for Frontend Architecture Mentorship', () => {
    render(<RecruiterDashboard />)
    expect(screen.getByText(/Week 8 \/ 12/i)).toBeInTheDocument()
  })

  it('filters to only Open programs when the Open filter is clicked', async () => {
    render(<RecruiterDashboard />)

    const openFilter = screen.getByRole('button', { name: /^Open/i })
    await userEvent.click(openFilter)

    // Only the single open program remains
    expect(screen.getByText('Mobile Growth Analytics Track')).toBeInTheDocument()
    expect(screen.queryByText('Frontend Architecture Mentorship')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend Reliability Sprint')).not.toBeInTheDocument()
    expect(screen.queryByText('Data Platform Mentorship')).not.toBeInTheDocument()
  })

  it('filters to only In progress programs (two of four)', async () => {
    render(<RecruiterDashboard />)

    // Match the filter chip; use aria-pressed to distinguish from card labels
    const inProgressFilter = screen
      .getAllByRole('button', { name: /In progress/i })
      .find((b) => b.getAttribute('aria-pressed') !== null)!
    await userEvent.click(inProgressFilter)

    expect(screen.getByText('Frontend Architecture Mentorship')).toBeInTheDocument()
    expect(screen.getByText('Backend Reliability Sprint')).toBeInTheDocument()
    expect(screen.queryByText('Mobile Growth Analytics Track')).not.toBeInTheDocument()
    expect(screen.queryByText('Data Platform Mentorship')).not.toBeInTheDocument()
  })

  it('fires onNavigate("applicants") when a program\'s View applicants is clicked', async () => {
    const onNavigate = vi.fn()
    render(<RecruiterDashboard onNavigate={onNavigate} />)

    const viewButtons = screen.getAllByRole('button', { name: /view applicants/i })
    await userEvent.click(viewButtons[0])
    expect(onNavigate).toHaveBeenCalledWith('applicants')
  })

  it('fires onNavigate("new-track") when New Program is clicked', async () => {
    const onNavigate = vi.fn()
    render(<RecruiterDashboard onNavigate={onNavigate} />)

    await userEvent.click(screen.getByRole('button', { name: /new program/i }))
    expect(onNavigate).toHaveBeenCalledWith('new-track')
  })
})
