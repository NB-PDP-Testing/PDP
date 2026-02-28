# UAT Test: US-P9-010 - Data Breach Notification Procedure & Breach Register

> Auto-generated: 2026-02-28 18:36
> Status: ⏳ Pending Execution

## Story
As an org admin and data controller, I need a breach register to log data incidents and track GDPR Articles 33/34 notification obligations, so that the organisation can demonstrate compliance with mandatory 72-hour DPC notification requirements.

## Acceptance Criteria Checklist

- [ ] SCHEMA — add breachRegister table to packages/backend/convex/schema.ts: organizationId (v.string()), detectedAt (v.number()), detectedByUserId (v.string()), description (v.string()), affectedDataCategories (v.array(v.string()) — free-form list, e.g. ['wellness data', 'player profiles']), estimatedAffectedCount (v.optional(v.number())), severity (v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('critical'))), status (v.union(v.literal('detected'), v.literal('under_assessment'), v.literal('dpc_notified'), v.literal('individuals_notified'), v.literal('closed'))), dpcNotifiedAt (v.optional(v.number())), individualsNotifiedAt (v.optional(v.number())), resolutionNotes (v.optional(v.string())), closedAt (v.optional(v.number())), createdAt (v.number()), updatedAt (v.number()). Indexes: by_org [organizationId], by_org_and_status [organizationId, status].
- [ ] BACKEND — create packages/backend/convex/models/breachRegister.ts:
- [ ] logBreach mutation: args { organizationId, detectedAt, description, affectedDataCategories, estimatedAffectedCount?, severity }. Insert breachRegister record with status 'detected'. Returns new breach ID.
- [ ] updateBreachStatus mutation: args { breachId, status, dpcNotifiedAt?, individualsNotifiedAt?, resolutionNotes?, closedAt? }. Patches the record.
- [ ] listBreaches query: args { organizationId }. Returns all breachRegister records for this org, ordered by detectedAt descending. Include returns validator.
- [ ] getBreachById query: args { breachId }. Returns single record or null.
- [ ] ADMIN UI — add 'Breach Register' page at /orgs/[orgId]/admin/breach-register. Link in admin sidebar under 'Compliance' group (same group as Data Rights Requests from Phase 9):
- [ ] Page header: 'Data Breach Register'. Sub-header: 'GDPR Articles 33/34 require notification to the Data Protection Commission within 72 hours of becoming aware of a breach. This register is your Article 33(5) record of all incidents.'
- [ ] 'Log New Incident' button opens a dialog/sheet with: Date/time detected (datetime-local input, defaults to now), Description (textarea, required — 'Describe what happened, what data was involved, and how it was discovered'), Affected data categories (multi-select or comma-separated tags: wellness data / player profiles / injury records / coach feedback / communications / other), Estimated number of individuals affected (number input, optional), Severity (select: Low / Medium / High / Critical with descriptions: Low = no personal data at risk; Medium = personal data exposed but low risk to individuals; High = sensitive data exposed, moderate risk; Critical = special category health data or large-scale exposure).
- [ ] 72-HOUR WARNING BANNER: query all breaches with status 'detected' or 'under_assessment'. For each: if detectedAt < Date.now() - 259200000 (72 hours) AND status is not 'dpc_notified', 'individuals_notified', or 'closed': show a red banner at top of page: '⚠️ [N] incident(s) may require DPC notification — the 72-hour window has passed. Review and update status immediately.'
- [ ] BREACH LIST TABLE: columns — Date Detected, Description (truncated to 80 chars), Severity (colour-coded badge), Status, DPC Notified (date or '—'), Actions ('Update' button).
- [ ] UPDATE DIALOG: allows updating status, adding DPC notification date, adding individual notification date, adding resolution notes. 'Close Incident' sets status to 'closed' and requires resolution notes.
- [ ] Severity colour codes: Low = grey, Medium = yellow, High = orange, Critical = red.
- [ ] CREATE docs/breach-notification-procedure.md (in the project docs/ folder):
- [ ] Template incident response procedure covering: (1) Identification & containment — who to contact first, how to isolate the affected system; (2) Assessment — is personal data involved? What categories? How many individuals?; (3) Internal escalation — Data Controller (org admin) must be notified within 24h of detection; (4) DPC notification — if breach is likely to result in a risk to individuals, notify the Irish DPC (Data Protection Commission) within 72 hours via https://forms.dataprotection.ie/report-a-breach-of-personal-data; (5) Individual notification — if high risk to individuals, notify affected data subjects 'without undue delay'; (6) Documentation — log all incidents in the Breach Register regardless of severity.
- [ ] Run npx -w packages/backend convex codegen — all types pass.
- [ ] npm run check-types passes.

## Playwright E2E Tests
- Run: `npx -w apps/web playwright test --config=uat/playwright.config.ts -g "US-P9-010"`
- Report: `npx -w apps/web playwright show-report uat/playwright-report`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
