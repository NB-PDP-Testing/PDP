
## 🔒 Security Audit - 2026-01-31 20:57:23

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 20:57:35
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 20:58:56

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## 🔒 Security Audit - 2026-01-31 20:59:14

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 20:59:06
- ⚠️ Biome lint errors found


## Quality Monitor - 2026-01-31 21:00:41
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:01:21

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Auto Quality Check - 2026-01-31 21:02:01
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-01-31 21:02:21
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Quality Monitor - 2026-01-31 21:02:00
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:03:24

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Auto Quality Check - 2026-01-31 21:03:26
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Quality Monitor - 2026-01-31 21:03:22
- ⚠️ Biome lint errors found


## Auto Quality Check - 2026-01-31 21:03:50
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-01-31 21:04:22
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-01-31 21:04:45
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-01-31 21:05:05
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## 🔒 Security Audit - 2026-01-31 21:05:25

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Auto Quality Check - 2026-01-31 21:05:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/trustGatePermissions.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Quality Monitor - 2026-01-31 21:04:37
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:07:27

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:06:58
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:09:31

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:09:12
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:11:35

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:11:04
- ⚠️ Biome lint errors found


## Quality Monitor - 2026-01-31 21:12:44
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:13:39

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:14:01
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:15:42

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:16:15
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:17:44

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:18:02
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:19:48

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## 🔒 Security Audit - 2026-01-31 21:23:45

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:19:21
- ⚠️ Biome lint errors found


## 🔒 Security Audit - 2026-01-31 21:26:57

## ⚠️ MEDIUM: XSS Risk Detected
Found dangerouslySetInnerHTML usage:
```
apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
apps/web/src/components/onboarding/gdpr-policy-viewer.tsx:      dangerouslySetInnerHTML={{ __html: htmlContent }}
```
**Fix:** Sanitize with DOMPurify before rendering

## ℹ️ INFO: Debug Logging Found
Files with console.log:
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx
**Action:** Remove debug logging before production

## ⚠️ MEDIUM: Possible Missing Authorization
Mutations without auth checks:
packages/backend/convex/models/platformMessagingSettings.ts
packages/backend/convex/models/passportComparison.ts
packages/backend/convex/models/trustGatePermissions.ts
packages/backend/convex/models/ageGroupEligibilityOverrides.ts
packages/backend/convex/models/teamCollaboration.ts
packages/backend/convex/models/guardianIdentities.ts
packages/backend/convex/models/sessionPlans.ts
packages/backend/convex/models/adultPlayers.ts
packages/backend/convex/models/demoAsks.ts
packages/backend/convex/models/skillBenchmarks.ts
packages/backend/convex/models/coaches.ts
packages/backend/convex/models/medicalProfiles.ts
packages/backend/convex/models/invitations.ts
packages/backend/convex/models/flows.ts
packages/backend/convex/models/notifications.ts
packages/backend/convex/models/teamObservations.ts
packages/backend/convex/models/passportGoals.ts
packages/backend/convex/models/players.ts
packages/backend/convex/models/orgInjuryNotes.ts
packages/backend/convex/models/playerImport.ts
packages/backend/convex/models/passportEnquiries.ts
packages/backend/convex/models/setup.ts
packages/backend/convex/models/teamPlayerIdentities.ts
packages/backend/convex/models/rateLimits.ts
packages/backend/convex/models/platformStaffInvitations.ts
packages/backend/convex/models/coachParentMessages.ts
packages/backend/convex/models/aiModelConfig.ts
packages/backend/convex/models/orgPlayerEnrollments.ts
packages/backend/convex/models/sportPassports.ts
packages/backend/convex/models/orgJoinRequests.ts
packages/backend/convex/models/sportAgeGroupConfig.ts
packages/backend/convex/models/referenceData.ts
packages/backend/convex/models/notificationPreferences.ts
packages/backend/convex/models/userPreferences.ts
packages/backend/convex/models/teams.ts
packages/backend/convex/models/gdpr.ts
packages/backend/convex/models/emergencyContacts.ts
packages/backend/convex/models/coachTrustLevels.ts
packages/backend/convex/models/coachParentSummaries.ts
packages/backend/convex/models/onboarding.ts
packages/backend/convex/models/guardianPlayerLinks.ts
packages/backend/convex/models/orgGuardianProfiles.ts
packages/backend/convex/models/passportSharing.ts
packages/backend/convex/models/playerGraduations.ts
packages/backend/convex/models/members.ts
packages/backend/convex/models/users.ts
packages/backend/convex/models/skillAssessments.ts
packages/backend/convex/models/playerSelfAccess.ts
packages/backend/convex/models/aiServiceHealth.ts
packages/backend/convex/models/sports.ts
packages/backend/convex/models/fixNeilsRoles.ts
packages/backend/convex/models/playerIdentities.ts
packages/backend/convex/models/voiceNotes.ts
packages/backend/convex/models/guardianManagement.ts
packages/backend/convex/models/playerInjuries.ts
packages/backend/convex/models/voiceNoteInsights.ts
packages/backend/convex/models/playerEmergencyContacts.ts
packages/backend/convex/models/coachTasks.ts**Fix:** Add getUserOrgRole() check in mutations


**Summary:** 0 high, 2 medium, 1 low severity issues


## Quality Monitor - 2026-01-31 21:26:52
- ⚠️ Biome lint errors found

