import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

export default defineSchema({
  ...authTables,
  // Override the auth `users` table to add our app role.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // App-specific:
    role: v.optional(v.union(v.literal('student'), v.literal('recruiter'))),
  }).index('email', ['email']),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // brand-logo slug (simple-icons) or 'talentbank'
    brandColor: v.string(), // hex without '#'
    reliability: v.number(), // 0-100
    verified: v.boolean(),
  }).index('by_slug', ['slug']),

  tracks: defineTable({
    orgId: v.id('organizations'),
    title: v.string(),
    department: v.optional(v.string()),
    description: v.optional(v.string()),
    intensity: v.union(v.literal('Part-time'), v.literal('Full-time')),
    durationWeeks: v.number(),
    weeklyHours: v.number(),
    commitmentLine: v.string(),
    skills: v.array(v.string()),
    applicants: v.number(),
    cap: v.number(),
    slaHours: v.number(),
    closesInDays: v.number(),
    fitScore: v.number(),
    status: v.union(
      v.literal('draft'),
      v.literal('open'),
      v.literal('in-progress'),
      v.literal('closed'),
    ),
  })
    .index('by_org', ['orgId'])
    .index('by_status', ['status']),
})
