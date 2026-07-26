import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'

type Role = 'student' | 'recruiter'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Capture name + role at sign-up so the user document carries them.
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string | undefined) ?? '',
          role: ((params.role as string | undefined) ?? 'student') as Role,
        }
      },
    }),
  ],
  callbacks: {
    // A new student gets a real, empty candidate profile linked to their account.
    // No demo persona is ever shared — the profile starts blank and onboarding fills it.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return
      const user = await ctx.db.get(userId)
      if (!user || user.role !== 'student') return
      // The callback types ctx.db against the auth data model only, so the
      // app tables aren't known here — reach them through an untyped handle.
      const db = ctx.db as unknown as {
        query: (t: string) => {
          withIndex: (i: string, f: (q: { eq: (k: string, val: unknown) => unknown }) => unknown) => { first: () => Promise<unknown> }
        }
        insert: (t: string, doc: Record<string, unknown>) => Promise<unknown>
      }
      const already = await db
        .query('candidates')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .first()
      if (already) return
      await db.insert('candidates', {
        userId,
        name: user.name ?? '',
        headline: '',
        university: '',
        program: '',
        skills: [],
        interests: [],
        aspirations: [],
        availabilityHoursPerWeek: 0,
        animalKey: '',
        reliabilityScore: 95,
        profileComplete: false,
      })
    },
  },
})
