import { v } from "convex/values";
import { components } from "../_generated/api";
import { action, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// INJURY DOCUMENTS - Phase 2 Issue #261
// Medical document upload and management for injury tracking
// ============================================================

/**
 * Document type validator
 */
const documentTypeValidator = v.union(
  v.literal("medical_report"),
  v.literal("clearance_form"),
  v.literal("xray_scan"),
  v.literal("therapy_notes"),
  v.literal("insurance_form"),
  v.literal("other")
);

/**
 * Uploader role validator
 */
const uploaderRoleValidator = v.union(
  v.literal("guardian"),
  v.literal("coach"),
  v.literal("admin")
);

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save document metadata after file upload
 */
export const saveDocument = mutation({
  args: {
    injuryId: v.id("playerInjuries"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    documentType: documentTypeValidator,
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    uploadedBy: v.string(),
    uploadedByName: v.string(),
    uploadedByRole: uploaderRoleValidator,
  },
  returns: v.id("injuryDocuments"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify injury exists
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      throw new Error("Injury not found");
    }

    // Create document record
    const documentId = await ctx.db.insert("injuryDocuments", {
      injuryId: args.injuryId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      documentType: args.documentType,
      description: args.description,
      isPrivate: args.isPrivate,
      uploadedBy: args.uploadedBy,
      uploadedByName: args.uploadedByName,
      uploadedByRole: args.uploadedByRole,
      createdAt: Date.now(),
    });

    // Log progress update
    await ctx.db.insert("injuryProgressUpdates", {
      injuryId: args.injuryId,
      updatedBy: args.uploadedBy,
      updatedByName: args.uploadedByName,
      updatedByRole: args.uploadedByRole,
      updateType: "document_uploaded",
      notes: `Uploaded ${args.documentType.replace("_", " ")}: ${args.fileName}`,
      documentId,
      createdAt: Date.now(),
    });

    // Update injury's updatedAt
    await ctx.db.patch(args.injuryId, {
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

/**
 * Get documents for an injury
 * Filters private documents based on user access
 */
export const getDocuments = query({
  args: {
    injuryId: v.id("playerInjuries"),
    userId: v.string(), // Current user ID for access control
  },
  returns: v.array(
    v.object({
      _id: v.id("injuryDocuments"),
      _creationTime: v.number(),
      injuryId: v.id("playerInjuries"),
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
      documentType: v.string(),
      description: v.optional(v.string()),
      isPrivate: v.boolean(),
      uploadedBy: v.string(),
      uploadedByName: v.string(),
      uploadedByRole: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const documents = await ctx.db
      .query("injuryDocuments")
      .withIndex("by_injury", (q) => q.eq("injuryId", args.injuryId))
      .collect();

    // Filter out private documents not uploaded by the current user
    // Use authenticated user ID for access control
    const effectiveUserId = user._id;
    return documents.filter((doc) => {
      if (!doc.isPrivate) {
        return true;
      }
      return doc.uploadedBy === effectiveUserId;
    });
  },
});

/**
 * Get all documents for an injury (admin view - includes private)
 */
export const getDocumentsAdmin = query({
  args: {
    injuryId: v.id("playerInjuries"),
  },
  returns: v.array(
    v.object({
      _id: v.id("injuryDocuments"),
      _creationTime: v.number(),
      injuryId: v.id("playerInjuries"),
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
      documentType: v.string(),
      description: v.optional(v.string()),
      isPrivate: v.boolean(),
      uploadedBy: v.string(),
      uploadedByName: v.string(),
      uploadedByRole: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify the injury exists and check admin access (SEC-HIGH-002)
    const injury = await ctx.db.get(args.injuryId);
    if (!injury) {
      return [];
    }

    if (injury.occurredAtOrgId) {
      // Check user is an admin or owner of the org
      const memberResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "userId", value: user._id, operator: "eq" },
            {
              field: "organizationId",
              value: injury.occurredAtOrgId,
              operator: "eq",
              connector: "AND",
            },
          ],
        }
      );
      const member = memberResult as {
        role?: string;
        functionalRoles?: string[];
      } | null;
      const isAdmin =
        member?.role === "admin" ||
        member?.role === "owner" ||
        (Array.isArray(member?.functionalRoles) &&
          member.functionalRoles.includes("admin"));
      if (!isAdmin) {
        throw new Error(
          "Not authorized: admin role required to access all documents"
        );
      }
    }

    return await ctx.db
      .query("injuryDocuments")
      .withIndex("by_injury", (q) => q.eq("injuryId", args.injuryId))
      .collect();
  },
});

/**
 * Get download URL for a document
 */
export const getDownloadUrl = query({
  args: {
    documentId: v.id("injuryDocuments"),
    userId: v.string(), // For access control
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return null;
    }

    // Check access for private documents using authenticated user ID
    if (document.isPrivate && document.uploadedBy !== user._id) {
      return null;
    }

    return await ctx.storage.getUrl(document.storageId);
  },
});

/**
 * Delete a document
 */
export const deleteDocument = mutation({
  args: {
    documentId: v.id("injuryDocuments"),
    userId: v.string(), // For authorization
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only uploader can delete their own documents (use authenticated user ID)
    if (document.uploadedBy !== user._id) {
      throw new Error("Not authorized to delete this document");
    }

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete document record
    await ctx.db.delete(args.documentId);

    // Update injury's updatedAt
    await ctx.db.patch(document.injuryId, {
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update document privacy setting
 */
export const updateDocumentPrivacy = mutation({
  args: {
    documentId: v.id("injuryDocuments"),
    isPrivate: v.boolean(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only uploader can change privacy (use authenticated user ID)
    if (document.uploadedBy !== user._id) {
      throw new Error("Not authorized to modify this document");
    }

    await ctx.db.patch(args.documentId, {
      isPrivate: args.isPrivate,
    });

    return null;
  },
});

/**
 * Get document count by type for an injury
 */
export const getDocumentCounts = query({
  args: {
    injuryId: v.id("playerInjuries"),
  },
  returns: v.object({
    total: v.number(),
    medical_report: v.number(),
    clearance_form: v.number(),
    xray_scan: v.number(),
    therapy_notes: v.number(),
    insurance_form: v.number(),
    other: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const documents = await ctx.db
      .query("injuryDocuments")
      .withIndex("by_injury", (q) => q.eq("injuryId", args.injuryId))
      .collect();

    const counts = {
      total: documents.length,
      medical_report: 0,
      clearance_form: 0,
      xray_scan: 0,
      therapy_notes: 0,
      insurance_form: 0,
      other: 0,
    };

    for (const doc of documents) {
      const docType = doc.documentType as keyof typeof counts;
      if (docType in counts && docType !== "total") {
        counts[docType] += 1;
      }
    }

    return counts;
  },
});
