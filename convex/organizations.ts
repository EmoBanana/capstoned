import { ConvexError } from 'convex/values'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { reliabilityDisplay } from './reliability'

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'company'

/** The organization the signed-in recruiter represents, or null. Resolved via
 *  membership (many mentors per company); falls back to legacy sole ownership. */
export async function myOrg(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  const membership = await ctx.db
    .query('orgMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
  if (membership) return await ctx.db.get(membership.orgId)
  // Legacy: orgs claimed before memberships existed.
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
      reliabilityDisplay: await reliabilityDisplay(ctx, 'organization', org._id, org.reliability, org.verified),
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

/** Add a user to an org's membership if they aren't already a member. */
async function ensureMember(ctx: MutationCtx, orgId: Id<'organizations'>, userId: Id<'users'>) {
  const existing = await ctx.db
    .query('orgMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()
  if (existing) {
    if (existing.orgId !== orgId) await ctx.db.patch(existing._id, { orgId })
    return
  }
  await ctx.db.insert('orgMembers', { orgId, userId })
}

/**
 * Finish company onboarding. A company can be represented by many mentors:
 * entering a company that already exists JOINS it (shared tracks, applicants,
 * mentees) rather than being blocked; a new name CREATES the company. Editing
 * later updates the shared company profile.
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

    // Already represent a company? Update the shared profile in place.
    const current = await myOrg(ctx)
    if (current) {
      await ensureMember(ctx, current._id, userId)
      await ctx.db.patch(current._id, { name: cleanName, department, about, brandColor })
      return current.slug
    }

    const slug = slugify(cleanName)
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    // Join an existing company (any mentor can represent it).
    if (existing) {
      await ensureMember(ctx, existing._id, userId)
      return existing.slug
    }

    // Create a brand-new company; the creator is its first member.
    const orgId = await ctx.db.insert('organizations', {
      name: cleanName,
      slug,
      brandColor: brandColor || '4B5563',
      reliability: 95,
      verified: false,
      ownerUserId: userId,
      department,
      about,
    })
    await ensureMember(ctx, orgId, userId)
    return slug
  },
})

/** Existing companies a mentor can represent (join) during onboarding. */
export const claimable = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()
    return orgs.map((o) => ({ name: o.name, slug: o.slug, brandColor: o.brandColor }))
  },
})
