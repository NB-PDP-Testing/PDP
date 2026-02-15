
## Security Tester - 2026-02-15 20:52:33
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/coachParentSummaries.ts: * Throws if ANTHROPIC_API_KEY is not configured
packages/backend/convex/actions/coachParentSummaries.ts:      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-15 20:54:35
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/coachParentSummaries.ts: * Throws if ANTHROPIC_API_KEY is not configured
packages/backend/convex/actions/coachParentSummaries.ts:      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-15 20:56:40
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/coachParentSummaries.ts: * Throws if ANTHROPIC_API_KEY is not configured
packages/backend/convex/actions/coachParentSummaries.ts:      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Code Review Gate - 2026-02-15 20:57:46

🔍 **Code Review: BLOCK** (1 critical, 0 high, 0 medium) - 🚨 **CRITICAL**: `.filter()` usage in `packages/backend/convex/models/federationConnectors.ts` - use `.withIndex()` instead\n  ```\n422:    const updatedOrgs = connector.connectedOrganizations.filter(
548:    const connectedConnectors = allConnectors.filter((connector) =>\n  ```\n\n**Verdict:** BLOCK - Fix CRITICAL/HIGH issues before continuing


## Auto Quality Check - 2026-02-15 20:57:51
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/federationConnectors.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Code Review Gate - 2026-02-15 20:58:08

🔍 **Deep Code Review:** **VERDICT: WARN**

**ISSUES:**

- **[CRITICAL]** federationConnectors.ts:545-555 - `.filter()` used after `.collect()` on line 548-551. This is an N+1 anti-pattern. Should use `.withIndex("by_organizationId")` if an index exists, or add one. Current implementation loads ALL connectors into memory then filters in JavaScript.

- **[HIGH]** federationConnectors.ts:124-155 - `updateConnector` mutation has no auth check. Platform staff/admin-only operations should verify user permissions before allowing updates.

- **[HIGH]** federationConnectors.ts:220-235 - `deleteConnector` mutation has no auth check. Should verify user is platform staff or authorized admin.

- **[HIGH]** federationConnectors.ts:364-404 - `connectOrganization` mutation has no auth check. Should verify user has permission to connect the specified organization.

- **[HIGH]** federationConnectors.ts:408-433 - `disconnectOrganization` mutation has no auth check. Should verify user has permission to disconnect the organization.

- **[HIGH]** federationConnectors.ts:437-468 - `updateLastSyncTime` mutation has no auth check. This appears to be internal-only and should use `internalMutation` instead.

**RECOMMENDATIONS:**

1. **Most critical:** Add an index `by_organizationId` to `federationConnectors` table (index on array field `connectedOrganizations.organizationId`) and rewrite `getOrganizationConnectors` to use `.withIndex()`.

2. Add auth checks to all public mutations - verify platform staff role or organization ownership before allowing connector management operations.

3. Convert `updateLastSyncTime` to `internalMutation` since it appears to be called only by sync jobs, not user-facing code.


## Security Tester - 2026-02-15 20:58:42
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/coachParentSummaries.ts: * Throws if ANTHROPIC_API_KEY is not configured
packages/backend/convex/actions/coachParentSummaries.ts:      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient

