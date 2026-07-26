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
})
