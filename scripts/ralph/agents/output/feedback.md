
## Security Tester - 2026-02-16 11:33:24
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/aiMapping.ts:      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
packages/backend/convex/actions/aiMapping.ts:        "ANTHROPIC_API_KEY not configured in Convex environment variables"
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/syncQueue.ts
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
  - packages/backend/convex/models/aiMappingCache.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/aiMappingAnalytics.ts
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
  - packages/backend/convex/models/gaaTestMutations.ts
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
  - packages/backend/convex/actions/aiMapping.ts
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## PRD Audit - US-P4.5-002 - 2026-02-16 11:30:45
Excellent! The encryption module exists. Now let me create a comprehensive audit report:

## **AUDIT REPORT: US-P4.5-002 - Create connector creation/edit form**

### **Status: PARTIAL**

### **Evidence Found:**

✅ **Files Created:**
- `/apps/web/src/app/platform/connectors/create/page.tsx` ✓
- `/apps/web/src/app/platform/connectors/[connectorId]/edit/page.tsx` ✓
- `/packages/backend/convex/models/federationConnectors.ts` ✓ (includes `createConnector` and `updateConnector` mutations)
- `/packages/backend/convex/lib/federation/encryption.ts` ✓ (credentials encryption)

✅ **Form Fields - All Present:**
- Name (required) ✓
- Federation Code (required, unique, disabled in edit mode) ✓
- Status dropdown (active/inactive) ✓
- Auth Type dropdown (OAuth 2.0, API Key, Basic Auth) ✓
- Conditional OAuth 2.0 fields: Client ID, Client Secret, Authorization URL, Token URL ✓
- Conditional API Key fields: API Key, Header Name (default: "X-API-Key") ✓
- Conditional Basic Auth fields: Username, Password ✓
- Membership List URL (required) ✓
- Member Detail URL (optional) ✓
- Webhook Secret (optional) ✓
- Enable Scheduled Sync checkbox ✓
- Cron Schedule (text input, default: '0 2 * * *') ✓
- Conflict Strategy dropdown (federation_wins, local_wins, merge) ✓
- Template dropdown ✓

✅ **Validations Implemented:**
- Federation code pattern validation: `/^[a-z0-9_]+$/` (line 29, 96, 232 in create/page.tsx) ✓
- HTTPS URL validation: checks all URLs start with `https://` (lines 109, 135) ✓
- Required field validation via React Hook Form ✓

✅ **Backend Integration:**
- Calls `createConnector` mutation (line 80-82 create, line 138-154 execution) ✓
- Calls `updateConnector` mutation (line 95-97 edit, line 143-157 execution) ✓
- Calls `updateConnectorCredentials` (line 98-100, 208-211 edit) ✓
- Credentials encrypted before storage via `encryptCredentials` (lines 48-57 in backend) ✓

✅ **Success/Error Handling:**
- Success toast: "Connector created successfully" (line 156 create) ✓
- Success toast: "Connector updated successfully" (line 214 edit) ✓
- Error toast: "Failed to save connector: [error]" (lines 161, 219) ✓

✅ **Navigation:**
- Cancel button returns to `/platform/connectors` (lines 574, 649) ✓

✅ **Quality Checks:**
- Convex codegen runs successfully ✓
- `npm run check-types` passes (only pre-existing errors in unrelated files) ✓
- Git commits found: `d584fcb0` (edit form), `5779eeb8` (create form) ✓

---

### **Missing Acceptance Criteria:**

❌ **Cron schedule validation:**
- The form accepts any string for cron schedule
- **No validation** that the cron expression is valid
- Acceptance criteria states: "Validate: cron schedule is valid expression"
- Lines 494-501 (create) and 556-565 (edit) show cron input but no validation logic

❌ **Ultracite fix:**
- `npx ultracite fix` command failed with TRPC error (unrelated to connector code)
- Cannot confirm code passes Ultracite formatting standards
- Acceptance criteria states: "Run npx ultracite fix and npm run check-types"

---

### **Summary:**

The story is **95% complete** with comprehensive form implementation, backend mutations, validation, and error handling. The implementation quality is high with proper security (credential encryption), conditional field rendering, and proper TypeScript typing.

**Critical gap:** Cron schedule validation is missing. The form accepts any string without verifying it's a valid cron expression.

**Minor gap:** Ultracite fix status unclear due to tool error (likely unrelated to this story).

**Recommendation:** Add cron validation (e.g., using a library like `cron-parser`) before marking this story complete.

## Security Tester - 2026-02-16 11:35:28
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/aiMapping.ts:      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
packages/backend/convex/actions/aiMapping.ts:        "ANTHROPIC_API_KEY not configured in Convex environment variables"
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/syncQueue.ts
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
  - packages/backend/convex/models/aiMappingCache.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/aiMappingAnalytics.ts
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
  - packages/backend/convex/models/gaaTestMutations.ts
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
  - packages/backend/convex/actions/aiMapping.ts
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient

