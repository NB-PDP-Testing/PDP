
## Auto Quality Check - 2026-02-25 21:02:16
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:02:16
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:02:16
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:02:17
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Code Review Gate - 2026-02-25 21:02:24

🔍 **Deep Code Review:** VERDICT: APPROVE

This is a Playwright E2E test file — no Convex backend code, so the critical backend rules (`.filter()`, `organizationId`, N+1, `user._id`) don't apply here.

Minor observations (non-blocking):
- `[LOW]` `daily-wellness-phase4.spec.ts:244` — `expect(hasWellness || hasNotFound || true).toBe(true)` always passes; the assertion is meaningless but harmless as a structural smoke test.
- `[LOW]` Multiple `page.waitForTimeout()` calls (lines 217, 338, 356, etc.) — brittle timing; prefer `waitForSelector`/`waitFor` with conditions, but acceptable for UAT-style tests.
- `[LOW]` `daily-wellness-phase4.spec.ts:635` — `expect(true).toBe(true)` is a no-op assertion, just documenting intent. Fine for a smoke test but doesn't actually verify anything.

No security, data isolation, or correctness issues in this file.


## Security Tester - 2026-02-25 21:03:51
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:03:55
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## PRD Audit - US-P4-009 - 2026-02-25 20:59:55
**PARTIAL** — US-P4-009 is substantially implemented but has 4 gaps:

**What's working:**
- Admin settings page has full Wellness Reminders section (master toggle, frequency, reminder type options)
- Low-score alert config UI (threshold + toggle)
- `wellnessOrgConfig` backend schema, query, and mutation
- Daily cron job that checks `by_player_and_date` index and skips already-submitted players
- Admin analytics "Wellness" tab with org-level trend chart
- Individual player drill-down (dimension-level history)
- Correlation panel (players with 3+ consecutive low check-ins)

**What's missing:**

1. **Low-score alert trigger** — Config is stored but no cron/logic actually monitors new submissions and sends alerts to admins/medical staff when scores fall below threshold

2. **Cycle phase analysis (medical staff only)** — The `cyclePhase` field exists in schema but there is no heatmap component, no medical-staff role check, and no query correlating injury occurrences by cycle phase

3. **Email reminders** — Cron only creates in-app notifications; `reminderType: "email"` and `"both"` options are not actually dispatching emails

4. **CSV export scope** — Export only outputs org-level aggregated data (date, avg score, count); acceptance criteria requires individual player data with player filter

## Auto Quality Check - 2026-02-25 21:05:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:05:54
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:06:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:06:30
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:07:36
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:08:06
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:09:44
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:10:13
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:10:20
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## PRD Audit - US-P4-010 - 2026-02-25 21:04:56
**PARTIAL** — Story mostly implemented but one criterion is incomplete.

**What's present:**
- Schema `playerWellnessInsights` with all fields and both indexes ✅
- `actions/wellnessInsights.ts` with `"use node"`, all 6 steps, Anthropic integration following codebase pattern ✅
- Trigger in `submitDailyHealthCheck` using `ctx.scheduler.runAfter(0, ...)` fire-and-forget ✅
- Player UI: `useQuery` for reactive insight display, 💡 prefix, nudge for <7 check-ins, nothing shown if no insight (no indefinite spinner) ✅
- Attribution "Generated by AI · Based on your last [N] check-ins" ✅
- Security: `playerWellnessInsights` not exposed in any coach/admin query ✅

**What's missing:**
- **Trend chart view collapsible panel** — the acceptance criteria requires a collapsible "Latest Insight" panel at the top of the trend chart page (`wellness-trend-charts.tsx`). The insight is displayed on the main health-check page instead, but there is no separate collapsible panel component in the trend chart view.

## Security Tester - 2026-02-25 21:12:18
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:13:04
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-25 21:13:04
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/teamPlayerIdentities.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:14:23
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-25 21:16:25
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## PRD Audit - US-P4-UAT - 2026-02-25 21:16:32
**PARTIAL**

The test file `apps/web/uat/tests/daily-wellness-phase4.spec.ts` exists (788 lines). Here's the gap analysis:

**Criteria MET:**
- File created ✅
- Submit button disabled when unanswered (P4-005) ✅
- Cycle phase section not shown for male players — partial (P4-032, but uses admin page not explicit male player account) ✅
- GDPR modal appears on first cycle phase interaction (P4-030) ✅
- GDPR modal checkbox NOT pre-ticked (P4-031) ✅
- Coach dashboard shows aggregate scores only, no individual dimensions (P4-022) ✅

**Criteria MISSING or INSUFFICIENT:**

1. **"Exactly 5 core dimensions" with no optional ones** — P4-003 checks for the presence of 5 core dimensions but does NOT verify that optional dimensions are absent (no `expect(count).toBe(5)` check, and emoji count uses `toBeGreaterThanOrEqual(5)`, not strict equality).

2. **Submitting wellness check creates DB record** — No DB verification at all. Tests only check UI flow, not that `dailyPlayerHealthChecks` record is actually created with correct values.

3. **Returning same day shows existing answers in selected state** — P4-006 only checks for an "Update" button being enabled; doesn't verify previously selected answers appear in selected/highlighted state.

4. **Coach 'Request Access' creates record with status 'pending'** — P4-023 only checks the button is present; it does not click it and verify a `wellnessCoachAccess` record is created.

5. **Player approve → status 'approved'** — No test exists.

6. **Player revoke → status 'revoked' + player removed from coach view** — No test exists.

7. **Optional dimension toggle flow** — P4-012 checks switches exist; no test navigates away, toggles a dimension, returns to check-in, and verifies it appears/disappears.

The manual tests (1–15) are correctly documented as manual-only in the acceptance criteria, so their absence from automation is expected.

## Security Tester - 2026-02-25 21:18:27
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:19:37
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:20:31
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:21:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:22:34
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-25 21:24:36
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:26:18
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:26:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:26:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:26:41
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:27:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:27:25
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:28:44
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:29:16
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:29:26
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:30:47
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:30:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-25 21:30:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:31:58
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:32:09
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:32:22
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:32:36
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:32:53
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:32:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:05
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:24
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:49
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:33:56
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:34:15
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/playerHealthChecks.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:34:55
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-25 21:36:58
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-25 21:39:02
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-25 21:41:04
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:42:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:42:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/actions/wellnessInsights.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-25 21:43:06
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-25 21:43:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-25 21:43:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-25 21:43:33
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Security Tester - 2026-02-25 21:45:11
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/verify-model/route.ts:          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.anthropic = "ANTHROPIC_API_KEY not configured";
apps/web/src/app/api/ai-config/available-models/route.ts:    errors.openai = "OPENAI_API_KEY not configured";
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
```
- ⚠️ **HIGH**: 5 high-severity dependency vulnerabilities
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
  - packages/backend/convex/models/injuryDocuments.ts
  - packages/backend/convex/models/playerHealthChecks.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/phase4TestCleanup.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/voicePipelineAlerts.ts
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
  - packages/backend/convex/models/voicePipelineRetry.ts
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
  - packages/backend/convex/actions/sessionPlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/actions/wellnessInsights.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient

