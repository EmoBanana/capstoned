import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicantReview from '@/src/screens/ApplicantReview'

// row[0] is the <thead> header row; row[1] is the first data row.
function firstRowContains(name: string): boolean {
  const dataRow = screen.getAllByRole('row')[1]
  return within(dataRow).queryByText(name) !== null
}

describe('ApplicantReview', () => {
  it('renders the header, queue and the first applicant', () => {
    render(<ApplicantReview />)
    expect(
      screen.getByRole('heading', { name: /Frontend Architecture Mentorship/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Application Queue/i })).toBeInTheDocument()
    // a1 John Doe, Year 3 Sunway, match 94.
    const johnRow = screen.getByText('John Doe').closest('tr')!
    expect(within(johnRow).getByText('Year 3')).toBeInTheDocument()
    expect(within(johnRow).getByText('Sunway University')).toBeInTheDocument()
    expect(within(johnRow).getByText('94%')).toBeInTheDocument()
    // All 8 applicants render.
    expect(screen.getAllByText('Verified Student')).toHaveLength(8)
  })

  it('shows the stats row totals', () => {
    render(<ApplicantReview />)
    const totalCard = screen.getByText('Total Applicants').parentElement!
    expect(within(totalCard).getByText('8')).toBeInTheDocument()

    const capCard = screen.getByText('Cohort Capacity').closest('div')!.parentElement!.parentElement!
    expect(within(capCard).getByText(/41/)).toBeInTheDocument()
    expect(within(capCard).getByText(/\/ 50/)).toBeInTheDocument()

    const riskCard = screen.getByText('SLA At Risk').closest('div')!.parentElement!.parentElement!
    // a5 (9h), a1 (10h), a2 (12h) are under 16h remaining and still pending.
    expect(within(riskCard).getByText('3')).toBeInTheDocument()
  })

  it('reorders rows when sort buttons are pressed', async () => {
    render(<ApplicantReview />)
    // Default sort is Match: High -> John Doe (94) leads.
    expect(firstRowContains('John Doe')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Match: Low/i }))
    // Lowest match is Joshua Tay Chee Keong (52).
    expect(firstRowContains('Joshua Tay Chee Keong')).toBe(true)
    expect(firstRowContains('John Doe')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: /SLA: Urgent/i }))
    // Least SLA remaining is Chloe Wong Sze Min (a5, 9h).
    expect(firstRowContains('Chloe Wong Sze Min')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Match: High/i }))
    expect(firstRowContains('John Doe')).toBe(true)
  })

  it('flips a row to Interview Scheduled with Undo when accepted', async () => {
    render(<ApplicantReview />)
    const johnRow = () => screen.getByText('John Doe').closest('tr')!

    // Before: no Interview Scheduled badge on this row, Accept button present.
    expect(within(johnRow()).queryByText('Interview Scheduled')).toBeNull()

    await userEvent.click(within(johnRow()).getByRole('button', { name: /Accept & Interview/i }))

    expect(within(johnRow()).getByText('Interview Scheduled')).toBeInTheDocument()
    expect(within(johnRow()).getByRole('button', { name: /Undo/i })).toBeInTheDocument()
    // Accept/Decline actions are gone for this row.
    expect(within(johnRow()).queryByRole('button', { name: /Accept & Interview/i })).toBeNull()

    // Capacity count ticks up from 41 to 42.
    const capCard = screen.getByText('Cohort Capacity').closest('div')!.parentElement!.parentElement!
    expect(within(capCard).getByText(/42/)).toBeInTheDocument()

    // Undo restores the pending actions.
    await userEvent.click(within(johnRow()).getByRole('button', { name: /Undo/i }))
    expect(within(johnRow()).getByRole('button', { name: /Accept & Interview/i })).toBeInTheDocument()
    expect(within(johnRow()).queryByText('Interview Scheduled')).toBeNull()
  })

  it('flips a row to Declined with Undo when declined', async () => {
    render(<ApplicantReview />)
    const danielRow = () => screen.getByText('Daniel Lim Wei Jun').closest('tr')!

    await userEvent.click(within(danielRow()).getByRole('button', { name: /^Decline$/i }))

    expect(within(danielRow()).getByText('Declined')).toBeInTheDocument()
    expect(within(danielRow()).getByRole('button', { name: /Undo/i })).toBeInTheDocument()
    expect(within(danielRow()).queryByRole('button', { name: /^Decline$/i })).toBeNull()
  })

  it('renders a red urgent SLA pill for rows under 16h remaining', () => {
    render(<ApplicantReview />)
    // John Doe: 38h ago -> 10h remaining -> urgent variant with "Remaining" suffix.
    const johnRow = screen.getByText('John Doe').closest('tr')!
    const urgentPill = within(johnRow).getByText(/SLA: 10h Remaining/i)
    expect(urgentPill).toBeInTheDocument()
    expect(urgentPill.className).toMatch(/danger/)

    // Arjun Subramaniam: 8h ago -> 40h remaining -> non-urgent, no "Remaining" suffix.
    const arjunRow = screen.getByText('Arjun Subramaniam').closest('tr')!
    const calmPill = within(arjunRow).getByText(/SLA: 40h$/i)
    expect(calmPill).toBeInTheDocument()
    expect(calmPill.className).not.toMatch(/danger/)
  })
})
