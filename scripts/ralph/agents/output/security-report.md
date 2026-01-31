# Security Report - 2026-01-31 21:26:57

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


