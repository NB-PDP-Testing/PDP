/**
 * GDPR Article 17 — Data Category Configuration
 *
 * This is a plain TypeScript constant (not a Convex function).
 * It is imported by backend mutations and potentially by the frontend
 * to display category information in the erasure request UI.
 *
 * canErase: true  = admin can approve erasure for this category
 * canErase: false = retention is legally mandated; admin cannot approve erasure
 * erasureMethod: 'anonymise' = do not delete the record, replace PII fields
 * erasureMethod: 'soft_delete' = set retentionExpired: true on individual records
 */

export type ErasureCategory =
  | "WELLNESS_DATA"
  | "ASSESSMENT_HISTORY"
  | "INJURY_RECORDS"
  | "COACH_FEEDBACK"
  | "PROFILE_DATA"
  | "COMMUNICATION_DATA"
  | "AUDIT_LOGS"
  | "CHILD_AUTH_LOGS";

export type CategoryDecision = "approved" | "rejected";

export interface DataCategoryEntry {
  label: string;
  description: string;
  canErase: boolean;
  erasureMethod: "anonymise" | "soft_delete" | "none";
  retentionGrounds?: string; // Article 17(3) exception text — shown to admin and player
  defaultRetentionDays: number | null;
  minRetentionDays?: number; // Legal minimum — UI blocks setting below this
  tableNames: string[];
  playerIdField: string;
}

export const DATA_CATEGORY_CONFIG: Record<ErasureCategory, DataCategoryEntry> =
  {
    WELLNESS_DATA: {
      label: "Wellness check-ins",
      description:
        "Daily health check-in data including sleep, energy, mood, physical feeling, and motivation ratings.",
      canErase: true,
      erasureMethod: "soft_delete",
      defaultRetentionDays: 730,
      tableNames: ["dailyPlayerHealthChecks"],
      playerIdField: "playerIdentityId",
    },

    ASSESSMENT_HISTORY: {
      label: "Assessment & passport history",
      description:
        "Player assessment records, skill evaluations, and sport passport data.",
      canErase: true,
      erasureMethod: "soft_delete",
      defaultRetentionDays: 1825,
      tableNames: ["orgPlayerEnrollments"], // assessments are scoped to enrollments
      playerIdField: "playerIdentityId",
    },

    INJURY_RECORDS: {
      label: "Injury records",
      description:
        "Records of injuries, medical incidents, and treatment history.",
      canErase: false,
      erasureMethod: "none",
      retentionGrounds:
        "Healthcare records — Ireland HSE 7-year retention standard (applicable where a medical professional was involved). GDPR Article 17(3)(c) — retention necessary for public health purposes under Union or Member State law.",
      defaultRetentionDays: 2555,
      minRetentionDays: 2555,
      tableNames: ["injuryReports"],
      playerIdField: "playerIdentityId",
    },

    COACH_FEEDBACK: {
      label: "Coach feedback & notes",
      description:
        "Coach notes, feedback records, and player development observations.",
      canErase: true,
      erasureMethod: "soft_delete",
      defaultRetentionDays: 1825,
      tableNames: ["coachPlayerFeedback"],
      playerIdField: "playerIdentityId",
    },

    PROFILE_DATA: {
      label: "Player profile",
      description:
        "Name, contact details, date of birth, and emergency contact information.",
      canErase: true,
      erasureMethod: "anonymise",
      defaultRetentionDays: null,
      tableNames: ["orgPlayerEnrollments"],
      playerIdField: "playerIdentityId",
    },

    COMMUNICATION_DATA: {
      label: "WhatsApp & SMS communications",
      description:
        "WhatsApp messages, SMS sessions, and wellness channel communication records.",
      canErase: true,
      erasureMethod: "soft_delete",
      defaultRetentionDays: 365,
      tableNames: ["whatsappMessages", "whatsappWellnessSessions"],
      playerIdField: "playerIdentityId",
    },

    AUDIT_LOGS: {
      label: "Activity & access logs",
      description:
        "System audit trail of data access and processing activities.",
      canErase: false,
      erasureMethod: "none",
      retentionGrounds:
        "GDPR Article 30 Records of Processing Activities — legal obligation of the controller to maintain records of processing. These records cannot be erased as they document the lawful basis for processing and demonstrate GDPR compliance.",
      defaultRetentionDays: 1095,
      minRetentionDays: 1095,
      tableNames: [],
      playerIdField: "playerIdentityId",
    },

    CHILD_AUTH_LOGS: {
      label: "Child safeguarding records",
      description:
        "Records of parental authorisation and child data access decisions.",
      canErase: false,
      erasureMethod: "none",
      retentionGrounds:
        "Child safeguarding records — Ireland Children First Act 2015 and Tusla guidelines require 7-year retention of all child protection and welfare records. These records cannot be erased regardless of the data subject's request.",
      defaultRetentionDays: 2555,
      minRetentionDays: 2555,
      tableNames: ["parentChildAuthorizationLogs"],
      playerIdField: "childPlayerId",
    },
  };

export const ERASURE_CATEGORY_KEYS = Object.keys(
  DATA_CATEGORY_CONFIG
) as ErasureCategory[];
