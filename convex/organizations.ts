import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'company'

/** The organization owned by the signed-in recruiter, or null. */
export async function myOrg(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('organizations')
    .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
    .first()
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const org = await myOrg(ctx)
    if (!org) return null
    const logoUrl = org.logoStorageId ? await ctx.storage.getUrl(org.logoStorageId) : null
    return {
      id: org._id as string,
      name: org.name,
      slug: org.slug,
      brandColor: org.brandColor,
      reliability: org.reliability,
      department: org.department ?? '',
      about: org.about ?? '',
      logoUrl,
    }
  },
})

/**
 * Hand the signed-in owner a short-lived signed URL to POST their logo file to.
 * Only a recruiter who already owns a company may upload for it.
 */
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await myOrg(ctx)
    if (!org) throw new ConvexError('Create your company profile first')
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Attach an uploaded file as the caller's company logo. Replacing an existing
 * logo deletes the previous storage object so nothing is orphaned.
 */
export const setLogo = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const org = await myOrg(ctx)
    if (!org) throw new ConvexError('Create your company profile first')
    if (org.logoStorageId && org.logoStorageId !== storageId) {
      await ctx.storage.delete(org.logoStorageId)
    }
    await ctx.db.patch(org._id, { logoStorageId: storageId })
  },
})

/**
 * Finish company onboarding. Deriving the slug from the name, this either
 * CLAIMS an existing unowned seeded company of the same name (inheriting its
 * tracks + applicants — useful for the demo) or CREATES a brand-new company.
 * A recruiter owns exactly one org; calling again updates it.
 */
export const saveCompany = mutation({
  args: {
    name: v.string(),
    department: v.string(),
    about: v.string(),
    brandColor: v.string(),
  },
  handler: async (ctx, { name, department, about, brandColor }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new ConvexError('Not signed in')
    const cleanName = name.trim()
    if (!cleanName) throw new ConvexError('Company name required')

    // Already own one? Update it in place.
    const owned = await myOrg(ctx)
    if (owned) {
      await ctx.db.patch(owned._id, { name: cleanName, department, about, brandColor })
      return owned.slug
    }

    const slug = slugify(cleanName)
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    if (existing) {
      if (existing.ownerUserId && existing.ownerUserId !== userId) {
        throw new ConvexError('That company is already managed by another account')
      }
      // Claim the seeded (or previously-created) company.
      await ctx.db.patch(existing._id, {
        ownerUserId: userId,
        department: department || existing.department,
        about: about || existing.about,
      })
      return existing.slug
    }

    await ctx.db.insert('organizations', {
      name: cleanName,
      slug,
      brandColor: brandColor || '4B5563',
      reliability: 95,
      verified: false,
      ownerUserId: userId,
      department,
      about,
    })
    return slug
  },
})

/** Seeded companies not yet claimed — offered during onboarding for the demo. */
export const claimable = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()
    return orgs
      .filter((o) => !o.ownerUserId)
      .map((o) => ({ name: o.name, slug: o.slug, brandColor: o.brandColor }))
  },
})
