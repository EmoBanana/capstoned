import { errorText } from '@/src/components/errors'

describe('errorText', () => {
  it('reads a ConvexError-style .data payload verbatim', () => {
    expect(errorText({ data: 'This track is at its seat cap of 50.' })).toBe('This track is at its seat cap of 50.')
  })

  it('strips the "Error:" prefix from a plain Error message', () => {
    expect(errorText(new Error('Error: Finish onboarding before applying'))).toBe('Finish onboarding before applying')
  })

  it('drops a leading [Request ID] tag', () => {
    expect(errorText(new Error('[Request ID: abc123] Not your application'))).toBe('Not your application')
  })

  it('falls back to a friendly message when empty', () => {
    expect(errorText(new Error(''))).toMatch(/something went wrong/i)
  })
})
