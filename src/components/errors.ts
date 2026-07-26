/** Extract a clean, user-facing message from a thrown Convex error.
 *  ConvexError carries the payload on `.data`; plain errors get their message
 *  stripped of Convex's "[Request ID] Server Error: Uncaught Error:" noise. */
export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e && typeof (e as { data: unknown }).data === 'string') {
    return (e as { data: string }).data
  }
  const raw = e instanceof Error ? e.message : String(e)
  const cleaned = raw
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^(Uncaught\s+)?(ConvexError|Error):\s*/i, '')
    .split('\n')[0]
    .trim()
  return cleaned || 'Something went wrong. Please try again.'
}
