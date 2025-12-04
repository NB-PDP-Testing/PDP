// Custom schema that extends the generated Better Auth schema
// Regenerate base schema with: npx @better-auth/cli generate --output ./convex/betterAuth/generatedSchema.ts -y

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as generatedTables } from "./generatedSchema";

// Extend the user table with custom fields
const customUserTable = defineTable({
  // Better Auth base fields
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  image: v.optional(v.union(v.null(), v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
  userId: v.optional(v.union(v.null(), v.string())),

  // Staff
  isPlatformStaff: v.optional(v.boolean()),

  // Custom profile fields
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),

  // onboarding
  onboardingComplete: v.optional(v.boolean()),

  // Current organization tracking
  currentOrgId: v.optional(v.string()),
})
  .index("email_name", ["email", "name"])
  .index("name", ["name"])
  .index("userId", ["userId"]);

export const customTeamTableSchema = {
  // Better Auth base fields
  name: v.string(),
  organizationId: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.union(v.null(), v.number())),

  // Sports-specific fields
  sport: v.optional(v.string()), // e.g., "GAA Football", "Hurling"
  ageGroup: v.optional(v.string()), // e.g., "U12", "U14"
  gender: v.optional(
    v.union(v.literal("Boys"), v.literal("Girls"), v.literal("Mixed"))
  ),
  season: v.optional(v.string()), // e.g., "2025"
  description: v.optional(v.string()),
  trainingSchedule: v.optional(v.string()), // e.g., "Tuesdays & Thursdays 6-7pm"
  homeVenue: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
};

// Extend the team table with sports-specific fields
const customTeamTable = defineTable(customTeamTableSchema)
  .index("organizationId", ["organizationId"])
  .index("sport", ["sport"])
  .index("ageGroup", ["ageGroup"])
  .index("season", ["season"])
  .index("isActive", ["isActive"]);

// Extend the organization table with club colors
const customOrganizationTable = defineTable({
  // Better Auth base fields
  name: v.string(),
  slug: v.string(),
  logo: v.optional(v.union(v.null(), v.string())),
  createdAt: v.number(),
  metadata: v.optional(v.union(v.null(), v.string())),

  // Custom field: club colors (array of hex codes)
  colors: v.optional(v.array(v.string())),
})
  .index("name", ["name"])
  .index("slug", ["slug"]);

const customMemberTable = generatedTables.member.index(
  "organizationId_userId",
  ["organizationId", "userId"]
);

export const tables = {
  ...generatedTables,
  // Override user table with custom fields
  user: customUserTable,
  // Override team table with sports-specific fields
  team: customTeamTable,
  // Override organization table with club colors
  organization: customOrganizationTable,
  // Override member table with custom index
  member: customMemberTable,
};

const schema = defineSchema(tables);

export default schema;
