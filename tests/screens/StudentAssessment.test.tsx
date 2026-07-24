import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentAssessment from '@/src/screens/StudentAssessment'

describe('StudentAssessment', () => {
  it('renders the interim Week 8 hero at 88% with the tracking StatBars', () => {
    render(<StudentAssessment />)

    expect(screen.getByRole('heading', { name: /your interim assessment/i })).toBeInTheDocument()
    expect(screen.getByText(/Interim · Week 8 of 12/i)).toBeInTheDocument()

    // Dominant Overall Fit score.
    expect(screen.getByText('Overall Fit')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === '88%')).toBeInTheDocument()
    expect(screen.getByText(/Strong & on track/i)).toBeInTheDocument()

    // StatBars render their label + value pairs.
    expect(screen.getByText('Task Velocity')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('Deliverable Quality')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(5)
  })

  it('shows a success banner with Undo after signalling interest to continue, and Undo restores the actions', async () => {
    const user = userEvent.setup()
    render(<StudentAssessment />)

    await user.click(screen.getByRole('button', { name: /signal interest to continue/i }))

    expect(screen.getByText(/Interest to continue sent\./i)).toBeInTheDocument()
    // The forward-option buttons are replaced by the banner.
    expect(
      screen.queryByRole('button', { name: /signal interest to continue/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /undo/i }))

    expect(screen.queryByText(/Interest to continue sent\./i)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /signal interest to continue/i }),
    ).toBeInTheDocument()
  })

  it('shows the feedback-call success banner with Undo', async () => {
    const user = userEvent.setup()
    render(<StudentAssessment />)

    await user.click(screen.getByRole('button', { name: /request a feedback call/i }))

    expect(screen.getByText(/Feedback call requested\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('opens the step-away dialog and keeps "Send to my mentor" disabled until a reason plus >=12 char detail', async () => {
    const user = userEvent.setup()
    render(<StudentAssessment />)

    await user.click(screen.getByRole('button', { name: /step away from track/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /thinking about stepping away/i })).toBeInTheDocument()

    const send = within(dialog).getByRole('button', { name: /send to my mentor/i })
    expect(send).toBeDisabled()

    // A reason alone is not enough.
    await user.selectOptions(within(dialog).getByRole('combobox'), 'workload')
    expect(send).toBeDisabled()

    // A too-short detail keeps it disabled.
    const detail = within(dialog).getByRole('textbox')
    await user.type(detail, 'too short')
    expect(send).toBeDisabled()

    // Reason + a detail of at least 12 chars enables it.
    await user.clear(detail)
    await user.type(detail, 'I need to step back for now')
    expect(send).toBeEnabled()
  })

  it('closes the step-away dialog via "Keep going" and via Escape', async () => {
    const user = userEvent.setup()
    render(<StudentAssessment />)

    // Open then close with "Keep going".
    await user.click(screen.getByRole('button', { name: /step away from track/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /keep going/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Re-open then close with Escape.
    await user.click(screen.getByRole('button', { name: /step away from track/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits a valid step-away request and shows the "Request received" banner', async () => {
    const user = userEvent.setup()
    render(<StudentAssessment />)

    await user.click(screen.getByRole('button', { name: /step away from track/i }))
    const dialog = screen.getByRole('dialog')

    await user.selectOptions(within(dialog).getByRole('combobox'), 'fit')
    await user.type(within(dialog).getByRole('textbox'), 'This track is not the right fit for my goals')
    await user.click(within(dialog).getByRole('button', { name: /send to my mentor/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Request received\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })
})
