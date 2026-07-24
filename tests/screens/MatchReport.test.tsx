import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MatchReport from '@/src/screens/MatchReport'

describe('MatchReport', () => {
  it('renders the hero with an 88% overall fit and competency StatBars', () => {
    render(<MatchReport />)

    // Hero headline shows the overall match figure.
    expect(screen.getByText(/88% Match/i)).toBeInTheDocument()
    // "Overall Fit" score card.
    expect(screen.getByText(/Overall Fit/i)).toBeInTheDocument()

    // One StatBar (progressbar) per competency signal.
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(5)
    expect(screen.getByText('Task Velocity')).toBeInTheDocument()
    expect(screen.getByText('Deliverable Quality')).toBeInTheDocument()
    // The Task Velocity bar reports its value.
    expect(bars[0]).toHaveAttribute('aria-valuenow', '91')
  })

  it('opens the termination modal and gates "Confirm Termination" on reason + detail', async () => {
    const user = userEvent.setup()
    render(<MatchReport />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /terminate track/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const confirm = within(dialog).getByRole('button', { name: /confirm termination/i })
    // Disabled with neither field filled.
    expect(confirm).toBeDisabled()

    // Selecting a reason alone is not enough.
    await user.selectOptions(within(dialog).getByLabelText(/termination reason/i), 'capability')
    expect(confirm).toBeDisabled()

    // Detail shorter than 12 chars still not enough.
    const detail = within(dialog).getByLabelText(/supporting detail/i)
    await user.type(detail, 'too short')
    expect(confirm).toBeDisabled()

    // Reaching the 12-char minimum enables confirmation.
    await user.type(detail, ' but now long enough')
    expect(confirm).toBeEnabled()
  })

  it('confirms a termination and shows the banner, then Undo reverts it', async () => {
    const user = userEvent.setup()
    render(<MatchReport />)

    await user.click(screen.getByRole('button', { name: /terminate track/i }))
    const dialog = screen.getByRole('dialog')

    await user.selectOptions(within(dialog).getByLabelText(/termination reason/i), 'capability')
    await user.type(
      within(dialog).getByLabelText(/supporting detail/i),
      'Sustained capability gap despite structured support',
    )

    await user.click(within(dialog).getByRole('button', { name: /confirm termination/i }))

    // Modal closes and the terminated banner appears.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/recorded as a justified decision/i)).toBeInTheDocument()
    expect(screen.getByText('Track Terminated')).toBeInTheDocument()

    // Undo reverts to the active action state.
    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(screen.queryByText(/recorded as a justified decision/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /terminate track/i })).toBeInTheDocument()
  })

  it('shows a success banner for extend and early-offer actions, and Undo reverts', async () => {
    const user = userEvent.setup()
    render(<MatchReport />)

    await user.click(screen.getByRole('button', { name: /extend mentorship offer/i }))
    expect(screen.getByText(/Mentorship extension offered/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /undo/i }))
    expect(screen.queryByText(/Mentorship extension offered/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /trigger early job offer/i }))
    expect(screen.getByText(/Early job offer triggered/i)).toBeInTheDocument()
  })

  it('closes the termination modal on Cancel and on Escape', async () => {
    const user = userEvent.setup()
    render(<MatchReport />)

    // Cancel button.
    await user.click(screen.getByRole('button', { name: /terminate track/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Escape key.
    await user.click(screen.getByRole('button', { name: /terminate track/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
