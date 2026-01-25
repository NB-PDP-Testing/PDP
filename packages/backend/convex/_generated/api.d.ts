/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_coachParentSummaries from "../actions/coachParentSummaries.js";
import type * as actions_guardianNotifications from "../actions/guardianNotifications.js";
import type * as actions_invitations from "../actions/invitations.js";
import type * as actions_messaging from "../actions/messaging.js";
import type * as actions_practicePlans from "../actions/practicePlans.js";
import type * as actions_sendDemoRequestNotification from "../actions/sendDemoRequestNotification.js";
import type * as actions_sessionPlans from "../actions/sessionPlans.js";
import type * as actions_voiceNotes from "../actions/voiceNotes.js";
import type * as actions_whatsapp from "../actions/whatsapp.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_ageGroupUtils from "../lib/ageGroupUtils.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_autoApprovalDecision from "../lib/autoApprovalDecision.js";
import type * as lib_circuitBreaker from "../lib/circuitBreaker.js";
import type * as lib_consentGateway from "../lib/consentGateway.js";
import type * as lib_firstUserSetup from "../lib/firstUserSetup.js";
import type * as lib_trustLevelCalculator from "../lib/trustLevelCalculator.js";
import type * as migrations_cleanSlate from "../migrations/cleanSlate.js";
import type * as migrations_migrateLegacyData from "../migrations/migrateLegacyData.js";
import type * as models_adultPlayers from "../models/adultPlayers.js";
import type * as models_ageGroupEligibilityOverrides from "../models/ageGroupEligibilityOverrides.js";
import type * as models_aiModelConfig from "../models/aiModelConfig.js";
import type * as models_aiServiceHealth from "../models/aiServiceHealth.js";
import type * as models_aiUsageLog from "../models/aiUsageLog.js";
import type * as models_checkUserRoles from "../models/checkUserRoles.js";
import type * as models_cleanupOldData from "../models/cleanupOldData.js";
import type * as models_coachOverrideAnalytics from "../models/coachOverrideAnalytics.js";
import type * as models_coachParentMessages from "../models/coachParentMessages.js";
import type * as models_coachParentSummaries from "../models/coachParentSummaries.js";
import type * as models_coachTasks from "../models/coachTasks.js";
import type * as models_coachTrustLevels from "../models/coachTrustLevels.js";
import type * as models_coaches from "../models/coaches.js";
import type * as models_demoAsks from "../models/demoAsks.js";
import type * as models_diagnosticIdentityCheck from "../models/diagnosticIdentityCheck.js";
import type * as models_emergencyContacts from "../models/emergencyContacts.js";
import type * as models_fixNeilsRoles from "../models/fixNeilsRoles.js";
import type * as models_flows from "../models/flows.js";
import type * as models_guardianIdentities from "../models/guardianIdentities.js";
import type * as models_guardianManagement from "../models/guardianManagement.js";
import type * as models_guardianPlayerLinks from "../models/guardianPlayerLinks.js";
import type * as models_medicalProfiles from "../models/medicalProfiles.js";
import type * as models_members from "../models/members.js";
import type * as models_orgCostBudgets from "../models/orgCostBudgets.js";
import type * as models_orgGuardianProfiles from "../models/orgGuardianProfiles.js";
import type * as models_orgInjuryNotes from "../models/orgInjuryNotes.js";
import type * as models_orgJoinRequests from "../models/orgJoinRequests.js";
import type * as models_orgPlayerEnrollments from "../models/orgPlayerEnrollments.js";
import type * as models_organizationScraper from "../models/organizationScraper.js";
import type * as models_organizations from "../models/organizations.js";
import type * as models_passportComparison from "../models/passportComparison.js";
import type * as models_passportEnquiries from "../models/passportEnquiries.js";
import type * as models_passportGoals from "../models/passportGoals.js";
import type * as models_passportSharing from "../models/passportSharing.js";
import type * as models_platformCostAlerts from "../models/platformCostAlerts.js";
import type * as models_playerEmergencyContacts from "../models/playerEmergencyContacts.js";
import type * as models_playerIdentities from "../models/playerIdentities.js";
import type * as models_playerImport from "../models/playerImport.js";
import type * as models_playerInjuries from "../models/playerInjuries.js";
import type * as models_playerSelfAccess from "../models/playerSelfAccess.js";
import type * as models_players from "../models/players.js";
import type * as models_rateLimits from "../models/rateLimits.js";
import type * as models_referenceData from "../models/referenceData.js";
import type * as models_sessionPlans from "../models/sessionPlans.js";
import type * as models_skillAssessments from "../models/skillAssessments.js";
import type * as models_skillBenchmarks from "../models/skillBenchmarks.js";
import type * as models_sportAgeGroupConfig from "../models/sportAgeGroupConfig.js";
import type * as models_sportPassports from "../models/sportPassports.js";
import type * as models_sports from "../models/sports.js";
import type * as models_teamObservations from "../models/teamObservations.js";
import type * as models_teamPlayerIdentities from "../models/teamPlayerIdentities.js";
import type * as models_teams from "../models/teams.js";
import type * as models_userPreferences from "../models/userPreferences.js";
import type * as models_users from "../models/users.js";
import type * as models_voiceNotes from "../models/voiceNotes.js";
import type * as models_whatsappMessages from "../models/whatsappMessages.js";
import type * as privateData from "../privateData.js";
import type * as scripts_analyzeReimport from "../scripts/analyzeReimport.js";
import type * as scripts_bootstrapPlatformStaff from "../scripts/bootstrapPlatformStaff.js";
import type * as scripts_checkPlayerSport from "../scripts/checkPlayerSport.js";
import type * as scripts_cleanupEnrollmentSport from "../scripts/cleanupEnrollmentSport.js";
import type * as scripts_cleanupUATData from "../scripts/cleanupUATData.js";
import type * as scripts_clearDevData from "../scripts/clearDevData.js";
import type * as scripts_clearPlayerDataKeepUsers from "../scripts/clearPlayerDataKeepUsers.js";
import type * as scripts_debugCoachUser from "../scripts/debugCoachUser.js";
import type * as scripts_debugPlayerData from "../scripts/debugPlayerData.js";
import type * as scripts_deleteAllPlayers from "../scripts/deleteAllPlayers.js";
import type * as scripts_deleteUser from "../scripts/deleteUser.js";
import type * as scripts_findPlayerByName from "../scripts/findPlayerByName.js";
import type * as scripts_fixGAATeamSportCodes from "../scripts/fixGAATeamSportCodes.js";
import type * as scripts_fullReset from "../scripts/fullReset.js";
import type * as scripts_fullResetOptimized from "../scripts/fullResetOptimized.js";
import type * as scripts_getOrgId from "../scripts/getOrgId.js";
import type * as scripts_listUsers from "../scripts/listUsers.js";
import type * as scripts_migrateEnrollmentSport from "../scripts/migrateEnrollmentSport.js";
import type * as scripts_passportSharingDiagnostics from "../scripts/passportSharingDiagnostics.js";
import type * as scripts_previewOrgCleanup from "../scripts/previewOrgCleanup.js";
import type * as scripts_queryExisting from "../scripts/queryExisting.js";
import type * as scripts_seed_helpers_playerStages from "../scripts/seed/helpers/playerStages.js";
import type * as scripts_seed_orchestrator from "../scripts/seed/orchestrator.js";
import type * as scripts_seed_passports from "../scripts/seed/passports.js";
import type * as scripts_seedDefaultSportRules from "../scripts/seedDefaultSportRules.js";
import type * as scripts_seedDemoClub from "../scripts/seedDemoClub.js";
import type * as scripts_seedUATData from "../scripts/seedUATData.js";
import type * as scripts_setCurrentOrg from "../scripts/setCurrentOrg.js";
import type * as scripts_stagedReset from "../scripts/stagedReset.js";
import type * as scripts_updateTeamObservationCoachNames from "../scripts/updateTeamObservationCoachNames.js";
import type * as scripts_validateTeamAssignments from "../scripts/validateTeamAssignments.js";
import type * as scripts_verifyUATSetup from "../scripts/verifyUATSetup.js";
import type * as seed_defaultRateLimits from "../seed/defaultRateLimits.js";
import type * as seed_sessionPlansSeed from "../seed/sessionPlansSeed.js";
import type * as utils_email from "../utils/email.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/coachParentSummaries": typeof actions_coachParentSummaries;
  "actions/guardianNotifications": typeof actions_guardianNotifications;
  "actions/invitations": typeof actions_invitations;
  "actions/messaging": typeof actions_messaging;
  "actions/practicePlans": typeof actions_practicePlans;
  "actions/sendDemoRequestNotification": typeof actions_sendDemoRequestNotification;
  "actions/sessionPlans": typeof actions_sessionPlans;
  "actions/voiceNotes": typeof actions_voiceNotes;
  "actions/whatsapp": typeof actions_whatsapp;
  auth: typeof auth;
  crons: typeof crons;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/ageGroupUtils": typeof lib_ageGroupUtils;
  "lib/analytics": typeof lib_analytics;
  "lib/autoApprovalDecision": typeof lib_autoApprovalDecision;
  "lib/circuitBreaker": typeof lib_circuitBreaker;
  "lib/consentGateway": typeof lib_consentGateway;
  "lib/firstUserSetup": typeof lib_firstUserSetup;
  "lib/trustLevelCalculator": typeof lib_trustLevelCalculator;
  "migrations/cleanSlate": typeof migrations_cleanSlate;
  "migrations/migrateLegacyData": typeof migrations_migrateLegacyData;
  "models/adultPlayers": typeof models_adultPlayers;
  "models/ageGroupEligibilityOverrides": typeof models_ageGroupEligibilityOverrides;
  "models/aiModelConfig": typeof models_aiModelConfig;
  "models/aiServiceHealth": typeof models_aiServiceHealth;
  "models/aiUsageLog": typeof models_aiUsageLog;
  "models/checkUserRoles": typeof models_checkUserRoles;
  "models/cleanupOldData": typeof models_cleanupOldData;
  "models/coachOverrideAnalytics": typeof models_coachOverrideAnalytics;
  "models/coachParentMessages": typeof models_coachParentMessages;
  "models/coachParentSummaries": typeof models_coachParentSummaries;
  "models/coachTasks": typeof models_coachTasks;
  "models/coachTrustLevels": typeof models_coachTrustLevels;
  "models/coaches": typeof models_coaches;
  "models/demoAsks": typeof models_demoAsks;
  "models/diagnosticIdentityCheck": typeof models_diagnosticIdentityCheck;
  "models/emergencyContacts": typeof models_emergencyContacts;
  "models/fixNeilsRoles": typeof models_fixNeilsRoles;
  "models/flows": typeof models_flows;
  "models/guardianIdentities": typeof models_guardianIdentities;
  "models/guardianManagement": typeof models_guardianManagement;
  "models/guardianPlayerLinks": typeof models_guardianPlayerLinks;
  "models/medicalProfiles": typeof models_medicalProfiles;
  "models/members": typeof models_members;
  "models/orgCostBudgets": typeof models_orgCostBudgets;
  "models/orgGuardianProfiles": typeof models_orgGuardianProfiles;
  "models/orgInjuryNotes": typeof models_orgInjuryNotes;
  "models/orgJoinRequests": typeof models_orgJoinRequests;
  "models/orgPlayerEnrollments": typeof models_orgPlayerEnrollments;
  "models/organizationScraper": typeof models_organizationScraper;
  "models/organizations": typeof models_organizations;
  "models/passportComparison": typeof models_passportComparison;
  "models/passportEnquiries": typeof models_passportEnquiries;
  "models/passportGoals": typeof models_passportGoals;
  "models/passportSharing": typeof models_passportSharing;
  "models/platformCostAlerts": typeof models_platformCostAlerts;
  "models/playerEmergencyContacts": typeof models_playerEmergencyContacts;
  "models/playerIdentities": typeof models_playerIdentities;
  "models/playerImport": typeof models_playerImport;
  "models/playerInjuries": typeof models_playerInjuries;
  "models/playerSelfAccess": typeof models_playerSelfAccess;
  "models/players": typeof models_players;
  "models/rateLimits": typeof models_rateLimits;
  "models/referenceData": typeof models_referenceData;
  "models/sessionPlans": typeof models_sessionPlans;
  "models/skillAssessments": typeof models_skillAssessments;
  "models/skillBenchmarks": typeof models_skillBenchmarks;
  "models/sportAgeGroupConfig": typeof models_sportAgeGroupConfig;
  "models/sportPassports": typeof models_sportPassports;
  "models/sports": typeof models_sports;
  "models/teamObservations": typeof models_teamObservations;
  "models/teamPlayerIdentities": typeof models_teamPlayerIdentities;
  "models/teams": typeof models_teams;
  "models/userPreferences": typeof models_userPreferences;
  "models/users": typeof models_users;
  "models/voiceNotes": typeof models_voiceNotes;
  "models/whatsappMessages": typeof models_whatsappMessages;
  privateData: typeof privateData;
  "scripts/analyzeReimport": typeof scripts_analyzeReimport;
  "scripts/bootstrapPlatformStaff": typeof scripts_bootstrapPlatformStaff;
  "scripts/checkPlayerSport": typeof scripts_checkPlayerSport;
  "scripts/cleanupEnrollmentSport": typeof scripts_cleanupEnrollmentSport;
  "scripts/cleanupUATData": typeof scripts_cleanupUATData;
  "scripts/clearDevData": typeof scripts_clearDevData;
  "scripts/clearPlayerDataKeepUsers": typeof scripts_clearPlayerDataKeepUsers;
  "scripts/debugCoachUser": typeof scripts_debugCoachUser;
  "scripts/debugPlayerData": typeof scripts_debugPlayerData;
  "scripts/deleteAllPlayers": typeof scripts_deleteAllPlayers;
  "scripts/deleteUser": typeof scripts_deleteUser;
  "scripts/findPlayerByName": typeof scripts_findPlayerByName;
  "scripts/fixGAATeamSportCodes": typeof scripts_fixGAATeamSportCodes;
  "scripts/fullReset": typeof scripts_fullReset;
  "scripts/fullResetOptimized": typeof scripts_fullResetOptimized;
  "scripts/getOrgId": typeof scripts_getOrgId;
  "scripts/listUsers": typeof scripts_listUsers;
  "scripts/migrateEnrollmentSport": typeof scripts_migrateEnrollmentSport;
  "scripts/passportSharingDiagnostics": typeof scripts_passportSharingDiagnostics;
  "scripts/previewOrgCleanup": typeof scripts_previewOrgCleanup;
  "scripts/queryExisting": typeof scripts_queryExisting;
  "scripts/seed/helpers/playerStages": typeof scripts_seed_helpers_playerStages;
  "scripts/seed/orchestrator": typeof scripts_seed_orchestrator;
  "scripts/seed/passports": typeof scripts_seed_passports;
  "scripts/seedDefaultSportRules": typeof scripts_seedDefaultSportRules;
  "scripts/seedDemoClub": typeof scripts_seedDemoClub;
  "scripts/seedUATData": typeof scripts_seedUATData;
  "scripts/setCurrentOrg": typeof scripts_setCurrentOrg;
  "scripts/stagedReset": typeof scripts_stagedReset;
  "scripts/updateTeamObservationCoachNames": typeof scripts_updateTeamObservationCoachNames;
  "scripts/validateTeamAssignments": typeof scripts_validateTeamAssignments;
  "scripts/verifyUATSetup": typeof scripts_verifyUATSetup;
  "seed/defaultRateLimits": typeof seed_defaultRateLimits;
  "seed/sessionPlansSeed": typeof seed_sessionPlansSeed;
  "utils/email": typeof utils_email;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: {
    adapter: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                data: {
                  createdAt: number;
                  currentOrgId?: string;
                  email: string;
                  emailVerified: boolean;
                  firstName?: string;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  updatedAt: number;
                  userId?: null | string;
                };
                model: "user";
              }
            | {
                data: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt: number;
                  expiresAt: number;
                  ipAddress?: null | string;
                  token: string;
                  updatedAt: number;
                  userAgent?: null | string;
                  userId: string;
                };
                model: "session";
              }
            | {
                data: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId: string;
                  createdAt: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt: number;
                  userId: string;
                };
                model: "account";
              }
            | {
                data: {
                  createdAt: number;
                  expiresAt: number;
                  identifier: string;
                  updatedAt: number;
                  value: string;
                };
                model: "verification";
              }
            | {
                data: {
                  createdAt: number;
                  privateKey: string;
                  publicKey: string;
                };
                model: "jwks";
              }
            | {
                data: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name: string;
                  organizationId: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                model: "team";
              }
            | {
                data: {
                  createdAt?: null | number;
                  teamId: string;
                  userId: string;
                };
                model: "teamMember";
              }
            | {
                data: {
                  colors?: Array<string>;
                  createdAt: number;
                  logo?: null | string;
                  metadata?: null | string;
                  name: string;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  website?: null | string;
                };
                model: "organization";
              }
            | {
                data: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role: string;
                  userId: string;
                };
                model: "member";
              }
            | {
                data: {
                  email: string;
                  expiresAt: number;
                  inviterId: string;
                  metadata?: any;
                  organizationId: string;
                  role?: null | string;
                  status: string;
                  teamId?: null | string;
                };
                model: "invitation";
              };
          onCreateHandle?: string;
          select?: Array<string>;
        },
        any
      >;
      deleteMany: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "currentOrgId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onDeleteHandle?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      deleteOne: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "currentOrgId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onDeleteHandle?: string;
        },
        any
      >;
      findMany: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          model:
            | "user"
            | "session"
            | "account"
            | "verification"
            | "jwks"
            | "team"
            | "teamMember"
            | "organization"
            | "member"
            | "invitation";
          offset?: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          sortBy?: { direction: "asc" | "desc"; field: string };
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any
      >;
      findOne: FunctionReference<
        "query",
        "internal",
        {
          model:
            | "user"
            | "session"
            | "account"
            | "verification"
            | "jwks"
            | "team"
            | "teamMember"
            | "organization"
            | "member"
            | "invitation";
          select?: Array<string>;
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any
      >;
      updateMany: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                update: {
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  updatedAt?: number;
                  userId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "currentOrgId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                update: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt?: number;
                  expiresAt?: number;
                  ipAddress?: null | string;
                  token?: string;
                  updatedAt?: number;
                  userAgent?: null | string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                update: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId?: string;
                  createdAt?: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId?: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt?: number;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                update: {
                  createdAt?: number;
                  expiresAt?: number;
                  identifier?: string;
                  updatedAt?: number;
                  value?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                update: {
                  createdAt?: number;
                  privateKey?: string;
                  publicKey?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                update: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt?: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name?: string;
                  organizationId?: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                update: {
                  createdAt?: null | number;
                  teamId?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                update: {
                  colors?: Array<string>;
                  createdAt?: number;
                  logo?: null | string;
                  metadata?: null | string;
                  name?: string;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug?: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  website?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                update: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt?: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId?: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                update: {
                  email?: string;
                  expiresAt?: number;
                  inviterId?: string;
                  metadata?: any;
                  organizationId?: string;
                  role?: null | string;
                  status?: string;
                  teamId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onUpdateHandle?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      updateOne: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                update: {
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  updatedAt?: number;
                  userId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "currentOrgId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                update: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt?: number;
                  expiresAt?: number;
                  ipAddress?: null | string;
                  token?: string;
                  updatedAt?: number;
                  userAgent?: null | string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                update: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId?: string;
                  createdAt?: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId?: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt?: number;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                update: {
                  createdAt?: number;
                  expiresAt?: number;
                  identifier?: string;
                  updatedAt?: number;
                  value?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                update: {
                  createdAt?: number;
                  privateKey?: string;
                  publicKey?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                update: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt?: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name?: string;
                  organizationId?: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                update: {
                  createdAt?: null | number;
                  teamId?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                update: {
                  colors?: Array<string>;
                  createdAt?: number;
                  logo?: null | string;
                  metadata?: null | string;
                  name?: string;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug?: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  website?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                update: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt?: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId?: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                update: {
                  email?: string;
                  expiresAt?: number;
                  inviterId?: string;
                  metadata?: any;
                  organizationId?: string;
                  role?: null | string;
                  status?: string;
                  teamId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onUpdateHandle?: string;
        },
        any
      >;
    };
    userFunctions: {
      getUserById: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          _creationTime: number;
          _id: string;
          createdAt: number;
          currentOrgId?: string;
          email: string;
          emailVerified: boolean;
          image?: null | string;
          isPlatformStaff?: boolean;
          name: string;
          onboardingComplete?: boolean;
          phone?: string;
          updatedAt: number;
          userId?: null | string;
        }
      >;
      getUserByStringId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      updateOnboardingComplete: FunctionReference<
        "mutation",
        "internal",
        { onboardingComplete: boolean; userId: string },
        null
      >;
      updateUserProfile: FunctionReference<
        "mutation",
        "internal",
        {
          firstName?: string;
          lastName?: string;
          phone?: string;
          userId: string;
        },
        { success: boolean }
      >;
    };
  };
};
