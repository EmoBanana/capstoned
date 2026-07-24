import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Login from '@/src/screens/Login'

describe('Login', () => {
  it('renders the sign-in form with role options', () => {
    render(<Login onSelect={() => {}} />)
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByText(/Browse mentorship tracks/i)).toBeInTheDocument()
    expect(screen.getByText(/Design programs, review applicants/i)).toBeInTheDocument()
  })

  it('submits the selected role (student by default)', async () => {
    const onSelect = vi.fn()
    render(<Login onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /sign in as student/i }))
    expect(onSelect).toHaveBeenCalledWith('student')
  })

  it('switches to the recruiter role and submits it', async () => {
    const onSelect = vi.fn()
    render(<Login onSelect={onSelect} />)
    const recruiterCard = screen.getByText('Recruiter').closest('button')
    expect(recruiterCard).not.toBeNull()
    await userEvent.click(recruiterCard!)
    await userEvent.click(screen.getByRole('button', { name: /sign in as recruiter/i }))
    expect(onSelect).toHaveBeenCalledWith('recruiter')
  })
})
