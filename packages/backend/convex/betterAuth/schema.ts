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

  // Custom profile fields
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),

  // Onboarding & approval workflow
  onboardingCompleted: v.optional(v.boolean()),
  approvalStatus: v.optional(
    v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
  ),
  approvedBy: v.optional(v.string()), // User ID of admin who approved/rejected
  approvedAt: v.optional(v.number()),
  rejectionReason: v.optional(v.string()),
})
  .index("email_name", ["email", "name"])
  .index("name", ["name"])
  .index("userId", ["userId"])
  .index("approvalStatus", ["approvalStatus"]);

// Extend the team table with sports-specific fields
const customTeamTable = defineTable({
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
})
  .index("organizationId", ["organizationId"])
  .index("sport", ["sport"])
  .index("ageGroup", ["ageGroup"])
  .index("season", ["season"])
  .index("isActive", ["isActive"]);

export const tables = {
  ...generatedTables,
  // Override user table with custom fields
  user: customUserTable,
  // Override team table with sports-specific fields
  team: customTeamTable,
};

const schema = defineSchema(tables);

export default schema;
