import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";

// ============================================================
// DEFAULT IMPORT TEMPLATE SEEDS
// ============================================================
// Pre-configured templates for GAA Foireann exports and
// generic CSV imports so users can start importing immediately.
// ============================================================

const GAA_FOIREANN_TEMPLATE = {
  name: "GAA Foireann Export",
  description: "Import from GAA Foireann membership export CSV",
  sportCode: "gaa_football",
  sourceType: "csv" as const,
  scope: "platform" as const,
  columnMappings: [
    {
      sourcePattern: "Forename",
      targetField: "firstName",
      required: true,
      aliases: ["FirstName", "First Name", "forename"],
    },
    {
      sourcePattern: "Surname",
      targetField: "lastName",
      required: true,
      aliases: ["LastName", "Last Name", "surname"],
    },
    {
      sourcePattern: "DOB",
      targetField: "dateOfBirth",
      required: true,
      transform: "parseDate",
      aliases: ["DateOfBirth", "Date of Birth", "dob"],
    },
    {
      sourcePattern: "gender",
      targetField: "gender",
      required: true,
      transform: "normalizeGender",
      aliases: ["Gender", "Sex"],
    },
    {
      sourcePattern: "email",
      targetField: "parentEmail",
      required: false,
      aliases: ["Email", "E-mail", "email address"],
    },
    {
      sourcePattern: "Mobile Number",
      targetField: "parentPhone",
      required: false,
      aliases: ["Phone", "Mobile", "phone", "mobile number"],
    },
    {
      sourcePattern: "Address1",
      targetField: "address",
      required: false,
      aliases: ["Address", "Street", "address1"],
    },
    {
      sourcePattern: "Address2",
      targetField: "addressLine2",
      required: false,
      aliases: ["address2"],
    },
    {
      sourcePattern: "Town",
      targetField: "town",
      required: false,
      aliases: ["City", "town", "city"],
    },
    {
      sourcePattern: "Postcode",
      targetField: "postcode",
      required: false,
      aliases: ["Eircode", "Zip", "Post Code", "postcode", "eircode"],
    },
    {
      sourcePattern: "Membership Type",
      targetField: "membershipType",
      required: false,
      aliases: ["MembershipType", "membership type", "Member Type"],
    },
    {
      sourcePattern: "Player",
      targetField: "isPlayer",
      required: false,
      aliases: ["IsPlayer", "Playing Member", "player"],
    },
  ],
  ageGroupMappings: [
    { sourceValue: "JUVENILE", targetAgeGroup: "auto" },
    { sourceValue: "YOUTH", targetAgeGroup: "auto" },
    { sourceValue: "SENIOR", targetAgeGroup: "senior" },
    { sourceValue: "ADULT", targetAgeGroup: "senior" },
    { sourceValue: "SOCIAL", targetAgeGroup: "senior" },
  ],
  skillInitialization: {
    strategy: "age-appropriate" as const,
    applyToPassportStatus: ["active"],
  },
  defaults: {
    createTeams: true,
    createPassports: true,
    season: "2025",
  },
};

const GENERIC_CSV_TEMPLATE = {
  name: "Generic CSV/Excel",
  description: "Import from any CSV or Excel file with common column patterns",
  sourceType: "csv" as const,
  scope: "platform" as const,
  columnMappings: [
    {
      sourcePattern: "/first.*name|forename|fname|given.*name/i",
      targetField: "firstName",
      required: true,
    },
    {
      sourcePattern: "/last.*name|surname|lname|family.*name/i",
      targetField: "lastName",
      required: true,
    },
    {
      sourcePattern: "/dob|date.*birth|birth.*date|birthday/i",
      targetField: "dateOfBirth",
      required: true,
      transform: "parseDate",
    },
    {
      sourcePattern: "/gender|sex/i",
      targetField: "gender",
      required: true,
      transform: "normalizeGender",
    },
    {
      sourcePattern: "/e-?mail|contact.*email/i",
      targetField: "parentEmail",
      required: false,
    },
    {
      sourcePattern: "/phone|mobile|cell|telephone|contact.*number/i",
      targetField: "parentPhone",
      required: false,
    },
    {
      sourcePattern: "/address|street/i",
      targetField: "address",
      required: false,
    },
    {
      sourcePattern: "/town|city/i",
      targetField: "town",
      required: false,
    },
    {
      sourcePattern: "/post.*code|zip|eircode/i",
      targetField: "postcode",
      required: false,
    },
    {
      sourcePattern: "/age.*group|team|squad/i",
      targetField: "ageGroup",
      required: false,
    },
  ],
  skillInitialization: {
    strategy: "blank" as const,
    applyToPassportStatus: ["active"],
  },
  defaults: {
    createTeams: true,
    createPassports: true,
  },
};

/**
 * Seed default import templates if they don't already exist.
 * Idempotent: safe to call multiple times.
 */
export const seedDefaultTemplates = mutation({
  args: {},
  returns: v.object({
    gaaTemplateId: v.optional(v.id("importTemplates")),
    genericTemplateId: v.optional(v.id("importTemplates")),
    alreadyExisted: v.boolean(),
  }),
  handler: async (ctx) => {
    const now = Date.now();

    // Check if templates already exist
    const existingPlatformTemplates = await ctx.db
      .query("importTemplates")
      .withIndex("by_scope", (q) => q.eq("scope", "platform"))
      .collect();

    const gaaExists = existingPlatformTemplates.some(
      (t) => t.name === "GAA Foireann Export" && t.isActive
    );
    const genericExists = existingPlatformTemplates.some(
      (t) => t.name === "Generic CSV/Excel" && t.isActive
    );

    if (gaaExists && genericExists) {
      return { alreadyExisted: true };
    }

    let gaaTemplateId: Id<"importTemplates"> | undefined;
    let genericTemplateId: Id<"importTemplates"> | undefined;

    if (!gaaExists) {
      gaaTemplateId = await ctx.db.insert("importTemplates", {
        ...GAA_FOIREANN_TEMPLATE,
        isActive: true,
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!genericExists) {
      genericTemplateId = await ctx.db.insert("importTemplates", {
        ...GENERIC_CSV_TEMPLATE,
        isActive: true,
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      gaaTemplateId,
      genericTemplateId,
      alreadyExisted: false,
    };
  },
});

/**
 * Query to check if default templates have been seeded
 */
export const hasDefaultTemplates = query({
  args: {},
  returns: v.object({
    gaaTemplate: v.boolean(),
    genericTemplate: v.boolean(),
  }),
  handler: async (ctx) => {
    const platformTemplates = await ctx.db
      .query("importTemplates")
      .withIndex("by_scope", (q) => q.eq("scope", "platform"))
      .collect();

    return {
      gaaTemplate: platformTemplates.some(
        (t) => t.name === "GAA Foireann Export" && t.isActive
      ),
      genericTemplate: platformTemplates.some(
        (t) => t.name === "Generic CSV/Excel" && t.isActive
      ),
    };
  },
});

// ============================================================
// GAA FOIREANN CONNECTOR SEED
// ============================================================
// Creates the GAA Foireann federation connector with OAuth 2.0
// authentication and links it to the GAA import template.
// ============================================================

/**
 * Seed GAA Foireann connector if it doesn't already exist.
 * Creates placeholder connector without real credentials.
 * Credentials will be set per-organization when they connect.
 * Idempotent: safe to call multiple times.
 */
export const seedGAAConnector = action({
  args: {},
  returns: v.object({
    connectorId: v.optional(v.id("federationConnectors")),
    templateId: v.optional(v.id("importTemplates")),
    alreadyExisted: v.boolean(),
  }),
  handler: async (ctx) => {
    // First, ensure the GAA template exists
    const templateResult = await ctx.runMutation(
      internal.models.importTemplateSeeds.seedDefaultTemplates,
      {}
    );

    // Get the GAA template ID (either newly created or existing)
    let gaaTemplateId: Id<"importTemplates"> | undefined =
      templateResult.gaaTemplateId;

    // If template already existed, we need to find it
    if (!gaaTemplateId) {
      const existingTemplates = await ctx.runQuery(
        internal.models.importTemplateSeeds.findGAATemplate,
        {}
      );
      gaaTemplateId = existingTemplates;
    }

    if (!gaaTemplateId) {
      throw new Error("Failed to create or find GAA Foireann template");
    }

    // Create placeholder credentials file
    // Real credentials will be set when organizations connect
    const placeholderCredentials = {
      type: "oauth2" as const,
      accessToken: "placeholder",
      refreshToken: "placeholder",
    };

    // Import encryption utilities
    const { encryptCredentials } = await import("../lib/federation/encryption");

    // Encrypt placeholder credentials
    const encryptedData = await encryptCredentials(placeholderCredentials);

    // Store encrypted credentials in file storage
    const credentialsBlob = new Blob([encryptedData], {
      type: "application/octet-stream",
    });
    const credentialsStorageId = await ctx.storage.store(credentialsBlob);

    // Create connector via internal mutation
    const connectorId = await ctx.runMutation(
      internal.models.importTemplateSeeds.createGAAConnectorInternal,
      {
        templateId: gaaTemplateId,
        credentialsStorageId,
      }
    );

    return {
      connectorId,
      templateId: gaaTemplateId,
      alreadyExisted: !connectorId,
    };
  },
});

/**
 * Internal query to find existing GAA template
 */
export const findGAATemplate = query({
  args: {},
  returns: v.union(v.id("importTemplates"), v.null()),
  handler: async (ctx) => {
    const platformTemplates = await ctx.db
      .query("importTemplates")
      .withIndex("by_scope", (q) => q.eq("scope", "platform"))
      .collect();

    const gaaTemplate = platformTemplates.find(
      (t) => t.name === "GAA Foireann Export" && t.isActive
    );

    return gaaTemplate?._id ?? null;
  },
});

/**
 * Internal mutation to create GAA connector
 */
export const createGAAConnectorInternal = internalMutation({
  args: {
    templateId: v.id("importTemplates"),
    credentialsStorageId: v.id("_storage"),
  },
  returns: v.union(v.id("federationConnectors"), v.null()),
  handler: async (ctx, args) => {
    // Check if connector already exists
    const existingConnectors = await ctx.db
      .query("federationConnectors")
      .collect();

    const gaaConnectorExists = existingConnectors.some(
      (c) => c.federationCode === "gaa_foireann"
    );

    if (gaaConnectorExists) {
      return null; // Already exists
    }

    const now = Date.now();

    // Create connector with encrypted placeholder credentials
    // Real credentials will be set when organizations connect
    const connectorId = await ctx.db.insert("federationConnectors", {
      name: "GAA Foireann",
      federationCode: "gaa_foireann",
      status: "inactive", // Start inactive until OAuth configured
      authType: "oauth2",
      credentialsStorageId: args.credentialsStorageId,
      endpoints: {
        membershipList: "https://api.foireann.ie/v2/clubs/{clubId}/members",
        memberDetail: "https://api.foireann.ie/v2/members/{memberId}",
      },
      syncConfig: {
        enabled: false, // Disabled until OAuth configured
        conflictStrategy: "federation_wins", // Foireann is source of truth
      },
      templateId: args.templateId,
      connectedOrganizations: [],
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    });

    return connectorId;
  },
});
