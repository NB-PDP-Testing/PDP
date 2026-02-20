/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_aiMapping from "../actions/aiMapping.js";
import type * as actions_claimsExtraction from "../actions/claimsExtraction.js";
import type * as actions_coachParentSummaries from "../actions/coachParentSummaries.js";
import type * as actions_draftGeneration from "../actions/draftGeneration.js";
import type * as actions_entityResolution from "../actions/entityResolution.js";
import type * as actions_federationAuth from "../actions/federationAuth.js";
import type * as actions_federationScheduler from "../actions/federationScheduler.js";
import type * as actions_federationSyncEngine from "../actions/federationSyncEngine.js";
import type * as actions_federationWebhook from "../actions/federationWebhook.js";
import type * as actions_gaaFoireann from "../actions/gaaFoireann.js";
import type * as actions_gaaSync from "../actions/gaaSync.js";
import type * as actions_guardianNotifications from "../actions/guardianNotifications.js";
import type * as actions_invitations from "../actions/invitations.js";
import type * as actions_messaging from "../actions/messaging.js";
import type * as actions_migration from "../actions/migration.js";
import type * as actions_phase4TestSeed from "../actions/phase4TestSeed.js";
import type * as actions_platformStaffInvitations from "../actions/platformStaffInvitations.js";
import type * as actions_practicePlans from "../actions/practicePlans.js";
import type * as actions_sendDemoRequestNotification from "../actions/sendDemoRequestNotification.js";
import type * as actions_sessionPlans from "../actions/sessionPlans.js";
import type * as actions_syncQueueProcessor from "../actions/syncQueueProcessor.js";
import type * as actions_teamInsights from "../actions/teamInsights.js";
import type * as actions_voiceNotes from "../actions/voiceNotes.js";
import type * as actions_whatsapp from "../actions/whatsapp.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as jobs_graduations from "../jobs/graduations.js";
import type * as jobs_invitations from "../jobs/invitations.js";
import type * as lib_ageGroupUtils from "../lib/ageGroupUtils.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_auditCoachAssignments from "../lib/auditCoachAssignments.js";
import type * as lib_autoApprovalDecision from "../lib/autoApprovalDecision.js";
import type * as lib_circuitBreaker from "../lib/circuitBreaker.js";
import type * as lib_coachContext from "../lib/coachContext.js";
import type * as lib_consentGateway from "../lib/consentGateway.js";
import type * as lib_duplicateDetection from "../lib/duplicateDetection.js";
import type * as lib_featureFlags from "../lib/featureFlags.js";
import type * as lib_federation_apiClient from "../lib/federation/apiClient.js";
import type * as lib_federation_backoff from "../lib/federation/backoff.js";
import type * as lib_federation_changeDetector from "../lib/federation/changeDetector.js";
import type * as lib_federation_encryption from "../lib/federation/encryption.js";
import type * as lib_federation_gaaMapper from "../lib/federation/gaaMapper.js";
import type * as lib_federation_gaaTestData from "../lib/federation/gaaTestData.js";
import type * as lib_feedbackMessages from "../lib/feedbackMessages.js";
import type * as lib_firstUserSetup from "../lib/firstUserSetup.js";
import type * as lib_import_aiMapper from "../lib/import/aiMapper.js";
import type * as lib_import_benchmarkApplicator from "../lib/import/benchmarkApplicator.js";
import type * as lib_import_dataQuality from "../lib/import/dataQuality.js";
import type * as lib_import_deduplicator from "../lib/import/deduplicator.js";
import type * as lib_import_mapper from "../lib/import/mapper.js";
import type * as lib_import_parser from "../lib/import/parser.js";
import type * as lib_import_simulator from "../lib/import/simulator.js";
import type * as lib_import_sportConfig from "../lib/import/sportConfig.js";
import type * as lib_import_validator from "../lib/import/validator.js";
import type * as lib_injuryNotifications from "../lib/injuryNotifications.js";
import type * as lib_matching_guardianMatcher from "../lib/matching/guardianMatcher.js";
import type * as lib_messageValidation from "../lib/messageValidation.js";
import type * as lib_phoneUtils from "../lib/phoneUtils.js";
import type * as lib_playerMatching from "../lib/playerMatching.js";
import type * as lib_stringMatching from "../lib/stringMatching.js";
import type * as lib_trustLevelCalculator from "../lib/trustLevelCalculator.js";
import type * as lib_whatsappCommandHandler from "../lib/whatsappCommandHandler.js";
import type * as lib_whatsappCommands from "../lib/whatsappCommands.js";
import type * as migrations_cleanSlate from "../migrations/cleanSlate.js";
import type * as migrations_compareIrishDancing from "../migrations/compareIrishDancing.js";
import type * as migrations_deleteOldIrishDancingSport from "../migrations/deleteOldIrishDancingSport.js";
import type * as migrations_extractInsightsToTable from "../migrations/extractInsightsToTable.js";
import type * as migrations_importBenchmarksCLI from "../migrations/importBenchmarksCLI.js";
import type * as migrations_importGAAFootballBenchmarks from "../migrations/importGAAFootballBenchmarks.js";
import type * as migrations_importGAAFootballLevelDescriptors from "../migrations/importGAAFootballLevelDescriptors.js";
import type * as migrations_importIrishDancingBenchmarks from "../migrations/importIrishDancingBenchmarks.js";
import type * as migrations_importIrishDancingGradeBenchmarks from "../migrations/importIrishDancingGradeBenchmarks.js";
import type * as migrations_importIrishDancingLevelDescriptors from "../migrations/importIrishDancingLevelDescriptors.js";
import type * as migrations_importRugbyBenchmarks from "../migrations/importRugbyBenchmarks.js";
import type * as migrations_importRugbyLevelDescriptors from "../migrations/importRugbyLevelDescriptors.js";
import type * as migrations_importSoccerBenchmarks from "../migrations/importSoccerBenchmarks.js";
import type * as migrations_importSoccerLevelDescriptors from "../migrations/importSoccerLevelDescriptors.js";
import type * as migrations_importStrengthBenchmarks from "../migrations/importStrengthBenchmarks.js";
import type * as migrations_migrateLegacyData from "../migrations/migrateLegacyData.js";
import type * as migrations_setupIrishDancing from "../migrations/setupIrishDancing.js";
import type * as models_adultPlayers from "../models/adultPlayers.js";
import type * as models_ageGroupEligibilityOverrides from "../models/ageGroupEligibilityOverrides.js";
import type * as models_aiCopilot from "../models/aiCopilot.js";
import type * as models_aiMappingAnalytics from "../models/aiMappingAnalytics.js";
import type * as models_aiMappingCache from "../models/aiMappingCache.js";
import type * as models_aiModelConfig from "../models/aiModelConfig.js";
import type * as models_aiServiceHealth from "../models/aiServiceHealth.js";
import type * as models_aiUsageLog from "../models/aiUsageLog.js";
import type * as models_checkUserRoles from "../models/checkUserRoles.js";
import type * as models_cleanupOldData from "../models/cleanupOldData.js";
import type * as models_coachOverrideAnalytics from "../models/coachOverrideAnalytics.js";
import type * as models_coachParentMessages from "../models/coachParentMessages.js";
import type * as models_coachParentSummaries from "../models/coachParentSummaries.js";
import type * as models_coachPlayerAliases from "../models/coachPlayerAliases.js";
import type * as models_coachTasks from "../models/coachTasks.js";
import type * as models_coachTrustLevels from "../models/coachTrustLevels.js";
import type * as models_coaches from "../models/coaches.js";
import type * as models_demoAsks from "../models/demoAsks.js";
import type * as models_diagnosticIdentityCheck from "../models/diagnosticIdentityCheck.js";
import type * as models_emergencyContacts from "../models/emergencyContacts.js";
import type * as models_federationConnectors from "../models/federationConnectors.js";
import type * as models_fixNeilsRoles from "../models/fixNeilsRoles.js";
import type * as models_flows from "../models/flows.js";
import type * as models_gaaTestMutations from "../models/gaaTestMutations.js";
import type * as models_gdpr from "../models/gdpr.js";
import type * as models_guardianIdentities from "../models/guardianIdentities.js";
import type * as models_guardianManagement from "../models/guardianManagement.js";
import type * as models_guardianPlayerLinks from "../models/guardianPlayerLinks.js";
import type * as models_importAnalytics from "../models/importAnalytics.js";
import type * as models_importMappingHistory from "../models/importMappingHistory.js";
import type * as models_importProgress from "../models/importProgress.js";
import type * as models_importSessionDrafts from "../models/importSessionDrafts.js";
import type * as models_importSessions from "../models/importSessions.js";
import type * as models_importSimulation from "../models/importSimulation.js";
import type * as models_importTemplateSeeds from "../models/importTemplateSeeds.js";
import type * as models_importTemplates from "../models/importTemplates.js";
import type * as models_injuryDocuments from "../models/injuryDocuments.js";
import type * as models_insightDrafts from "../models/insightDrafts.js";
import type * as models_invitations from "../models/invitations.js";
import type * as models_medicalProfiles from "../models/medicalProfiles.js";
import type * as models_members from "../models/members.js";
import type * as models_notificationPreferences from "../models/notificationPreferences.js";
import type * as models_notifications from "../models/notifications.js";
import type * as models_onboarding from "../models/onboarding.js";
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
import type * as models_phase4TestCleanup from "../models/phase4TestCleanup.js";
import type * as models_phase4TestSeedMutations from "../models/phase4TestSeedMutations.js";
import type * as models_platformCostAlerts from "../models/platformCostAlerts.js";
import type * as models_platformMessagingSettings from "../models/platformMessagingSettings.js";
import type * as models_platformStaffInvitations from "../models/platformStaffInvitations.js";
import type * as models_playerEmergencyContacts from "../models/playerEmergencyContacts.js";
import type * as models_playerGraduations from "../models/playerGraduations.js";
import type * as models_playerIdentities from "../models/playerIdentities.js";
import type * as models_playerImport from "../models/playerImport.js";
import type * as models_playerInjuries from "../models/playerInjuries.js";
import type * as models_playerSelfAccess from "../models/playerSelfAccess.js";
import type * as models_players from "../models/players.js";
import type * as models_rateLimits from "../models/rateLimits.js";
import type * as models_referenceData from "../models/referenceData.js";
import type * as models_reviewAnalytics from "../models/reviewAnalytics.js";
import type * as models_sessionPlans from "../models/sessionPlans.js";
import type * as models_setup from "../models/setup.js";
import type * as models_skillAssessments from "../models/skillAssessments.js";
import type * as models_skillBenchmarks from "../models/skillBenchmarks.js";
import type * as models_sportAgeGroupConfig from "../models/sportAgeGroupConfig.js";
import type * as models_sportPassports from "../models/sportPassports.js";
import type * as models_sports from "../models/sports.js";
import type * as models_syncHistory from "../models/syncHistory.js";
import type * as models_syncQueue from "../models/syncQueue.js";
import type * as models_teamCollaboration from "../models/teamCollaboration.js";
import type * as models_teamDecisions from "../models/teamDecisions.js";
import type * as models_teamObservations from "../models/teamObservations.js";
import type * as models_teamPlayerIdentities from "../models/teamPlayerIdentities.js";
import type * as models_teams from "../models/teams.js";
import type * as models_trustGatePermissions from "../models/trustGatePermissions.js";
import type * as models_userPreferences from "../models/userPreferences.js";
import type * as models_userProfiles from "../models/userProfiles.js";
import type * as models_users from "../models/users.js";
import type * as models_voiceNoteArtifacts from "../models/voiceNoteArtifacts.js";
import type * as models_voiceNoteClaims from "../models/voiceNoteClaims.js";
import type * as models_voiceNoteEntityResolutions from "../models/voiceNoteEntityResolutions.js";
import type * as models_voiceNoteInsights from "../models/voiceNoteInsights.js";
import type * as models_voiceNoteTranscripts from "../models/voiceNoteTranscripts.js";
import type * as models_voiceNotes from "../models/voiceNotes.js";
import type * as models_voicePipelineAlerts from "../models/voicePipelineAlerts.js";
import type * as models_voicePipelineEvents from "../models/voicePipelineEvents.js";
import type * as models_voicePipelineMetrics from "../models/voicePipelineMetrics.js";
import type * as models_voicePipelineRetry from "../models/voicePipelineRetry.js";
import type * as models_whatsappMessages from "../models/whatsappMessages.js";
import type * as models_whatsappReviewLinks from "../models/whatsappReviewLinks.js";
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
import type * as scripts_disableV2ForOrg from "../scripts/disableV2ForOrg.js";
import type * as scripts_enableV2ForOrg from "../scripts/enableV2ForOrg.js";
import type * as scripts_findPlayerByName from "../scripts/findPlayerByName.js";
import type * as scripts_fixBrokenPhoneNumbers from "../scripts/fixBrokenPhoneNumbers.js";
import type * as scripts_fixGAATeamSportCodes from "../scripts/fixGAATeamSportCodes.js";
import type * as scripts_fullReset from "../scripts/fullReset.js";
import type * as scripts_fullResetOptimized from "../scripts/fullResetOptimized.js";
import type * as scripts_getOrgId from "../scripts/getOrgId.js";
import type * as scripts_listUsers from "../scripts/listUsers.js";
import type * as scripts_migrateEnrollmentSport from "../scripts/migrateEnrollmentSport.js";
import type * as scripts_passportSharingDiagnostics from "../scripts/passportSharingDiagnostics.js";
import type * as scripts_previewOrgCleanup from "../scripts/previewOrgCleanup.js";
import type * as scripts_queryExisting from "../scripts/queryExisting.js";
import type * as scripts_runMigration from "../scripts/runMigration.js";
import type * as scripts_seed_helpers_playerStages from "../scripts/seed/helpers/playerStages.js";
import type * as scripts_seed_orchestrator from "../scripts/seed/orchestrator.js";
import type * as scripts_seed_passports from "../scripts/seed/passports.js";
import type * as scripts_seedDefaultSportRules from "../scripts/seedDefaultSportRules.js";
import type * as scripts_seedDemoClub from "../scripts/seedDemoClub.js";
import type * as scripts_seedFeatureFlags from "../scripts/seedFeatureFlags.js";
import type * as scripts_seedRugbyTeam from "../scripts/seedRugbyTeam.js";
import type * as scripts_seedUATData from "../scripts/seedUATData.js";
import type * as scripts_setCurrentOrg from "../scripts/setCurrentOrg.js";
import type * as scripts_stagedReset from "../scripts/stagedReset.js";
import type * as scripts_updateTeamObservationCoachNames from "../scripts/updateTeamObservationCoachNames.js";
import type * as scripts_v2MigrationStatus from "../scripts/v2MigrationStatus.js";
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
  "actions/aiMapping": typeof actions_aiMapping;
  "actions/claimsExtraction": typeof actions_claimsExtraction;
  "actions/coachParentSummaries": typeof actions_coachParentSummaries;
  "actions/draftGeneration": typeof actions_draftGeneration;
  "actions/entityResolution": typeof actions_entityResolution;
  "actions/federationAuth": typeof actions_federationAuth;
  "actions/federationScheduler": typeof actions_federationScheduler;
  "actions/federationSyncEngine": typeof actions_federationSyncEngine;
  "actions/federationWebhook": typeof actions_federationWebhook;
  "actions/gaaFoireann": typeof actions_gaaFoireann;
  "actions/gaaSync": typeof actions_gaaSync;
  "actions/guardianNotifications": typeof actions_guardianNotifications;
  "actions/invitations": typeof actions_invitations;
  "actions/messaging": typeof actions_messaging;
  "actions/migration": typeof actions_migration;
  "actions/phase4TestSeed": typeof actions_phase4TestSeed;
  "actions/platformStaffInvitations": typeof actions_platformStaffInvitations;
  "actions/practicePlans": typeof actions_practicePlans;
  "actions/sendDemoRequestNotification": typeof actions_sendDemoRequestNotification;
  "actions/sessionPlans": typeof actions_sessionPlans;
  "actions/syncQueueProcessor": typeof actions_syncQueueProcessor;
  "actions/teamInsights": typeof actions_teamInsights;
  "actions/voiceNotes": typeof actions_voiceNotes;
  "actions/whatsapp": typeof actions_whatsapp;
  auth: typeof auth;
  crons: typeof crons;
  debug: typeof debug;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "jobs/graduations": typeof jobs_graduations;
  "jobs/invitations": typeof jobs_invitations;
  "lib/ageGroupUtils": typeof lib_ageGroupUtils;
  "lib/analytics": typeof lib_analytics;
  "lib/auditCoachAssignments": typeof lib_auditCoachAssignments;
  "lib/autoApprovalDecision": typeof lib_autoApprovalDecision;
  "lib/circuitBreaker": typeof lib_circuitBreaker;
  "lib/coachContext": typeof lib_coachContext;
  "lib/consentGateway": typeof lib_consentGateway;
  "lib/duplicateDetection": typeof lib_duplicateDetection;
  "lib/featureFlags": typeof lib_featureFlags;
  "lib/federation/apiClient": typeof lib_federation_apiClient;
  "lib/federation/backoff": typeof lib_federation_backoff;
  "lib/federation/changeDetector": typeof lib_federation_changeDetector;
  "lib/federation/encryption": typeof lib_federation_encryption;
  "lib/federation/gaaMapper": typeof lib_federation_gaaMapper;
  "lib/federation/gaaTestData": typeof lib_federation_gaaTestData;
  "lib/feedbackMessages": typeof lib_feedbackMessages;
  "lib/firstUserSetup": typeof lib_firstUserSetup;
  "lib/import/aiMapper": typeof lib_import_aiMapper;
  "lib/import/benchmarkApplicator": typeof lib_import_benchmarkApplicator;
  "lib/import/dataQuality": typeof lib_import_dataQuality;
  "lib/import/deduplicator": typeof lib_import_deduplicator;
  "lib/import/mapper": typeof lib_import_mapper;
  "lib/import/parser": typeof lib_import_parser;
  "lib/import/simulator": typeof lib_import_simulator;
  "lib/import/sportConfig": typeof lib_import_sportConfig;
  "lib/import/validator": typeof lib_import_validator;
  "lib/injuryNotifications": typeof lib_injuryNotifications;
  "lib/matching/guardianMatcher": typeof lib_matching_guardianMatcher;
  "lib/messageValidation": typeof lib_messageValidation;
  "lib/phoneUtils": typeof lib_phoneUtils;
  "lib/playerMatching": typeof lib_playerMatching;
  "lib/stringMatching": typeof lib_stringMatching;
  "lib/trustLevelCalculator": typeof lib_trustLevelCalculator;
  "lib/whatsappCommandHandler": typeof lib_whatsappCommandHandler;
  "lib/whatsappCommands": typeof lib_whatsappCommands;
  "migrations/cleanSlate": typeof migrations_cleanSlate;
  "migrations/compareIrishDancing": typeof migrations_compareIrishDancing;
  "migrations/deleteOldIrishDancingSport": typeof migrations_deleteOldIrishDancingSport;
  "migrations/extractInsightsToTable": typeof migrations_extractInsightsToTable;
  "migrations/importBenchmarksCLI": typeof migrations_importBenchmarksCLI;
  "migrations/importGAAFootballBenchmarks": typeof migrations_importGAAFootballBenchmarks;
  "migrations/importGAAFootballLevelDescriptors": typeof migrations_importGAAFootballLevelDescriptors;
  "migrations/importIrishDancingBenchmarks": typeof migrations_importIrishDancingBenchmarks;
  "migrations/importIrishDancingGradeBenchmarks": typeof migrations_importIrishDancingGradeBenchmarks;
  "migrations/importIrishDancingLevelDescriptors": typeof migrations_importIrishDancingLevelDescriptors;
  "migrations/importRugbyBenchmarks": typeof migrations_importRugbyBenchmarks;
  "migrations/importRugbyLevelDescriptors": typeof migrations_importRugbyLevelDescriptors;
  "migrations/importSoccerBenchmarks": typeof migrations_importSoccerBenchmarks;
  "migrations/importSoccerLevelDescriptors": typeof migrations_importSoccerLevelDescriptors;
  "migrations/importStrengthBenchmarks": typeof migrations_importStrengthBenchmarks;
  "migrations/migrateLegacyData": typeof migrations_migrateLegacyData;
  "migrations/setupIrishDancing": typeof migrations_setupIrishDancing;
  "models/adultPlayers": typeof models_adultPlayers;
  "models/ageGroupEligibilityOverrides": typeof models_ageGroupEligibilityOverrides;
  "models/aiCopilot": typeof models_aiCopilot;
  "models/aiMappingAnalytics": typeof models_aiMappingAnalytics;
  "models/aiMappingCache": typeof models_aiMappingCache;
  "models/aiModelConfig": typeof models_aiModelConfig;
  "models/aiServiceHealth": typeof models_aiServiceHealth;
  "models/aiUsageLog": typeof models_aiUsageLog;
  "models/checkUserRoles": typeof models_checkUserRoles;
  "models/cleanupOldData": typeof models_cleanupOldData;
  "models/coachOverrideAnalytics": typeof models_coachOverrideAnalytics;
  "models/coachParentMessages": typeof models_coachParentMessages;
  "models/coachParentSummaries": typeof models_coachParentSummaries;
  "models/coachPlayerAliases": typeof models_coachPlayerAliases;
  "models/coachTasks": typeof models_coachTasks;
  "models/coachTrustLevels": typeof models_coachTrustLevels;
  "models/coaches": typeof models_coaches;
  "models/demoAsks": typeof models_demoAsks;
  "models/diagnosticIdentityCheck": typeof models_diagnosticIdentityCheck;
  "models/emergencyContacts": typeof models_emergencyContacts;
  "models/federationConnectors": typeof models_federationConnectors;
  "models/fixNeilsRoles": typeof models_fixNeilsRoles;
  "models/flows": typeof models_flows;
  "models/gaaTestMutations": typeof models_gaaTestMutations;
  "models/gdpr": typeof models_gdpr;
  "models/guardianIdentities": typeof models_guardianIdentities;
  "models/guardianManagement": typeof models_guardianManagement;
  "models/guardianPlayerLinks": typeof models_guardianPlayerLinks;
  "models/importAnalytics": typeof models_importAnalytics;
  "models/importMappingHistory": typeof models_importMappingHistory;
  "models/importProgress": typeof models_importProgress;
  "models/importSessionDrafts": typeof models_importSessionDrafts;
  "models/importSessions": typeof models_importSessions;
  "models/importSimulation": typeof models_importSimulation;
  "models/importTemplateSeeds": typeof models_importTemplateSeeds;
  "models/importTemplates": typeof models_importTemplates;
  "models/injuryDocuments": typeof models_injuryDocuments;
  "models/insightDrafts": typeof models_insightDrafts;
  "models/invitations": typeof models_invitations;
  "models/medicalProfiles": typeof models_medicalProfiles;
  "models/members": typeof models_members;
  "models/notificationPreferences": typeof models_notificationPreferences;
  "models/notifications": typeof models_notifications;
  "models/onboarding": typeof models_onboarding;
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
  "models/phase4TestCleanup": typeof models_phase4TestCleanup;
  "models/phase4TestSeedMutations": typeof models_phase4TestSeedMutations;
  "models/platformCostAlerts": typeof models_platformCostAlerts;
  "models/platformMessagingSettings": typeof models_platformMessagingSettings;
  "models/platformStaffInvitations": typeof models_platformStaffInvitations;
  "models/playerEmergencyContacts": typeof models_playerEmergencyContacts;
  "models/playerGraduations": typeof models_playerGraduations;
  "models/playerIdentities": typeof models_playerIdentities;
  "models/playerImport": typeof models_playerImport;
  "models/playerInjuries": typeof models_playerInjuries;
  "models/playerSelfAccess": typeof models_playerSelfAccess;
  "models/players": typeof models_players;
  "models/rateLimits": typeof models_rateLimits;
  "models/referenceData": typeof models_referenceData;
  "models/reviewAnalytics": typeof models_reviewAnalytics;
  "models/sessionPlans": typeof models_sessionPlans;
  "models/setup": typeof models_setup;
  "models/skillAssessments": typeof models_skillAssessments;
  "models/skillBenchmarks": typeof models_skillBenchmarks;
  "models/sportAgeGroupConfig": typeof models_sportAgeGroupConfig;
  "models/sportPassports": typeof models_sportPassports;
  "models/sports": typeof models_sports;
  "models/syncHistory": typeof models_syncHistory;
  "models/syncQueue": typeof models_syncQueue;
  "models/teamCollaboration": typeof models_teamCollaboration;
  "models/teamDecisions": typeof models_teamDecisions;
  "models/teamObservations": typeof models_teamObservations;
  "models/teamPlayerIdentities": typeof models_teamPlayerIdentities;
  "models/teams": typeof models_teams;
  "models/trustGatePermissions": typeof models_trustGatePermissions;
  "models/userPreferences": typeof models_userPreferences;
  "models/userProfiles": typeof models_userProfiles;
  "models/users": typeof models_users;
  "models/voiceNoteArtifacts": typeof models_voiceNoteArtifacts;
  "models/voiceNoteClaims": typeof models_voiceNoteClaims;
  "models/voiceNoteEntityResolutions": typeof models_voiceNoteEntityResolutions;
  "models/voiceNoteInsights": typeof models_voiceNoteInsights;
  "models/voiceNoteTranscripts": typeof models_voiceNoteTranscripts;
  "models/voiceNotes": typeof models_voiceNotes;
  "models/voicePipelineAlerts": typeof models_voicePipelineAlerts;
  "models/voicePipelineEvents": typeof models_voicePipelineEvents;
  "models/voicePipelineMetrics": typeof models_voicePipelineMetrics;
  "models/voicePipelineRetry": typeof models_voicePipelineRetry;
  "models/whatsappMessages": typeof models_whatsappMessages;
  "models/whatsappReviewLinks": typeof models_whatsappReviewLinks;
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
  "scripts/disableV2ForOrg": typeof scripts_disableV2ForOrg;
  "scripts/enableV2ForOrg": typeof scripts_enableV2ForOrg;
  "scripts/findPlayerByName": typeof scripts_findPlayerByName;
  "scripts/fixBrokenPhoneNumbers": typeof scripts_fixBrokenPhoneNumbers;
  "scripts/fixGAATeamSportCodes": typeof scripts_fixGAATeamSportCodes;
  "scripts/fullReset": typeof scripts_fullReset;
  "scripts/fullResetOptimized": typeof scripts_fullResetOptimized;
  "scripts/getOrgId": typeof scripts_getOrgId;
  "scripts/listUsers": typeof scripts_listUsers;
  "scripts/migrateEnrollmentSport": typeof scripts_migrateEnrollmentSport;
  "scripts/passportSharingDiagnostics": typeof scripts_passportSharingDiagnostics;
  "scripts/previewOrgCleanup": typeof scripts_previewOrgCleanup;
  "scripts/queryExisting": typeof scripts_queryExisting;
  "scripts/runMigration": typeof scripts_runMigration;
  "scripts/seed/helpers/playerStages": typeof scripts_seed_helpers_playerStages;
  "scripts/seed/orchestrator": typeof scripts_seed_orchestrator;
  "scripts/seed/passports": typeof scripts_seed_passports;
  "scripts/seedDefaultSportRules": typeof scripts_seedDefaultSportRules;
  "scripts/seedDemoClub": typeof scripts_seedDemoClub;
  "scripts/seedFeatureFlags": typeof scripts_seedFeatureFlags;
  "scripts/seedRugbyTeam": typeof scripts_seedRugbyTeam;
  "scripts/seedUATData": typeof scripts_seedUATData;
  "scripts/setCurrentOrg": typeof scripts_setCurrentOrg;
  "scripts/stagedReset": typeof scripts_stagedReset;
  "scripts/updateTeamObservationCoachNames": typeof scripts_updateTeamObservationCoachNames;
  "scripts/v2MigrationStatus": typeof scripts_v2MigrationStatus;
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
                  address?: string;
                  address2?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  county?: string;
                  createdAt: number;
                  currentOrgId?: string;
                  email: string;
                  emailVerified: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name: string;
                  noChildrenAcknowledged?: boolean;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt: number;
                  userId?: null | string;
                  wasInvited?: boolean;
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
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt: number;
                  defaultCountry?: "IE" | "GB" | "US";
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name: string;
                  notifyAdminsOnInvitationRequest?: boolean;
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
                  voiceNotesTrustGatesEnabled?: boolean;
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
                  autoReInviteCount?: number;
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
              }
            | {
                data: {
                  createdAt: number;
                  createdBy: string;
                  effectiveDate: number;
                  fullText: string;
                  summary: string;
                  version: number;
                };
                model: "gdprVersions";
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
                    | "altEmail"
                    | "address"
                    | "address2"
                    | "town"
                    | "county"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "wasInvited"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "noChildrenAcknowledged"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
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
                    | "defaultCountry"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
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
                    | "autoReInviteCount"
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
                model: "gdprVersions";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
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
                    | "altEmail"
                    | "address"
                    | "address2"
                    | "town"
                    | "county"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "wasInvited"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "noChildrenAcknowledged"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
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
                    | "defaultCountry"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
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
                    | "autoReInviteCount"
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
                model: "gdprVersions";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
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
            | "invitation"
            | "gdprVersions";
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
            | "invitation"
            | "gdprVersions";
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
                  address?: string;
                  address2?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  county?: string;
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  noChildrenAcknowledged?: boolean;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt?: number;
                  userId?: null | string;
                  wasInvited?: boolean;
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
                    | "altEmail"
                    | "address"
                    | "address2"
                    | "town"
                    | "county"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "wasInvited"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "noChildrenAcknowledged"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
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
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt?: number;
                  defaultCountry?: "IE" | "GB" | "US";
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name?: string;
                  notifyAdminsOnInvitationRequest?: boolean;
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
                  voiceNotesTrustGatesEnabled?: boolean;
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
                    | "defaultCountry"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
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
                  autoReInviteCount?: number;
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
                    | "autoReInviteCount"
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
                model: "gdprVersions";
                update: {
                  createdAt?: number;
                  createdBy?: string;
                  effectiveDate?: number;
                  fullText?: string;
                  summary?: string;
                  version?: number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
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
                  address?: string;
                  address2?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  county?: string;
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  noChildrenAcknowledged?: boolean;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt?: number;
                  userId?: null | string;
                  wasInvited?: boolean;
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
                    | "altEmail"
                    | "address"
                    | "address2"
                    | "town"
                    | "county"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "wasInvited"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "noChildrenAcknowledged"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
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
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt?: number;
                  defaultCountry?: "IE" | "GB" | "US";
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name?: string;
                  notifyAdminsOnInvitationRequest?: boolean;
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
                  voiceNotesTrustGatesEnabled?: boolean;
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
                    | "defaultCountry"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
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
                  autoReInviteCount?: number;
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
                    | "autoReInviteCount"
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
                model: "gdprVersions";
                update: {
                  createdAt?: number;
                  createdBy?: string;
                  effectiveDate?: number;
                  fullText?: string;
                  summary?: string;
                  version?: number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
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
      skipProfileCompletionStep: FunctionReference<
        "mutation",
        "internal",
        { currentSkipCount: number; userId: string },
        { canSkipAgain: boolean; skipCount: number }
      >;
      updateOnboardingComplete: FunctionReference<
        "mutation",
        "internal",
        { onboardingComplete: boolean; userId: string },
        null
      >;
      updateProfileCompletion: FunctionReference<
        "mutation",
        "internal",
        {
          address?: string;
          address2?: string;
          altEmail?: string;
          country?: string;
          county?: string;
          phone?: string;
          postcode?: string;
          town?: string;
          userId: string;
        },
        { profileCompletedAt: number; success: boolean }
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
