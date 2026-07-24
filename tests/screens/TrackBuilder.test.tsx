import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrackBuilder from '@/src/screens/TrackBuilder'

/** Advance the wizard from step 1 to step 3 by clicking Continue twice. */
async function gotoStep3() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

describe('TrackBuilder', () => {
  it('renders the header, step 1 basics, and the live marketplace preview', () => {
    render(<TrackBuilder />)
    expect(
      screen.getByRole('heading', { name: /design mentorship track/i }),
    ).toBeInTheDocument()
    // Step 1 heading (h2 from StepHeading, distinct from the stepper label span)
    expect(screen.getByRole('heading', { name: 'Track Basics' })).toBeInTheDocument()
    // Sticky preview mirrors the default title
    expect(
      screen.getByRole('heading', { name: /frontend platform mentorship/i }),
    ).toBeInTheDocument()
  })

  it('moves forward with Continue and back with Back through the wizard', async () => {
    const user = userEvent.setup()
    render(<TrackBuilder />)

    expect(screen.getByRole('heading', { name: 'Track Basics' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(
      screen.getByRole('heading', { name: 'Commitment & Schedule' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Track Basics' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: 'Track Basics' })).toBeInTheDocument()
  })

  it('adds and removes deliverable milestones on step 3', async () => {
    const user = userEvent.setup()
    render(<TrackBuilder />)
    await gotoStep3()

    // Two seeded deliverables
    expect(screen.getAllByText(/^Milestone \d/)).toHaveLength(2)

    // First "Add" button belongs to the Deliverables card
    const addButtons = screen.getAllByRole('button', { name: /^add$/i })
    await user.click(addButtons[0])
    expect(screen.getAllByText(/^Milestone \d/)).toHaveLength(3)

    // Remove one deliverable
    await user.click(screen.getAllByLabelText('Remove deliverable')[0])
    expect(screen.getAllByText(/^Milestone \d/)).toHaveLength(2)
  })

  it('shows Balanced only at 100% and disables Publish when weights are off', async () => {
    render(<TrackBuilder />)
    await gotoStep3()

    // Seeded weights total 100
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publish track/i })).toBeEnabled()

    // Push the first checkpoint weight to 40 -> total 110
    const weightInputs = screen.getAllByLabelText('Weight percent')
    fireEvent.change(weightInputs[0], { target: { value: '40' } })

    expect(screen.queryByText('Balanced')).not.toBeInTheDocument()
    expect(screen.getByText(/over by 10%/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publish track/i })).toBeDisabled()
  })

  it('publishes when weights balance and a titled deliverable exists', async () => {
    const user = userEvent.setup()
    render(<TrackBuilder />)
    await gotoStep3()

    const publish = screen.getByRole('button', { name: /publish track/i })
    expect(publish).toBeEnabled()
    await user.click(publish)

    expect(screen.getByRole('button', { name: /track published/i })).toBeDisabled()
    expect(screen.getByText(/live in the marketplace/i)).toBeInTheDocument()
  })

  it('reflects title and weekly-hours edits in the sticky preview', async () => {
    const user = userEvent.setup()
    render(<TrackBuilder />)

    // Edit the title on step 1
    const titleInput = screen.getByLabelText(/track title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Robotics Studio Track')
    expect(
      screen.getByRole('heading', { name: 'Robotics Studio Track' }),
    ).toBeInTheDocument()

    // Move to step 2 and change weekly hours
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText('12h')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Expected weekly hours'), {
      target: { value: '20' },
    })
    expect(screen.getByText('20h')).toBeInTheDocument()
    expect(screen.queryByText('12h')).not.toBeInTheDocument()
  })
})
