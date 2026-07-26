import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Login from '@/src/screens/Login'

describe('Login', () => {
  it('renders the sign-in form with role options', () => {
    render(<Login onSubmit={() => {}} />)
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByText(/Browse mentorship tracks/i)).toBeInTheDocument()
    expect(screen.getByText(/Design programs, review applicants/i)).toBeInTheDocument()
  })

  it('submits credentials with the student role by default', async () => {
    const onSubmit = vi.fn()
    render(<Login onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in as student/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'student',
        mode: 'signin',
        email: 'a@b.com',
        password: 'secret123',
      }),
    )
  })

  it('switches to the recruiter role and submits it', async () => {
    const onSubmit = vi.fn()
    render(<Login onSubmit={onSubmit} />)
    const recruiterCard = screen.getByText('Recruiter').closest('button')
    expect(recruiterCard).not.toBeNull()
    await userEvent.click(recruiterCard!)
    await userEvent.type(screen.getByLabelText(/email/i), 'r@c.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in as recruiter/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ role: 'recruiter' }))
  })

  it('shows an error message when provided', () => {
    render(<Login onSubmit={() => {}} error="Could not sign in." />)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not sign in/i)
  })
})
