import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Sample of what `api.tracks.list` returns from Convex — mocked so the
// presentational + filter/sort/search logic is tested deterministically.
const { SAMPLE } = vi.hoisted(() => ({
  SAMPLE: [
    { id: '1', company: 'Talentbank', slug: 'talentbank', reliability: 98, title: 'Frontend Architecture Mentorship', intensity: 'Part-time', commitmentLine: '10 hrs/week · 12 weeks', skills: ['React', 'TypeScript', 'Design Systems'], applicants: 50, cap: 50, slaHours: 48, closesInDays: 3, fitScore: 91 },
    { id: '2', company: 'Grab', slug: 'grab', reliability: 97, title: 'Mobility Frontend Mentorship', intensity: 'Part-time', commitmentLine: '10 hrs/week · 12 weeks', skills: ['React', 'TypeScript', 'Maps SDK'], applicants: 47, cap: 50, slaHours: 48, closesInDays: 4, fitScore: 89 },
    { id: '3', company: 'Google', slug: 'google', reliability: 99, title: 'Applied Machine Learning Sprint', intensity: 'Full-time', commitmentLine: 'Full-time · 4 weeks', skills: ['Python', 'TensorFlow', 'MLOps'], applicants: 44, cap: 48, slaHours: 24, closesInDays: 4, fitScore: 86 },
    { id: '4', company: 'Airbnb', slug: 'airbnb', reliability: 96, title: 'Product Design Foundations', intensity: 'Part-time', commitmentLine: '8 hrs/week · 10 weeks', skills: ['Figma', 'UX Research', 'Prototyping'], applicants: 22, cap: 30, slaHours: 72, closesInDays: 1, fitScore: 78 },
  ],
}))

vi.mock('convex/react', () => ({ useQuery: () => SAMPLE }))

import Marketplace from '@/src/screens/Marketplace'

const cardTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Marketplace', () => {
  it('renders the header, all tracks, and the Talentbank wordmark', () => {
    render(<Marketplace />)
    expect(screen.getByRole('heading', { name: /tracks open now/i })).toBeInTheDocument()
    expect(screen.getByText(/Showing 4 tracks/i)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(4)
    expect(screen.getByText('TALENTBANK')).toBeInTheDocument()
  })

  it('filters the grid via the intensity chips', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)

    await user.click(screen.getByRole('button', { name: 'Full-time' }))
    expect(screen.getByText(/Showing 1 track\b/i)).toBeInTheDocument()
    expect(cardTitles()).toEqual(['Applied Machine Learning Sprint'])

    await user.click(screen.getByRole('button', { name: 'Part-time' }))
    expect(cardTitles()).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(cardTitles()).toHaveLength(4)
  })

  it('narrows results with the search input', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'Figma')
    expect(screen.getByText(/Showing 1 track\b/i)).toBeInTheDocument()
    expect(cardTitles()).toEqual(['Product Design Foundations'])
  })

  it('reorders the grid when the sort select changes', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    // Default "Closing soonest": Airbnb (closes tomorrow) is first.
    expect(cardTitles()[0]).toBe('Product Design Foundations')
    await user.selectOptions(screen.getByRole('combobox', { name: /sort tracks/i }), 'Best fit')
    // Highest fitScore (Talentbank, 91) first.
    expect(cardTitles()[0]).toBe('Frontend Architecture Mentorship')
  })

  it('shows a disabled Join Waitlist for a full track', async () => {
    const user = userEvent.setup()
    render(<Marketplace />)
    await user.type(screen.getByRole('searchbox', { name: /search tracks/i }), 'Talentbank')
    expect(cardTitles()).toEqual(['Frontend Architecture Mentorship'])
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeDisabled()
    expect(screen.getByText(/cap reached/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^apply$/i })).not.toBeInTheDocument()
  })
})
