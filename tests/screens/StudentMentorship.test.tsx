import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentMentorship from '@/src/screens/StudentMentorship'

describe('StudentMentorship', () => {
  it('renders the mentorship header and task list', () => {
    render(<StudentMentorship />)
    expect(
      screen.getByRole('heading', { name: /frontend architecture mentorship/i })
    ).toBeInTheDocument()
    // A representative sample of the task titles.
    expect(
      screen.getByText('Refactor data-fetching into reusable hooks')
    ).toBeInTheDocument()
    expect(screen.getByText('Write tests for the rating module')).toBeInTheDocument()
    expect(screen.getByText('Document the onboarding runbook')).toBeInTheDocument()
  })

  it('shows the reviewed count and awaiting-review summary', () => {
    render(<StudentMentorship />)
    // 2 done of 5 total.
    expect(screen.getByText(/2\/5 reviewed/i)).toBeInTheDocument()
    // Footer summary: nothing awaiting review yet.
    expect(
      screen.getByText(/2 reviewed .* 0 awaiting review .* 3 open/i)
    ).toBeInTheDocument()
  })

  it('renders three mentor feedback items from Wei Chen', () => {
    render(<StudentMentorship />)
    // The role label appears once per feedback card.
    expect(screen.getAllByText('Senior Frontend Engineer')).toHaveLength(3)
    // Each distinctive feedback body is present.
    expect(
      screen.getByText(/PR review turnaround has been excellent/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Great initiative taking the demo/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Welcome to the squad/i)).toBeInTheDocument()
  })

  it('submits an in-progress deliverable, flipping it to Submitted with a banner', async () => {
    render(<StudentMentorship />)
    const user = userEvent.setup()

    // No banner initially.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /submit deliverable for Refactor data-fetching into reusable hooks/i,
      })
    )

    // Banner mentions the submitted task title.
    const banner = screen.getByRole('status')
    expect(
      within(banner).getByText(/Refactor data-fetching into reusable hooks/i)
    ).toBeInTheDocument()
    expect(within(banner).getByText(/sent to Wei Chen for review/i)).toBeInTheDocument()

    // The task now shows a Submitted badge and awaiting-review note.
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText(/Awaiting mentor review/i)).toBeInTheDocument()

    // The submit action for that task is gone.
    expect(
      screen.queryByRole('button', {
        name: /submit deliverable for Refactor data-fetching into reusable hooks/i,
      })
    ).not.toBeInTheDocument()

    // Awaiting-review count in the footer increments.
    expect(
      screen.getByText(/2 reviewed .* 1 awaiting review .* 2 open/i)
    ).toBeInTheDocument()
  })

  it('dismisses the banner via the close button', async () => {
    render(<StudentMentorship />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', {
        name: /submit deliverable for Refactor data-fetching into reusable hooks/i,
      })
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('marks a to-do task submitted via its "Mark submitted" action', async () => {
    render(<StudentMentorship />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', {
        name: /submit deliverable for Write tests for the rating module/i,
      })
    )

    const banner = screen.getByRole('status')
    expect(
      within(banner).getByText(/Write tests for the rating module/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })
})
