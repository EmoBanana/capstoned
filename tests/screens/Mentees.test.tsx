import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Mentees from '@/src/screens/Mentees'

describe('Mentees', () => {
  it('renders the header and defaults the detail panel to John Doe', () => {
    render(<Mentees />)
    expect(screen.getByRole('heading', { name: /enrolled mentees/i })).toBeInTheDocument()
    // detail panel shows the first mentee (John Doe) as an h3 heading
    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument()
    // one of John Doe's tasks is visible in the detail panel
    expect(
      screen.getByText('Build the responsive navigation shell'),
    ).toBeInTheDocument()
  })

  it('lists all six mentees in the roster', () => {
    render(<Mentees />)
    const names = [
      'John Doe',
      'Daniel Lim Wei Jun',
      'Arjun Subramaniam',
      'Tan Mei Xin',
      'Chloe Wong Sze Min',
      'Priya Nair',
    ]
    for (const name of names) {
      // each name is rendered as a roster row (button). John Doe also appears
      // in the detail heading, so allow multiple matches and require one to be
      // inside a roster button.
      const inRoster = screen
        .getAllByText(name)
        .some((el) => el.closest('button') !== null)
      expect(inRoster).toBe(true)
    }
  })

  it('swaps the detail panel when a different mentee is selected', async () => {
    render(<Mentees />)
    // John's task present, Daniel's not yet
    expect(
      screen.getByText('Build the responsive navigation shell'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Implement the form validation layer'),
    ).not.toBeInTheDocument()

    const danielRow = screen.getByText('Daniel Lim Wei Jun').closest('button')
    await userEvent.click(danielRow!)

    // detail heading now names Daniel and shows his tasks
    expect(screen.getByRole('heading', { name: 'Daniel Lim Wei Jun' })).toBeInTheDocument()
    expect(
      screen.getByText('Implement the form validation layer'),
    ).toBeInTheDocument()
    // John's task is gone from the detail panel
    expect(
      screen.queryByText('Build the responsive navigation shell'),
    ).not.toBeInTheDocument()
  })

  it('shows a feedback action banner naming the selected mentee', async () => {
    render(<Mentees />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /send feedback to john doe/i }),
    )

    const banner = screen.getByRole('status')
    expect(within(banner).getByText(/Feedback shared with John/i)).toBeInTheDocument()
  })

  it('shows a message action banner and updates it after switching mentees', async () => {
    render(<Mentees />)

    await userEvent.click(screen.getByRole('button', { name: /message john doe/i }))
    let banner = screen.getByRole('status')
    expect(within(banner).getByText(/Message drafted to John/i)).toBeInTheDocument()

    // selecting a new mentee clears the banner
    await userEvent.click(screen.getByText('Arjun Subramaniam').closest('button')!)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // triggering message again now names the newly-selected mentee
    await userEvent.click(screen.getByRole('button', { name: /message arjun subramaniam/i }))
    banner = screen.getByRole('status')
    expect(within(banner).getByText(/Message drafted to Arjun/i)).toBeInTheDocument()
  })
})
