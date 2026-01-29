/**
 * GDPR Consent Management
 *
 * Handles GDPR policy version tracking and user consent management.
 * - Platform staff can create new GDPR versions
 * - Users must accept the latest GDPR version before using the platform
 * - Re-acceptance is triggered when a new version is published
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============ PUBLIC QUERIES ============

/**
 * Get the current (latest effective) GDPR version
 * Returns the latest version where effectiveDate <= Date.now(), ordered by version desc
 */
export const getCurrentGdprVersion = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("gdprVersions"),
      version: v.number(),
      summary: v.string(),
      fullText: v.string(),
      effectiveDate: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const now = Date.now();

    // Get all versions and filter to effective ones
    const allVersions = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .order("desc")
      .collect();

    // Find the first version that is effective (effectiveDate <= now)
    const effectiveVersion = allVersions.find(
      (version) => version.effectiveDate <= now
    );

    if (!effectiveVersion) {
      return null;
    }

    return {
      _id: effectiveVersion._id,
      version: effectiveVersion.version,
      summary: effectiveVersion.summary,
      fullText: effectiveVersion.fullText,
      effectiveDate: effectiveVersion.effectiveDate,
    };
  },
});

/**
 * Check if the current user needs to accept/re-accept GDPR
 * Returns: { needsConsent, currentVersion, userVersion }
 */
export const checkUserGdprStatus = query({
  args: {},
  returns: v.object({
    needsConsent: v.boolean(),
    currentVersion: v.union(v.number(), v.null()),
    userVersion: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return {
        needsConsent: true,
        currentVersion: null,
        userVersion: undefined,
      };
    }

    // Get current GDPR version
    const now = Date.now();
    const allVersions = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .order("desc")
      .collect();

    const effectiveVersion = allVersions.find(
      (version) => version.effectiveDate <= now
    );

    if (!effectiveVersion) {
      // No GDPR version exists yet - consent not required
      return {
        needsConsent: false,
        currentVersion: null,
        userVersion: user.gdprConsentVersion,
      };
    }

    const currentVersion = effectiveVersion.version;
    const userVersion = user.gdprConsentVersion;

    // User needs consent if:
    // 1. User has never consented (userVersion is undefined)
    // 2. User's version is older than current version
    const needsConsent =
      userVersion === undefined || userVersion < currentVersion;

    return {
      needsConsent,
      currentVersion,
      userVersion,
    };
  },
});

/**
 * Get all GDPR versions (for platform staff admin page)
 * Ordered by version number descending (newest first)
 */
export const getAllGdprVersions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("gdprVersions"),
      version: v.number(),
      summary: v.string(),
      fullText: v.string(),
      effectiveDate: v.number(),
      createdBy: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Verify platform staff
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Only platform staff can view all GDPR versions");
    }

    const versions = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .order("desc")
      .collect();

    return versions;
  },
});

// ============ PUBLIC MUTATIONS ============

/**
 * Accept GDPR consent
 * Updates the user's gdprConsentVersion and gdprConsentedAt fields
 */
export const acceptGdpr = mutation({
  args: {
    version: v.number(),
    consentedToMarketing: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated to accept GDPR");
    }

    // Verify the version matches the current effective version
    const now = Date.now();
    const allVersions = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .order("desc")
      .collect();

    const effectiveVersion = allVersions.find(
      (version) => version.effectiveDate <= now
    );

    if (!effectiveVersion) {
      throw new Error("No GDPR version is currently effective");
    }

    if (effectiveVersion.version !== args.version) {
      throw new Error(
        `Cannot accept GDPR version ${args.version}. Current version is ${effectiveVersion.version}.`
      );
    }

    // Update the user's GDPR consent
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          gdprConsentVersion: args.version,
          gdprConsentedAt: now,
        },
      },
    });

    // TODO: If marketing consent tracking is needed, store it separately
    // For now, we just log it
    if (args.consentedToMarketing !== undefined) {
      console.log(
        `[GDPR] User ${user._id} marketing consent: ${args.consentedToMarketing}`
      );
    }

    return null;
  },
});

/**
 * Create a new GDPR version (platform staff only)
 * Version number is auto-incremented from the highest existing version
 */
export const createGdprVersion = mutation({
  args: {
    summary: v.string(),
    fullText: v.string(),
    effectiveDate: v.optional(v.number()),
  },
  returns: v.object({
    version: v.number(),
    _id: v.id("gdprVersions"),
  }),
  handler: async (ctx, args) => {
    // Verify platform staff
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Only platform staff can create GDPR versions");
    }

    // Get the highest existing version number
    const allVersions = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .order("desc")
      .first();

    const newVersion = allVersions ? allVersions.version + 1 : 1;
    const now = Date.now();

    // Create the new version
    const id = await ctx.db.insert("gdprVersions", {
      version: newVersion,
      effectiveDate: args.effectiveDate ?? now,
      summary: args.summary,
      fullText: args.fullText,
      createdBy: user._id,
      createdAt: now,
    });

    console.log(
      `[GDPR] Created version ${newVersion} by ${user.email} (effective: ${new Date(args.effectiveDate ?? now).toISOString()})`
    );

    return {
      version: newVersion,
      _id: id,
    };
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Seed initial GDPR version (internal use)
 * Call from Convex dashboard or migration script for initial setup
 */
export const seedInitialGdprVersion = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    version: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    // Check if any versions exist
    const existingVersion = await ctx.db
      .query("gdprVersions")
      .withIndex("by_version")
      .first();

    if (existingVersion) {
      return {
        success: false,
        message: `GDPR version ${existingVersion.version} already exists. Skipping seed.`,
        version: existingVersion.version,
      };
    }

    const now = Date.now();

    // Create initial version with placeholder content
    const fullText = `# Privacy Policy

## 1. Introduction

Welcome to PlayerARC. We are committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, and protect your information in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.

## 2. Data We Collect

We collect and process the following types of personal data:

- **Account Information**: Name, email address, phone number
- **Player Information**: Date of birth, medical information (with consent), performance data
- **Usage Data**: How you interact with our platform
- **Communication Data**: Messages between coaches, parents, and players

## 3. How We Use Your Data

Your data is used to:

- Provide and improve our player development platform
- Enable communication between coaches, parents, and players
- Track player progress and development
- Ensure platform security and prevent abuse

## 4. Data Sharing

We do not sell your personal data. We may share data with:

- Other members of your organization (coaches, admins, parents)
- Service providers who help us operate the platform
- Legal authorities when required by law

## 5. Your Rights Under GDPR

You have the right to:

- **Access**: Request a copy of your personal data
- **Rectification**: Correct inaccurate personal data
- **Erasure**: Request deletion of your personal data
- **Data Portability**: Receive your data in a portable format
- **Object**: Object to certain processing of your data
- **Withdraw Consent**: Withdraw consent at any time

## 6. Data Retention

We retain your data for as long as your account is active or as needed to provide services. Player data may be retained longer for historical records as agreed with your organization.

## 7. Contact Us

For any data protection inquiries, please contact your organization administrator or reach out to our support team.

---

*Last updated: ${new Date(now).toLocaleDateString()}*
*Version 1*`;

    await ctx.db.insert("gdprVersions", {
      version: 1,
      effectiveDate: now,
      summary:
        "Initial privacy policy - data collection, usage, and your GDPR rights",
      fullText,
      createdBy: "system",
      createdAt: now,
    });

    console.log("[GDPR] Seeded initial version 1");

    return {
      success: true,
      message: "Successfully created initial GDPR version 1",
      version: 1,
    };
  },
});
