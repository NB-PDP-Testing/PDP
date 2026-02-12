# Passport Sharing - Stakeholder Decisions Log

**Document Version:** 1.0
**Date:** January 14, 2026
**Status:** Decisions Captured

This document captures key stakeholder decisions made during the PRD ideation process. These decisions should be incorporated into the main PRD and UX specification.

---

## Decision Summary

### 1. Data Attribution & Organization Visibility

**Decision:** Show organization name with public contact information

**Details:**
- Coaches WILL see the source organization name (e.g., "Shared from FC United")
- Organization admins can configure a **public contact** in their settings for other clubs to reach out
- Contact options: Either "Name + Email + Phone" OR "General enquiries form/page"
- Admin has flexibility to choose between these two contact display modes

**Rationale:** Full transparency helps context for coaches; public contact enables coach-to-coach coordination for player welfare.

---

### 2. Coach Acceptance Workflow

**Decision:** Per-player acceptance with coach review

**Details:**
- When a parent shares a passport, the receiving coach must **accept or decline** the share
- Acceptance is done **per-player** (not bulk per-organization)
- Coach can decline if they don't want/need the shared data
- This creates a two-way consent model: Parent initiates → Coach accepts

**Rationale:** Gives coaches control over their dashboard; prevents unwanted data accumulation; creates mutual agreement.

**New Flow:**
```
Parent enables sharing →
Notification to receiving org coaches →
Coach reviews share offer →
Coach accepts/declines →
If accepted: Data becomes visible
If declined: Parent notified, can re-offer later
```

---

### 3. Request-to-Share Workflow

**Decision:** Include request workflow in scope

**Details:**
- Coaches CAN request access to a player's passport from other organizations
- Request notification sent to parent
- Parent can approve or decline the request
- This enables coach-initiated sharing (complementary to parent-initiated)

**Rationale:** Drives feature adoption; creates awareness for parents who may not know the feature exists; enables coaches to proactively seek context.

**New Flow:**
```
Coach identifies player enrolled at another org →
Coach sends "Request to View Passport" →
Parent receives notification with coach details →
Parent can: Approve (starts enable flow) / Decline / Ignore
```

---

### 4. Future Organization Handling

**Decision:** Require re-consent for new organizations

**Details:**
- When parent selects "all enrolled organizations", this applies to CURRENT enrollments only
- If child joins a NEW organization later, parent must explicitly add them to sharing
- Notification sent when new enrollment detected: "Jamie joined [New Club]. Would you like to include them in passport sharing?"

**Rationale:** More protective of parent control; prevents unexpected data exposure; maintains explicit consent principle.

---

### 5. AI Insights Automation

**Decision:** Fully automated with coach review

**Details:**
- AI generates insights automatically based on shared data
- Insights appear proactively in coach dashboard
- Coaches can dismiss, act on, or provide feedback (helpful/not helpful)
- No manual trigger required

**Rationale:** Maximizes value from shared data; reduces friction for coaches; enables continuous improvement via feedback.

---

### 6. Sensitive Data Definition

**Decision:** Platform Staff define sensitive categories; currently Medical + Contact + Private Notes

**Details:**
- **Sensitive elements** (require extra confirmation during consent):
  - Injury history
  - Medical summary
  - Contact information
  - Coach notes marked as "private"
- Platform Staff (system-level) define what's considered sensitive
- Club admins cannot override this classification
- Sensitive elements shown in separate section during consent flow with amber/warning styling

**Rationale:** Consistent platform-wide definition; prevents accidental sensitive data exposure; maintains trust.

---

### 7. Admin Control Level

**Decision:** Parent-only control with platform-level sensitive restrictions

**Details:**
- Parents have ultimate control over sharing decisions
- Admins CAN view statistics and reports (governance/oversight)
- Admins CANNOT restrict or override parent decisions
- Platform Staff CAN define which elements are classified as "sensitive"
- This is a **key selling point** of PlayerARC: parent empowerment

**Implementation:**
- Admin dashboard: Read-only statistics, compliance reports
- Admin cannot: Block sharing, require approval, limit elements
- Platform staff can: Define sensitive element list, emergency intervention

**Rationale:** Parent empowerment is core value proposition; test and learn approach; can revisit if issues arise.

---

### 8. Player Departure Handling

**Decision:** Auto-pause sharing with parent notification

**Details:**
- When a player becomes inactive at an organization:
  - Sharing FROM that organization is automatically PAUSED
  - Parent receives notification: "Jamie is no longer active at [Club]. Sharing has been paused."
  - Parent can choose to re-enable if desired (e.g., taking a break but may return)
- Sharing is NOT permanently terminated - just paused
- Data already shared remains in audit log

**Rationale:** Protective by default; gives parent control to continue if appropriate; respects that inactive doesn't always mean permanent departure.

---

### 9. Notification Preferences

**Decision:** Fully customizable notification preferences

**Details:**
- Parents can configure their notification frequency:
  - **Real-time**: Immediate notification on every access
  - **Daily digest**: Summary of all access in past 24 hours
  - **Weekly digest**: Summary of all access in past 7 days
  - **None**: No access notifications (can still view log manually)
- Default: Weekly digest (recommended during onboarding)
- Can be changed anytime in settings

**Rationale:** Respects different parent preferences; prevents notification fatigue; maintains transparency for those who want it.

---

### 10. Organization Contact Configuration

**Decision:** Admin can choose between two contact display modes

**Details:**
- **Option A:** Contact name + email + phone (full details)
- **Option B:** General enquiries form/page link (controlled routing)
- Admin selects their preferred mode in organization settings
- This contact info is visible to coaches at other organizations when viewing shared data
- Purpose: Enable coach-to-coach coordination about shared players

**Implementation:**
- New fields in organization settings:
  - `sharingContactMode`: 'direct' | 'form'
  - `sharingContactName`: string
  - `sharingContactEmail`: string
  - `sharingContactPhone`: string (optional)
  - `sharingEnquiriesUrl`: string (for form mode)

---

### 11. MVP/Phase 1 Scope

**Decision:** Include cross-org parent dashboard as stretch goal

**Details:**
- **Core Phase 1** (must have):
  - Parent consent flow (enable/revoke/renew)
  - Coach shared passport view with acceptance workflow
  - Coach request-to-share workflow
  - Basic access audit log
  - Admin statistics dashboard

- **Phase 1 Stretch** (if timeline allows):
  - Cross-org parent dashboard (see all children across all clubs)
  - If not achievable, create simplified version (basic list view)

- **Phase 2**:
  - Full AI insights engine
  - Advanced analytics
  - Public share tokens (external sharing)

**Rationale:** Cross-org parent dashboard is a key differentiator; attempt inclusion but don't block release.

---

## Updated Requirements Based on Decisions

### New Functional Requirements

**FR-C6: Coach Share Acceptance (NEW)**
- Coach receives notification when parent shares a passport with their organization
- Coach can view summary of what's being shared before accepting
- Coach can accept (data becomes visible) or decline (parent notified)
- Accepted shares appear in coach's "Shared Players" section
- Declined shares can be re-offered by parent later

**FR-C7: Coach Request Access (NEW)**
- Coach can identify players enrolled at other organizations
- Coach can send "Request to View Passport" to parent
- Request includes: Coach name, organization, reason (optional)
- Parent receives notification with approve/decline options
- If approved, parent is taken to enable sharing flow

**FR-ORG1: Organization Contact Settings (NEW)**
- Admin can configure public contact for passport sharing coordination
- Two modes: Direct contact details OR enquiries form URL
- Contact visible to coaches at other orgs viewing shared data
- Can be updated anytime in organization settings

**FR-P9: Notification Preferences (NEW)**
- Parent can configure access notification frequency
- Options: Real-time, Daily digest, Weekly digest, None
- Accessible via sharing settings
- Can be configured per-child or globally

### Updated Data Requirements

**New Fields on `organization` table:**
```typescript
sharingContactMode: v.union(v.literal("direct"), v.literal("form")),
sharingContactName: v.optional(v.string()),
sharingContactEmail: v.optional(v.string()),
sharingContactPhone: v.optional(v.string()),
sharingEnquiriesUrl: v.optional(v.string()),
```

**New Table: `passportShareRequests`**
```typescript
passportShareRequests: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  requestedBy: v.string(), // Coach userId
  requestedByName: v.string(),
  requestedByRole: v.string(),
  requestingOrgId: v.id("organization"),
  requestingOrgName: v.string(),
  reason: v.optional(v.string()),

  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("declined"),
    v.literal("expired")
  ),

  requestedAt: v.number(),
  respondedAt: v.optional(v.number()),
  respondedBy: v.optional(v.string()),
  expiresAt: v.number(), // Requests expire after X days
})
```

**Updates to `passportShareConsents`:**
```typescript
// Add coach acceptance tracking
coachAcceptanceStatus: v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined")
),
acceptedByCoachId: v.optional(v.string()),
acceptedAt: v.optional(v.number()),
declinedAt: v.optional(v.number()),
declineReason: v.optional(v.string()),
```

**New Table: `parentNotificationPreferences`**
```typescript
parentNotificationPreferences: defineTable({
  guardianIdentityId: v.id("guardianIdentities"),
  playerIdentityId: v.optional(v.id("playerIdentities")), // null = global

  accessNotificationFrequency: v.union(
    v.literal("realtime"),
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("none")
  ),

  updatedAt: v.number(),
})
```

---

## Open Questions (For Future Discussion)

1. **Re-offer timing:** If a coach declines a share, how long before parent can re-offer? Immediate? 30 days?

2. **Request expiry:** How long should a coach's request-to-share remain pending before auto-expiring? 7 days? 14 days?

3. **Multi-coach acceptance:** If an org has multiple coaches, does one coach's acceptance apply to all, or each coach individually?

4. **Decline visibility:** Should parents see which specific coach declined, or just "declined by [Organization]"?

5. **Contact form integration:** For orgs using enquiries form mode, should we provide a built-in form or just link to external?

---

## Next Steps

1. Update main PRD with new requirements (FR-C6, FR-C7, FR-ORG1, FR-P9)
2. Update UX specification with coach acceptance and request flows
3. Update data architecture section with new tables/fields
4. Review Phase 1 scope to ensure coach workflows are included
5. Create detailed wireframes for new flows

---

## Additional Decisions from Deep Review (January 14, 2026)

### 12. Multi-Guardian Authority

**Decision:** Any guardian with parental responsibility can modify sharing

**Details:**
- Any guardian with `hasParentalResponsibility: true` can enable, modify, or revoke sharing
- ALL guardians with parental responsibility are notified of any sharing changes
- No "primary guardian" concept for sharing authority - equal rights
- This respects shared custody arrangements and modern family structures

**Implementation:**
- When sharing is modified, send notification to all linked guardians (except the one who made the change)
- Notification includes: what changed, who changed it, option to review/modify
- Audit log captures which guardian made each change

---

### 13. Historical vs Forward Data

**Decision:** Historical + Forward data visible

**Details:**
- When sharing is enabled, coaches can see FULL development history from the source organization
- This includes: past assessments, historical goals, previous coach notes, injury history
- Provides maximum context for coaching
- Clear explanation to parents during consent: "Coaches will see Jamie's full development history from [Club Name]"

**Rationale:** Historical data is essential for meaningful coaching context. Forward-only would make the feature far less valuable.

---

### 14. Age 18 Transition

**Decision:** Auto-pause for player review

**Details:**
- On player's 18th birthday:
  1. All active shares are automatically PAUSED (not revoked)
  2. Control transfers from parent to player
  3. Player receives notification to review their sharing status
  4. Player must confirm, modify, or revoke each existing share
  5. Parent retains read-only access to audit log for previously shared data
- Shares remain paused until player takes action
- Coaches are notified that shares are "pending player review"

**Implementation:**
- New player status: `ageVerified18Plus: boolean`
- Scheduled job checks for players turning 18 daily
- Transition workflow similar to initial consent flow but showing existing shares

---

### 15. Coach Acceptance Scope

**Decision:** Org-level acceptance

**Details:**
- One coach accepts a share → ALL coaches at that organization with appropriate team assignments can view
- Simplifies workflow; matches how organizations typically operate
- Acceptance is stored at organization level, not individual coach level

**Combined with Decision 20 (Team Scoping):** While acceptance is org-level, VIEW access is team-scoped. So acceptance unlocks access for the org, but only coaches assigned to the player's team(s) can actually view.

---

### 16. Quick Share Option

**Decision:** Build as feature flag for A/B testing, but ensure full GDPR coverage

**Details:**
- Implement "Quick Setup" option alongside "Custom Setup"
- Quick Setup: Full passport, all enrolled orgs, 1 year, 2-3 clicks
- Must still show key consent acknowledgments (what's shared, who can see, how to revoke)
- Feature flag controls visibility - can A/B test adoption vs engagement
- Default: Custom Setup (full flow) - Quick Share disabled initially

**GDPR Compliance for Quick Share:**
- Still requires explicit action (not pre-selected)
- Shows summary of what will be shared
- Links to full terms
- Confirms duration and revocation rights
- Records same consent receipt as full flow

---

### 17. Youth Voice (14-17)

**Decision:** Defer to future phase

**Details:**
- For MVP, parents have full control until player turns 18
- Future phase: Allow players 14+ to view (read-only) what's being shared about them
- Future phase: Possibly allow players 14+ to request changes (parent still approves)

---

### 18. Pricing

**Decision:** Core feature for all organizations

**Details:**
- Passport Sharing is included in all plans
- Drives network effects and platform adoption
- AI Insights could be premium add-on in future (but basic insights included)

---

### 19. Guardian Notifications

**Decision:** Always notify all guardians

**Details:**
- When any guardian modifies sharing, ALL other guardians with parental responsibility are notified
- Notification includes: what changed, who made the change, date/time
- Prevents one parent making changes without other's knowledge
- Supports transparency in shared custody situations

---

### 20. Team-Scoped Access

**Decision:** Coaches only see shares for players on their assigned teams

**Details:**
- Acceptance happens at org level
- But VIEW access is filtered to players on coach's assigned team(s)
- If coach is assigned to U14 Boys, they only see shares for U14 Boys players
- Head coach / Director of Football roles could have org-wide access (role-based)

**Implementation:**
- Query filters shared passports by coach's team assignments
- Special handling for roles that span teams (e.g., club administrator)

---

### 21. Re-offer After Decline

**Decision:** Immediate re-offer allowed with context

**Details:**
- Parent can re-offer immediately after coach decline
- Coach sees badge: "Previously declined on [date]"
- Prevents endless spam: after 3 declines for same share, cooling-off period required
- Parent can modify the share (add/remove elements) before re-offering

---

### 22. Request Expiry

**Decision:** 14 days

**Details:**
- Coach requests auto-expire after 14 days
- Parent can dismiss early if not interested
- Coach can re-request after expiry
- Prevents requests lingering indefinitely

---

### 23. Trial Organization Sharing

**Decision:** Allow sharing with any organization on platform

**Details:**
- Parents can share passport with clubs where child isn't enrolled
- Useful for trials, transfers, multi-club scenarios
- Show warning: "Jamie is not currently enrolled at [Club]. Are you sure?"
- Share still requires coach acceptance at receiving org

---

### 24. Notes Shareability

**Decision:** Add shareable flag to notes, default OFF

**Details:**
- Add `isShareable: boolean` field to coach notes
- Default: `false` (not shareable)
- Coach explicitly toggles "Share with other clubs" when creating/editing notes
- Only shareable notes included in passport sharing
- Private coaching notes remain private by default

**Schema Change:**
```typescript
// Add to passportGoals or wherever coach notes are stored
isShareable: v.optional(v.boolean()), // Default false
markedShareableAt: v.optional(v.number()),
markedShareableBy: v.optional(v.string()),
```

---

### 25. Coach Mobility (Team Changes)

**Decision:** Team-scoped access handles this automatically

**Details:**
- Since access is team-scoped (Decision 20), when a coach moves teams:
  - They automatically lose access to shares for players not on their new team
  - They automatically gain access to shares for players on their new team
  - No manual re-acceptance needed
- If coach leaves organization entirely:
  - They lose all access immediately (membership ends)
  - Share remains active at org level for other coaches

**Edge Cases:**
- If a coach is the ONLY coach at an org, and they leave, share becomes "pending acceptance"
- Parent is notified: "No active coach at [Org] - sharing paused"

---

### 26. Data Freshness Indicator

**Decision:** Show timestamp with stale data warning

**Details:**
- Display "Last updated: [date]" on all shared sections
- Amber warning if no updates in 6+ months: "This data hasn't been updated recently"
- Helps coaches understand data currency
- Encourages source orgs to keep data current

---

### 27. Source Organization Departure

**Decision:** Auto-pause with notification

**Details:**
- If source organization becomes inactive or leaves platform:
  - All shares FROM that org are automatically PAUSED
  - Parent receives notification: "Sharing from [Org] has been paused because the organization is no longer active"
  - Receiving coaches see: "Data from [Org] is no longer available - source organization inactive"
- Data is NOT deleted - just not visible
- If org reactivates, parent can re-enable sharing

---

### 28. Safeguarding Access

**Decision:** Platform staff can access with documented process

**Details:**
- Platform staff can export sharing audit trails for safeguarding investigations
- Requires:
  - Documented case reference
  - Reason for access
  - Authorized by designated safeguarding lead
  - All access independently audited
- Covered in platform Terms of Service and Privacy Policy
- Notify parents if legally permissible

---

### 29. Rollout Strategy

**Decision:** Feature flag gradual rollout

**Details:**
- Phase 1: Internal testing (2 weeks)
- Phase 2: Feature flag to 5% of orgs (monitoring)
- Phase 3: Expand to 25%, then 50%, then 100%
- Rollback capability at each stage
- Monitor key metrics: consent completion rate, coach acceptance rate, error rates

---

### 30. MVP Scope Confirmation

**Decision:** Full Phase 1 as documented, including cross-org parent dashboard as stretch

**Details:**
- **Must Have:**
  - Parent consent flow (enable/revoke/renew)
  - Coach shared passport view with acceptance workflow
  - Coach request-to-share workflow
  - Access audit log
  - Admin statistics dashboard

- **Stretch Goal:**
  - Cross-org parent dashboard

- **Phase 2:**
  - Full AI insights engine
  - Advanced analytics
  - Public share tokens

---

## Summary of All 30 Decisions

| # | Decision Area | Choice |
|---|---------------|--------|
| 1 | Data Attribution | Show org name + public contact |
| 2 | Coach Acceptance | Per-player, two-way consent |
| 3 | Request Workflow | Include coach request feature |
| 4 | Future Orgs | Require re-consent |
| 5 | AI Automation | Fully automated with review |
| 6 | Sensitive Data | Medical + Contact + Private Notes |
| 7 | Admin Control | Parent-only (key USP) |
| 8 | Player Departure | Auto-pause with notification |
| 9 | Notifications | Fully customizable |
| 10 | Org Contact | Admin chooses direct or form |
| 11 | MVP Scope | Full Phase 1 + stretch |
| 12 | Multi-Guardian | Any guardian can modify |
| 13 | Data Scope | Historical + Forward |
| 14 | Age 18 Transition | Auto-pause for review |
| 15 | Coach Acceptance Scope | Org-level |
| 16 | Quick Share | Feature flag for A/B |
| 17 | Youth Voice | Defer to future |
| 18 | Pricing | Core feature for all |
| 19 | Guardian Notifications | Always notify all |
| 20 | Team Scoping | Team-scoped access |
| 21 | Re-offer Timing | Immediate with context |
| 22 | Request Expiry | 14 days |
| 23 | Trial Orgs | Allow any org |
| 24 | Notes Shareability | Flag, default OFF |
| 25 | Coach Mobility | Team-scoped handles it |
| 26 | Freshness | Timestamp + stale warning |
| 27 | Org Departure | Auto-pause, notify |
| 28 | Safeguarding | Staff access with docs |
| 29 | Rollout | Feature flag gradual |
| 30 | MVP Scope | Confirmed full Phase 1 |

---

**End of Decisions Log**
