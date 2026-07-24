import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Marketplace from '@/src/screens/Marketplace'

// Each TrackCard renders its title as an <h3>, so counting level-3 headings
// counts the cards currently in the grid.
const cardTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Marketplace', () => {
  it('renders the header, all 9 tracks, and the Talentbank wordmark', () => {
    render(<Marketplace />)

    expect(
      screen.getByRole('heading', { name: /tracks open for your semester break/i })
    ).toBeInTheDocument()

    // Result-count line + one card per track.
    expect(screen.getByText(/Showing 9 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(9)

    // The Talentbank track renders the wordmark instead of a monogram.
    expect(screen.getByText('TALENTBANK')).toBeInTheDocument()
  })

  it('filters the grid via the commitment chips', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)

    await user.click(screen.getByRole('button', { name: 'Semester Break Sprint' }))
    expect(screen.getByText(/Showing 4 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Concurrent Study Track' }))
    expect(screen.getByText(/Showing 5 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText(/Showing 9 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(9)
  })

  it('narrows results with the search input and updates the count line', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)

    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'React')

    // Only the Talentbank track lists React as a skill.
    expect(screen.getByText(/Showing 1 track\b/i)).toBeInTheDocument()
    expect(cardTitles()).toEqual(['Frontend Architecture Mentorship'])
    // Count line echoes the query.
    expect(screen.getByText(/matching/i)).toBeInTheDocument()
  })

  it('reorders the grid when the sort select changes', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)

    // Default sort is "Closing soonest": Gamuda (closes tomorrow) is first.
    expect(cardTitles()[0]).toBe('Civil-Tech Data Pipeline Sprint')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /sort tracks/i }),
      'Best fit'
    )

    // "Best fit" puts the highest fitScore (Talentbank, 91) first.
    expect(cardTitles()[0]).toBe('Frontend Architecture Mentorship')
  })

  it('shows a disabled Join Waitlist and cap-reached copy for a full track', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)

    // Isolate the Gamuda track (applicants 50 === cap 50).
    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'Gamuda')
    expect(cardTitles()).toEqual(['Civil-Tech Data Pipeline Sprint'])

    const waitlist = screen.getByRole('button', { name: /join waitlist/i })
    expect(waitlist).toBeDisabled()
    expect(screen.getByText(/cap reached/i)).toBeInTheDocument()
    // A full track offers no Apply action.
    expect(screen.queryByRole('button', { name: /^apply$/i })).not.toBeInTheDocument()
  })
})
