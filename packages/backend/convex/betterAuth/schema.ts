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
  // Accepts: Male, Female, Mixed (capitals) and legacy Boys/Girls
  gender: v.optional(
    v.union(
      v.literal("Male"),
      v.literal("Female"),
      v.literal("Mixed"),
      v.literal("Boys"),
      v.literal("Girls")
    )
  ),
  season: v.optional(v.string()), // e.g., "2025"
  description: v.optional(v.string()),
  trainingSchedule: v.optional(v.string()), // e.g., "Tuesdays & Thursdays 6-7pm"
  homeVenue: v.optional(v.string()),
  isActive: v.optional(v.boolean()),

  // Coach notes - timestamped notes from coaches about the team
  // Format: "[date] note content\n\n[date] note content..."
  coachNotes: v.optional(v.string()),
};

// Extend the team table with sports-specific fields
const customTeamTable = defineTable(customTeamTableSchema)
  .index("organizationId", ["organizationId"])
  .index("sport", ["sport"])
  .index("ageGroup", ["ageGroup"])
  .index("season", ["season"])
  .index("isActive", ["isActive"]);

// Extend the organization table with club colors and social links
const customOrganizationTable = defineTable({
  // Better Auth base fields
  name: v.string(),
  slug: v.string(),
  logo: v.optional(v.union(v.null(), v.string())),
  createdAt: v.number(),
  metadata: v.optional(v.union(v.null(), v.string())),

  // Custom field: club colors (array of hex codes)
  colors: v.optional(v.array(v.string())),

  // Social media links
  socialFacebook: v.optional(v.union(v.null(), v.string())),
  socialTwitter: v.optional(v.union(v.null(), v.string())),
  socialInstagram: v.optional(v.union(v.null(), v.string())),
  socialLinkedin: v.optional(v.union(v.null(), v.string())),

  // Organization website
  website: v.optional(v.union(v.null(), v.string())),

  // Supported sports for this organization (array of sport codes)
  // Allows multi-sport organizations (e.g., GAA clubs with football, hurling, camogie)
  // Sport codes reference the sports table: "gaa_football", "soccer", "rugby", etc.
  supportedSports: v.optional(v.array(v.string())),
})
  .index("name", ["name"])
  .index("slug", ["slug"]);

const customMemberTable = defineTable({
  // Better Auth base fields
  organizationId: v.string(),
  userId: v.string(),
  role: v.string(), // Better Auth org role (owner/admin/member)
  createdAt: v.number(),

  // Custom field: functional roles for sports club capabilities
  // Includes: coach, parent, admin, player (for adult players)
  functionalRoles: v.optional(
    v.array(
      v.union(
        v.literal("coach"),
        v.literal("parent"),
        v.literal("admin"),
        v.literal("player")
      )
    )
  ),

  // Active functional role - which role the user is currently operating as
  activeFunctionalRole: v.optional(
    v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    )
  ),

  // Pending role requests awaiting admin approval
  pendingFunctionalRoleRequests: v.optional(
    v.array(
      v.object({
        role: v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        ),
        requestedAt: v.string(),
        message: v.optional(v.string()),
      })
    )
  ),

  // User disable/suspend fields
  isDisabled: v.optional(v.boolean()),
  disabledAt: v.optional(v.number()),
  disabledBy: v.optional(v.string()), // User ID who disabled
  disableReason: v.optional(v.string()),
  disableType: v.optional(
    v.union(
      v.literal("org_only"), // Access to this org disabled
      v.literal("account") // Entire account disabled (if only 1 org)
    )
  ),
})
  .index("organizationId", ["organizationId"])
  .index("userId", ["userId"])
  .index("role", ["role"])
  .index("organizationId_userId", ["organizationId", "userId"])
  .index("organizationId_role", ["organizationId", "role"])
  .index("isDisabled", ["isDisabled"]);

// Extend the invitation table with metadata field for functional roles
const customInvitationTable = defineTable({
  // Better Auth base fields
  organizationId: v.string(),
  email: v.string(),
  role: v.optional(v.union(v.null(), v.string())),
  teamId: v.optional(v.union(v.null(), v.string())),
  status: v.string(),
  expiresAt: v.number(),
  inviterId: v.string(),

  // Custom field: metadata for storing functional roles and assignments
  metadata: v.optional(v.any()),
})
  .index("organizationId", ["organizationId"])
  .index("email", ["email"])
  .index("role", ["role"])
  .index("teamId", ["teamId"])
  .index("status", ["status"])
  .index("inviterId", ["inviterId"])
  .index("email_status", ["email", "status"])
  .index("organizationId_status", ["organizationId", "status"])
  .index("inviterId_organizationId", ["inviterId", "organizationId"]);

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
  // Override invitation table with metadata field
  invitation: customInvitationTable,
};

const schema = defineSchema(tables);

export default schema;
