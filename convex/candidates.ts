import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { reliabilityDisplay } from './reliability'

/** The signed-in user's own candidate profile, or null. No demo fallback:
 *  a fresh account has no matchable profile until it finishes onboarding. */
async function myCandidate(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('candidates')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) return null
    const userId = await getAuthUserId(ctx)
    const user = userId ? await ctx.db.get(userId) : null
    // Additive display field; `reliabilityScore` is left untouched so matching
    // and every existing consumer keep the raw numeric value. Email is always
    // the account's login email, never a separately-edited value.
    return {
      ...candidate,
      email: user?.email ?? candidate.email ?? '',
      resumeUrl: candidate.resumeStorageId ? await ctx.storage.getUrl(candidate.resumeStorageId) : null,
      reliabilityDisplay: await reliabilityDisplay(
        ctx,
        'candidate',
        candidate._id,
        candidate.reliabilityScore,
        false,
      ),
    }
  },
})

const skill = v.object({ name: v.string(), level: v.number() })

/** Persist the onboarding result to the signed-in student's own profile.
 *  Contact fields (name, email, phone) are optional so onboarding can omit them
 *  while the settings screen can edit them. */
export const saveProfile = mutation({
  args: {
    headline: v.string(),
    university: v.string(),
    program: v.string(),
    skills: v.array(skill),
    interests: v.array(v.string()),
    aspirations: v.array(v.string()),
    availabilityHoursPerWeek: v.number(),
    animalKey: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError('Not signed in')
    const user = await ctx.db.get(userId)
    const existing = await ctx.db
      .query('candidates')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    const { name, email, phone, ...rest } = args
    // Email is editable. When it changes we update the account (users) record
    // too, so the login/account email and the profile stay in sync. An empty
    // value keeps the current email rather than clearing it.
    let effectiveEmail = user?.email ?? undefined
    const newEmail = email?.trim()
    if (newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new ConvexError('Enter a valid email address')
      if (newEmail !== user?.email) await ctx.db.patch(userId, { email: newEmail })
      effectiveEmail = newEmail
    }
    const contact = {
      ...(name !== undefined ? { name: name.trim() } : {}),
      email: effectiveEmail,
      ...(phone !== undefined ? { phone: phone.trim() || undefined } : {}),
    }
    if (existing) {
      await ctx.db.patch(existing._id, { ...rest, ...contact, profileComplete: true })
      return existing._id
    }
    return await ctx.db.insert('candidates', {
      userId,
      name: name?.trim() || user?.name || '',
      email: effectiveEmail,
      phone: phone?.trim() || undefined,
      reliabilityScore: 95,
      ...rest,
      profileComplete: true,
    })
  },
})

/** A signed-in student requests a URL to upload their resume file. */
export const generateResumeUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError('Not signed in')
    return await ctx.storage.generateUploadUrl()
  },
})

/** Attach an uploaded file as the student's resume; replaces any previous one. */
export const setResume = mutation({
  args: { storageId: v.id('_storage'), fileName: v.string() },
  handler: async (ctx, { storageId, fileName }) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) throw new ConvexError('Finish your profile before attaching a resume')
    if (candidate.resumeStorageId && candidate.resumeStorageId !== storageId) {
      await ctx.storage.delete(candidate.resumeStorageId)
    }
    await ctx.db.patch(candidate._id, { resumeStorageId: storageId, resumeName: fileName.slice(0, 200) })
  },
})

/** Remove the student's attached resume. */
export const removeResume = mutation({
  args: {},
  handler: async (ctx) => {
    const candidate = await myCandidate(ctx)
    if (!candidate) return
    if (candidate.resumeStorageId) await ctx.storage.delete(candidate.resumeStorageId)
    await ctx.db.patch(candidate._id, { resumeStorageId: undefined, resumeName: undefined })
  },
})
