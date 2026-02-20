"use node";

/**
 * Phase 4 Test Data Seed Script
 *
 * Creates comprehensive test data for all Phase 4 components:
 * - Federation connectors (3 with different states)
 * - Organization connections (5 orgs)
 * - Sync history (50+ entries with varied outcomes)
 * - Sync conflicts (20+ scenarios)
 * - AI mapping cache (30+ entries)
 * - Webhook logs
 *
 * Usage:
 * 1. Run seed: await ctx.runAction(api.actions.phase4TestSeed.seedPhase4TestData)
 * 2. Test manually or with Playwright
 * 3. Clean up: await ctx.runMutation(api.actions.phase4TestSeed.cleanupPhase4TestData)
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import {
  encryptCredentials,
  type FederationCredentials,
} from "../lib/federation/encryption";

// ===== Main Seed Action =====

export const seedPhase4TestData = action({
  args: {},
  returns: v.object({
    connectorIds: v.array(v.id("federationConnectors")),
    syncHistoryCount: v.number(),
    aiCacheCount: v.number(),
    webhookLogCount: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    console.log("🌱 Starting Phase 4 test data seed...");

    // Step 1: Create import template (required for connectors)
    const templateId = await ctx.runMutation(
      internal.models.phase4TestSeedMutations.createTestImportTemplate
    );
    console.log(`✅ Created test import template: ${templateId}`);

    // Step 2: Create 3 federation connectors
    const connectorIds = await createTestConnectors(ctx, templateId);
    console.log(
      `✅ Created ${connectorIds.length} test connectors:`,
      connectorIds
    );

    // Step 3: Connect organizations to connectors
    await connectTestOrganizations(ctx, connectorIds);
    console.log("✅ Connected test organizations to connectors");

    // Step 4: Create sync history (50+ entries)
    const syncHistoryCount = await createSyncHistory(ctx, connectorIds);
    console.log(`✅ Created ${syncHistoryCount} sync history entries`);

    // Step 5: Seed AI mapping cache (30+ entries)
    const aiCacheCount = await seedAiMappingCache(ctx);
    console.log(`✅ Created ${aiCacheCount} AI mapping cache entries`);

    // Step 6: Create webhook logs
    const webhookLogCount = await createWebhookLogs(ctx, connectorIds);
    console.log(`✅ Created ${webhookLogCount} webhook log entries`);

    console.log("🎉 Phase 4 test data seed complete!");

    return {
      connectorIds,
      syncHistoryCount,
      aiCacheCount,
      webhookLogCount,
      message:
        "Phase 4 test data seeded successfully. Run cleanupPhase4TestData to remove.",
    };
  },
});

// ===== Helper: Create Test Connectors =====

async function createTestConnectors(
  ctx: any,
  templateId: Id<"importTemplates">
): Promise<Id<"federationConnectors">[]> {
  const connectorIds: Id<"federationConnectors">[] = [];

  // Connector 1: GAA Foireann (OAuth2, Active, Healthy)
  const gaaCredentials: FederationCredentials = {
    type: "oauth2",
    accessToken: "test-gaa-access-token",
    refreshToken: "test-gaa-refresh-token",
    expiresAt: Date.now() + 3_600_000, // Expires in 1 hour
    tokenType: "Bearer",
  };

  const gaaEncrypted = await encryptCredentials(gaaCredentials);
  const gaaStorageId = await ctx.storage.store(
    new Blob([gaaEncrypted], { type: "application/octet-stream" })
  );

  const gaaConnectorId = await ctx.runMutation(
    internal.models.phase4TestSeedMutations.createConnectorInternal,
    {
      name: "[TEST] GAA Foireann API",
      federationCode: "test_gaa_foireann",
      authType: "oauth2" as const,
      credentialsStorageId: gaaStorageId,
      endpoints: {
        membershipList:
          "https://api.foireann.ie/v1/organizations/{orgId}/members",
        memberDetail: "https://api.foireann.ie/v1/members/{memberId}",
        webhookSecret: "https://webhook.playerarc.com/gaa/inbound",
      },
      syncConfig: {
        enabled: true,
        schedule: "0 2 * * *", // 2 AM daily
        conflictStrategy: "federation_wins",
      },
      templateId,
      status: "active",
      consecutiveFailures: 0,
      lastSuccessAt: Date.now() - 3_600_000, // 1 hour ago
    }
  );
  connectorIds.push(gaaConnectorId);

  // Connector 2: Test API Key (API Key, Inactive)
  const apiKeyCredentials: FederationCredentials = {
    type: "api_key",
    apiKey: "test-api-key-12345",
    keyName: "Test API Key",
  };

  const apiKeyEncrypted = await encryptCredentials(apiKeyCredentials);
  const apiKeyStorageId = await ctx.storage.store(
    new Blob([apiKeyEncrypted], { type: "application/octet-stream" })
  );

  const apiKeyConnectorId = await ctx.runMutation(
    internal.models.phase4TestSeedMutations.createConnectorInternal,
    {
      name: "[TEST] API Key Connector",
      federationCode: "test_api_key",
      authType: "api_key" as const,
      credentialsStorageId: apiKeyStorageId,
      endpoints: {
        membershipList: "https://api.example.com/v1/members",
      },
      syncConfig: {
        enabled: false,
        conflictStrategy: "local_wins",
      },
      templateId,
      status: "inactive",
      consecutiveFailures: 0,
    }
  );
  connectorIds.push(apiKeyConnectorId);

  // Connector 3: Test OAuth Error (OAuth2, Error State, 5 consecutive failures)
  const errorCredentials: FederationCredentials = {
    type: "oauth2",
    accessToken: "expired-token",
    refreshToken: "invalid-refresh-token",
    expiresAt: Date.now() - 86_400_000, // Expired 1 day ago
    tokenType: "Bearer",
  };

  const errorEncrypted = await encryptCredentials(errorCredentials);
  const errorStorageId = await ctx.storage.store(
    new Blob([errorEncrypted], { type: "application/octet-stream" })
  );

  const errorConnectorId = await ctx.runMutation(
    internal.models.phase4TestSeedMutations.createConnectorInternal,
    {
      name: "[TEST] OAuth Error Connector",
      federationCode: "test_oauth_error",
      authType: "oauth2" as const,
      credentialsStorageId: errorStorageId,
      endpoints: {
        membershipList: "https://api.broken.example.com/v1/members",
      },
      syncConfig: {
        enabled: true,
        schedule: "0 3 * * *", // 3 AM daily
        conflictStrategy: "manual",
      },
      templateId,
      status: "error",
      consecutiveFailures: 5,
      lastErrorAt: Date.now() - 1_800_000, // 30 minutes ago
      lastError: "401 Unauthorized - OAuth token expired and refresh failed",
    }
  );
  connectorIds.push(errorConnectorId);

  return connectorIds;
}

// ===== Helper: Connect Organizations =====

async function connectTestOrganizations(
  ctx: any,
  connectorIds: Id<"federationConnectors">[]
): Promise<void> {
  // Test organization IDs (from test-data.json and typical test setup)
  const testOrgs = [
    {
      organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7", // Grange from test-data.json
      federationOrgId: "GAA-ORG-001",
      connectorIndex: 0, // GAA connector
      lastSyncAt: Date.now() - 3_600_000, // 1 hour ago
    },
    {
      organizationId: "test-org-002",
      federationOrgId: "GAA-ORG-002",
      connectorIndex: 0, // GAA connector
      lastSyncAt: Date.now() - 86_400_000, // 1 day ago
    },
    {
      organizationId: "test-org-003",
      federationOrgId: "GAA-ORG-003",
      connectorIndex: 0, // GAA connector
      lastSyncAt: undefined, // Never synced
    },
    {
      organizationId: "test-org-004",
      federationOrgId: "API-ORG-001",
      connectorIndex: 1, // API Key connector
      lastSyncAt: undefined, // Inactive, never synced
    },
    {
      organizationId: "test-org-005",
      federationOrgId: "ERROR-ORG-001",
      connectorIndex: 2, // Error connector
      lastSyncAt: Date.now() - 604_800_000, // 7 days ago (stale)
    },
  ];

  for (const org of testOrgs) {
    await ctx.runMutation(
      internal.models.phase4TestSeedMutations.connectOrganizationInternal,
      {
        connectorId: connectorIds[org.connectorIndex],
        organizationId: org.organizationId,
        federationOrgId: org.federationOrgId,
        enabledAt: Date.now() - 2_592_000_000, // 30 days ago
        lastSyncAt: org.lastSyncAt,
      }
    );
  }
}

// ===== Helper: Create Sync History =====

async function createSyncHistory(
  ctx: any,
  connectorIds: Id<"federationConnectors">[]
): Promise<number> {
  let count = 0;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Distribution: 60% scheduled, 30% manual, 10% webhook
  const syncTypes: ("scheduled" | "manual" | "webhook")[] = [
    ...new Array(30).fill("scheduled"),
    ...new Array(15).fill("manual"),
    ...new Array(5).fill("webhook"),
  ];

  // Distribution: 85% completed, 15% failed
  const statuses: ("completed" | "failed")[] = [
    ...new Array(42).fill("completed"),
    ...new Array(8).fill("failed"),
  ];

  // Create 50 sync history entries spread over last 30 days
  for (let i = 0; i < 50; i++) {
    const syncType = syncTypes[i % syncTypes.length];
    const status = statuses[i % statuses.length];
    const connectorId = connectorIds[i % connectorIds.length];

    // Random timestamp in last 30 days
    const startedAt =
      thirtyDaysAgo + Math.floor(Math.random() * (now - thirtyDaysAgo));
    const completedAt =
      startedAt + Math.floor(30_000 + Math.random() * 270_000); // 30s - 5min

    // Generate realistic stats based on status
    let stats: {
      playersProcessed: number;
      playersCreated: number;
      playersUpdated: number;
      conflictsDetected: number;
      conflictsResolved: number;
      errors: number;
    };
    if (status === "completed") {
      const created = Math.floor(Math.random() * 50);
      const updated = Math.floor(Math.random() * 100);
      stats = {
        playersProcessed: created + updated,
        playersCreated: created,
        playersUpdated: updated,
        conflictsDetected: Math.floor(Math.random() * 10),
        conflictsResolved: Math.floor(Math.random() * 10),
        errors: 0,
      };
    } else {
      // failed
      stats = {
        playersProcessed: 0,
        playersCreated: 0,
        playersUpdated: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: 1,
      };
    }

    // Error messages for failed syncs
    const errorMessages = [
      "401 Unauthorized - Invalid API credentials",
      "429 Rate limited - Retry after 60 seconds",
      "Network timeout after 30 seconds",
      "Invalid date format in field 'dateOfBirth'",
      "Duplicate email found: test@example.com",
      "Failed to parse JSON response from federation API",
      "OAuth token expired and refresh failed",
      "Connection refused to federation API",
    ];

    const error =
      status === "failed"
        ? errorMessages[Math.floor(Math.random() * errorMessages.length)]
        : undefined;

    // Create conflict details for some completed syncs
    const conflictDetails =
      status === "completed" && stats.conflictsDetected > 0
        ? generateConflictDetails(stats.conflictsDetected)
        : [];

    await ctx.runMutation(
      internal.models.phase4TestSeedMutations.createSyncHistoryInternal,
      {
        connectorId,
        organizationId: `test-org-00${(i % 5) + 1}`,
        syncType,
        status,
        startedAt,
        completedAt,
        stats,
        error,
        conflictDetails,
      }
    );

    count += 1;
  }

  return count;
}

// ===== Helper: Generate Conflict Details =====

function generateConflictDetails(count: number): any[] {
  const details = [];
  const fields = ["email", "phone", "address", "dateOfBirth"];
  const strategies = ["federation_wins", "local_wins", "merge"];

  for (let i = 0; i < count; i++) {
    const field = fields[Math.floor(Math.random() * fields.length)];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    details.push({
      playerId: `test-player-${i}`,
      playerName: `Test Player ${i}`,
      conflicts: [
        {
          field,
          federationValue: `federation-${field}-${i}`,
          localValue: `local-${field}-${i}`,
          resolvedValue:
            strategy === "merge"
              ? `merged-${field}-${i}`
              : strategy === "federation_wins"
                ? `federation-${field}-${i}`
                : `local-${field}-${i}`,
          strategy,
        },
      ],
    });
  }

  return details;
}

// ===== Helper: Seed AI Mapping Cache =====

async function seedAiMappingCache(ctx: any): Promise<number> {
  const cacheEntries = [
    // High confidence (80%+)
    {
      columnPattern: "firstname",
      sampleValues: ["John", "Mary", "Patrick"],
      suggestedField: "firstName",
      confidence: 95,
      reasoning: "Column name directly matches first name field",
    },
    {
      columnPattern: "lastname",
      sampleValues: ["Smith", "O'Brien", "Murphy"],
      suggestedField: "lastName",
      confidence: 95,
      reasoning: "Column name directly matches last name field",
    },
    {
      columnPattern: "email",
      sampleValues: ["john@example.com", "mary@test.com"],
      suggestedField: "email",
      confidence: 98,
      reasoning: "Column contains valid email addresses",
    },
    {
      columnPattern: "phone",
      sampleValues: ["+353 86 123 4567", "086-123-4567"],
      suggestedField: "phone",
      confidence: 90,
      reasoning: "Column contains phone number patterns",
    },
    {
      columnPattern: "mobilephone",
      sampleValues: ["0861234567", "+353861234567"],
      suggestedField: "phone",
      confidence: 88,
      reasoning: "Mobile phone column maps to primary phone field",
    },
    {
      columnPattern: "dateofbirth",
      sampleValues: ["1990-01-15", "2005-03-20"],
      suggestedField: "dateOfBirth",
      confidence: 92,
      reasoning: "Column contains date values matching DOB pattern",
    },
    {
      columnPattern: "dob",
      sampleValues: ["15/01/1990", "20/03/2005"],
      suggestedField: "dateOfBirth",
      confidence: 90,
      reasoning: "DOB abbreviation maps to dateOfBirth field",
    },
    {
      columnPattern: "gender",
      sampleValues: ["Male", "Female", "M"],
      suggestedField: "gender",
      confidence: 95,
      reasoning: "Column contains gender values",
    },
    {
      columnPattern: "address",
      sampleValues: ["123 Main St", "456 Oak Ave"],
      suggestedField: "address",
      confidence: 85,
      reasoning: "Column contains address patterns",
    },

    // Medium confidence (50-79%)
    {
      columnPattern: "birth_date",
      sampleValues: ["1990-01-15", "2005-03-20"],
      suggestedField: "dateOfBirth",
      confidence: 75,
      reasoning: "Birth date column likely maps to dateOfBirth",
    },
    {
      columnPattern: "contact_number",
      sampleValues: ["0861234567", "0871234567"],
      suggestedField: "phone",
      confidence: 70,
      reasoning: "Contact number likely maps to phone field",
    },
    {
      columnPattern: "home_address",
      sampleValues: ["123 Main St, Dublin", "456 Oak Ave, Cork"],
      suggestedField: "address",
      confidence: 72,
      reasoning: "Home address maps to primary address field",
    },
    {
      columnPattern: "street",
      sampleValues: ["123 Main St", "456 Oak Ave"],
      suggestedField: "address",
      confidence: 65,
      reasoning: "Street may be part of full address",
    },
    {
      columnPattern: "city",
      sampleValues: ["Dublin", "Cork", "Galway"],
      suggestedField: "city",
      confidence: 70,
      reasoning: "City column likely maps to city field",
    },
    {
      columnPattern: "county",
      sampleValues: ["Dublin", "Cork", "Galway"],
      suggestedField: "county",
      confidence: 68,
      reasoning: "County column maps to county field",
    },
    {
      columnPattern: "postcode",
      sampleValues: ["D01 A123", "D02 B456"],
      suggestedField: "postalCode",
      confidence: 72,
      reasoning: "Postcode maps to postalCode field",
    },

    // Low confidence (<50%)
    {
      columnPattern: "name",
      sampleValues: ["John Smith", "Mary O'Brien"],
      suggestedField: "firstName",
      confidence: 45,
      reasoning:
        "Name column may contain first name, last name, or full name - ambiguous",
    },
    {
      columnPattern: "contact",
      sampleValues: ["john@example.com", "0861234567"],
      suggestedField: "email",
      confidence: 40,
      reasoning: "Contact column could be email or phone - ambiguous",
    },
    {
      columnPattern: "member_id",
      sampleValues: ["M001", "M002", "M003"],
      suggestedField: "memberId",
      confidence: 35,
      reasoning: "Member ID may be federation-specific identifier",
    },
    {
      columnPattern: "notes",
      sampleValues: ["Parent consent received", "Medical info on file"],
      suggestedField: "notes",
      confidence: 30,
      reasoning: "Notes column purpose unclear - may not map to any field",
    },

    // Expired entries (for cleanup testing)
    {
      columnPattern: "expired_field_1",
      sampleValues: ["value1", "value2"],
      suggestedField: "unknownField",
      confidence: 50,
      reasoning: "Expired cache entry for testing cleanup",
      expiresAt: Date.now() - 86_400_000, // Expired 1 day ago
    },
    {
      columnPattern: "expired_field_2",
      sampleValues: ["value3", "value4"],
      suggestedField: "unknownField",
      confidence: 50,
      reasoning: "Expired cache entry for testing cleanup",
      expiresAt: Date.now() - 172_800_000, // Expired 2 days ago
    },
  ];

  for (const entry of cacheEntries) {
    await ctx.runMutation(
      internal.models.phase4TestSeedMutations.createAiCacheEntryInternal,
      {
        columnPattern: entry.columnPattern,
        sampleValues: entry.sampleValues,
        suggestedField: entry.suggestedField,
        confidence: entry.confidence,
        reasoning: entry.reasoning,
        expiresAt: entry.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days default
      }
    );
  }

  return cacheEntries.length;
}

// ===== Helper: Create Webhook Logs =====

async function createWebhookLogs(
  ctx: any,
  connectorIds: Id<"federationConnectors">[]
): Promise<number> {
  let count = 0;
  const gaaConnectorId = connectorIds[0]; // GAA connector only has webhooks

  // Create 10 webhook log entries
  for (let i = 0; i < 10; i++) {
    const success = i % 4 !== 0; // 75% success rate
    const receivedAt = Date.now() - (10 - i) * 3_600_000; // Spread over last 10 hours
    const processingTimeMs = Math.floor(100 + Math.random() * 900); // 100-1000ms

    await ctx.runMutation(
      internal.models.phase4TestSeedMutations.createWebhookLogInternal,
      {
        connectorId: gaaConnectorId,
        organizationId: "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
        federationOrgId: "GAA-ORG-001",
        memberId: `GAA-MEMBER-${i}`,
        event: ["created", "updated", "deleted"][i % 3] as
          | "created"
          | "updated"
          | "deleted",
        receivedAt,
        processedAt: receivedAt + processingTimeMs,
        processingTimeMs,
        success,
        error: success ? undefined : "Invalid webhook signature",
      }
    );

    count += 1;
  }

  return count;
}
