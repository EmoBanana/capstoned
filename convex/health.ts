import { query } from './_generated/server'

// Minimal query to verify the client <-> deployment pipeline.
export const ping = query({
  args: {},
  handler: async () => 'ok',
})
