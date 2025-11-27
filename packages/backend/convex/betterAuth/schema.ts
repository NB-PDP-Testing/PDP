// Custom schema that extends the generated Better Auth schema
// Regenerate base schema with: npx @better-auth/cli generate --output ./convex/betterAuth/generatedSchema.ts -y

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as generatedTables } from "./generatedSchema";

// Extend the user table with custom fields
const customUserTable = defineTable({
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  image: v.optional(v.union(v.null(), v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
  userId: v.optional(v.union(v.null(), v.string())),
  // Custom fields
  onboardingComplete: v.optional(v.boolean()),
})
  .index("email_name", ["email", "name"])
  .index("name", ["name"])
  .index("userId", ["userId"]);

export const tables = {
  ...generatedTables,
  // Override user table with custom fields
  user: customUserTable,
};

const schema = defineSchema(tables);

export default schema;
