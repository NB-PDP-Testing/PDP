# Passport Sharing Feature - Current State Analysis

**Date**: January 14, 2026
**Purpose**: Comprehensive review of existing passport sharing capabilities and architecture
**Status**: Foundation 40% Built - Core Feature NOT Implemented

---

## Executive Summary

PlayerARC has a **strong architectural foundation** for cross-organization passport sharing, but the **actual sharing feature is only partially implemented**. The platform has:

- ✅ **Platform-level identity system** (players & guardians exist across orgs)
- ✅ **Consent mechanism** (`consentedToSharing` field in guardian-player links)
- ✅ **PDF export & native sharing** (email, WhatsApp, device share)
- ❌ **No cross-org passport viewing** (queries are still org-scoped)
- ❌ **No guardian consent UI** (can't control sharing preferences)
- ❌ **No unified parent dashboard** (can't see children across multiple orgs)

**Bottom Line**: The schema and architecture support the feature, but the **business logic and UI are not implemented**.

---

## 1. Key USP/Value Proposition

From blog content and architecture docs:

> **"Digital player development passports that follow athletes throughout their journey"**

### Problem Being Solved:
- **Lack of Development Continuity**: When players transition between clubs, coaches lose visibility into prior development
- **Multi-Sport Tracking**: Players participating in multiple sports need holistic development view
- **Parent Frustration**: Managing multiple club systems, no unified view of child's progress

### Solution:
- **Cross-Organization Passport Sharing**: Parents control which clubs can see their child's development data
- **Coach Insights**: Coaches get relevant insights from player's development in other sports
- **Unified Parent View**: Parents see all children across all clubs in one place

---

## 2. Current Architecture (Schema & Backend)

### 2.1 Platform Identity System (✅ IMPLEMENTED)

**Purpose**: Players and guardians exist at platform level, independent of any single organization.

#### Tables (`packages/backend/convex/schema.ts`):

**`playerIdentities`** (Lines 236-276)
- Platform-level player records (no organizationId)
- Fields: firstName, lastName, dateOfBirth, gender, playerType
- Can have multiple `orgPlayerEnrollments` (one per club)

**`guardianIdentities`** (Lines 166-202)
- Platform-level guardian records (no organizationId)
- Fields: firstName, lastName, email, phone, address
- Verification status: unverified, email_verified, id_verified

**`guardianPlayerLinks`** (Lines 279-311) - **CRITICAL TABLE**
- N:M relationship between guardians and players
- **Key Field**: `consentedToSharing` (Boolean) - Line 298
  - **Purpose**: Guardian controls if this link is visible to other orgs
  - **Default**: `true` (new links allow sharing)
  - **Backend**: `updateLinkConsent()` mutation exists

**`orgPlayerEnrollments`** (Lines 314-363)
- Organization-scoped membership records
- Links: playerIdentityId → organizationId
- Contains: clubMembershipNumber, ageGroup, season, status

**Architecture Insight**:
```
Guardian (Platform Level)
    ├─ guardianPlayerLink (consentedToSharing: true)
    │       └─ Player (Platform Level)
    │              ├─ Enrollment → Org A (Club GAA)
    │              └─ Enrollment → Org B (Club Soccer)
    └─ guardianPlayerLink (consentedToSharing: false)
            └─ Player (Platform Level)
                   └─ Enrollment → Org C (Private)
```

---

### 2.2 Cross-Org Visibility Pattern (✅ IMPLEMENTED - Injuries Only)

**Reference Implementation**: `/packages/backend/convex/models/playerInjuries.ts`

#### How Injuries Handle Cross-Org Visibility:

**Schema Fields** (Lines 759-760):
```typescript
isVisibleToAllOrgs: v.boolean()
restrictedToOrgIds: v.optional(v.array(v.string()))
occurredAtOrgId: v.optional(v.string())
```

**Query Logic** (`getActiveInjuriesForOrg`, Lines 142-173):
```typescript
return injuries.filter((injury) => {
  if (injury.status === "healed") return false;

  // Global visibility
  if (injury.isVisibleToAllOrgs) return true;

  // Restricted list
  if (injury.restrictedToOrgIds?.includes(args.organizationId)) return true;

  // Origin org
  if (injury.occurredAtOrgId === args.organizationId) return true;

  return false;  // Hidden from this org
});
```

**This pattern CAN BE REPLICATED for passport data sharing.**

---

### 2.3 Guardian Permission System

#### Backend Functions (`packages/backend/convex/models/guardianPlayerLinks.ts`):

**`updateLinkConsent`** (Lines 396-424)
```typescript
export const updateLinkConsent = mutation({
  args: {
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),
    consentedToSharing: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Updates the consentedToSharing field
  }
});
```

**`createGuardianPlayerLink`** (Lines 226-305)
- **Default**: `consentedToSharing: true` (Line 301)
- Creates link between guardian and player
- Includes relationship type, primary status, parental responsibility

**Frontend**: ❌ No UI exists for guardians to manage this flag

---

## 3. Current Sharing Features (Implemented)

### 3.1 PDF Export & Native Sharing (✅ IMPLEMENTED)

**Location**: `/apps/web/src/app/orgs/[orgId]/players/[playerId]/components/share-modal.tsx`

#### Capabilities:
1. **PDF Generation** (`/apps/web/src/lib/pdf-generator.ts`)
   - Player profile (name, DOB, age group, sport, org)
   - Skills ratings with visual bars
   - Development goals with status
   - Coach notes
   - Training/match attendance
   - Medical summary (if applicable)
   - Footer: "Confidential - For authorized use only"

2. **Sharing Methods**:
   - ✅ Download PDF
   - ✅ Preview in new tab
   - ✅ Email share (native + mailto fallback)
   - ✅ WhatsApp share (native + URL scheme fallback)
   - ✅ Device native share API
   - ✅ Copy link (internal org URL, requires login)

**Limitation**: All methods require recipient to either:
- Download the PDF manually, OR
- Have login access to the organization

**No public/external viewing capability exists.**

---

### 3.2 Player Self-Access System (✅ IMPLEMENTED)

**Purpose**: Adult players (18+) can access their own passport with guardian approval.

**Location**: `/packages/backend/convex/models/playerSelfAccess.ts`

#### Tables:

**`playerAccessPolicies`** (Lines 1450-1481)
- Org-level settings: isEnabled, minimumAge, requireGuardianApproval
- Default visibility settings

**`playerAccessGrants`** (Lines 1483-1525)
- Per-player permissions
- Status: isEnabled
- Visibility overrides
- Notification preferences

**`playerAccountLinks`** (Lines 1528-1550)
- Links playerIdentityId to Better Auth userId
- Verification methods tracked

**`playerAccessLogs`** (Lines 1553-1583)
- Audit trail for player self-access actions

**Note**: This is for **players accessing their own data**, not cross-org sharing.

---

## 4. What's Missing (Not Implemented)

### 4.1 ❌ Cross-Org Passport Queries

**Current State**:
- All passport data queries are **org-scoped** only
- Queries take `organizationId` parameter and filter by it
- No queries that fetch passport data across organizations

**Example** - Skills query pattern:
```typescript
// Current (org-scoped)
export const getPlayerSkills = query({
  args: { playerId, organizationId },
  handler: async (ctx, args) => {
    return ctx.db
      .query("skillRatings")
      .withIndex("by_player_and_org", q =>
        q.eq("playerIdentityId", args.playerId)
         .eq("organizationId", args.organizationId)
      )
      .collect();
  }
});
```

**What's Needed**:
```typescript
// Needed (cross-org, consent-aware)
export const getSharedPlayerPassport = query({
  args: {
    playerIdentityId,
    requestingOrgId,
    requestingUserId
  },
  handler: async (ctx, args) => {
    // 1. Verify guardian link exists with consentedToSharing: true
    // 2. Verify requesting user is a coach in requestingOrgId
    // 3. Fetch passport data from ALL orgs (respecting visibility rules)
    // 4. Return aggregated passport data
  }
});
```

---

### 4.2 ❌ Guardian Consent Management UI

**Current State**:
- `consentedToSharing` field exists in database
- Backend mutation `updateLinkConsent()` exists
- **NO FRONTEND UI** for guardians to manage this

**Location to Build**: `/apps/web/src/app/orgs/[orgId]/parents/components/`

**What's Needed**:
- Toggle for each child: "Share [Child Name]'s passport with other organizations"
- Explanation of what sharing includes/excludes
- List of orgs that can currently see shared data
- Option to restrict to specific orgs (like injuries model)

---

### 4.3 ❌ Cross-Org Parent Dashboard

**Current State**:
- Parent dashboard is **org-scoped**: `/orgs/[orgId]/parents`
- Parents must switch organizations to see different children
- No unified view across all enrollments

**What's Needed**:
- Platform-level parent dashboard: `/parent/dashboard` or `/parents`
- Show ALL children across ALL organizations in one view
- Quick switcher to navigate to specific org/child
- Unified activity feed across all children

**Reference**: Parent dashboard currently at `/apps/web/src/app/orgs/[orgId]/parents/page.tsx`

---

### 4.4 ❌ Public/External Share Links

**Current State**:
- Share modal only creates PDFs or opens native share
- "Copy Link" button copies org-scoped URL (requires login)
- No public viewing capability

**What's Needed**:

#### Table: `passportShareTokens`
```typescript
passportShareTokens: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  token: v.string(),  // UUID for URL
  createdBy: v.string(),  // Guardian userId
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),

  // Visibility controls
  visibleSections: v.array(v.string()),  // ["skills", "goals", "notes"]
  restrictedToEmails: v.optional(v.array(v.string())),

  // Analytics
  viewCount: v.number(),
  lastViewedAt: v.optional(v.number()),

  // Status
  isRevoked: v.boolean(),
})
```

#### Public Route:
- `/passport/shared/[token]` - No auth required
- Shows limited passport data based on `visibleSections`
- Tracks views, enforces expiry
- Watermarked as "Shared Passport - Limited View"

---

### 4.5 ❌ Share Analytics & Management

**What's Needed**:
- Track who viewed shared passports (IP, timestamp)
- Show guardians: "Your passport has been viewed 5 times this week"
- Ability to revoke active shares
- Expiration date management
- Email notifications on share events

---

## 5. Documentation Found

### 5.1 Architecture Documents

**`docs/architecture/player-passport.md`** (Lines 432-479)
- Cross-org visibility design with consent controls
- Data ownership matrix
- Guardian consent flags
- Platform identity system rationale

**`docs/architecture/identity-system.md`** (Lines 466-544)
- `guardianPlayerLinks.consentedToSharing` field specification
- `updateLinkConsent` mutation design
- Cross-organization data isolation principles

### 5.2 Test Specifications (Not Implemented)

**`docs/archive/testing/master-test-plan.md`** (Lines 1859-1877)

**TEST-ACCESS-TOKEN-001: Player Access Token**
- Objective: Verify shareable passport link generation
- Expected: Token generated, link shareable, expiry configurable

**TEST-ACCESS-PUBLIC-001: Public Passport View**
- Objective: Verify passport viewable via token
- Expected: Displays without login, limited data shown, no edit capabilities

**Status**: Tests defined, feature NOT built.

### 5.3 Outstanding Features

**`docs/status/outstanding-features.md`**
- Platform identity migration listed as planned but not started
- No explicit mention of cross-org passport sharing

---

## 6. Implementation Roadmap Recommendation

### Phase 1: Foundation (Estimated: 2-3 sprints)

**Goal**: Enable cross-org passport viewing for consented players

1. **Cross-Org Query Implementation**
   - [ ] Create `getSharedPlayerPassport()` query
   - [ ] Respect `consentedToSharing` flag in query logic
   - [ ] Add permission checks (requesting user must be coach)
   - [ ] Return aggregated passport data from all orgs

2. **Guardian Consent UI**
   - [ ] Add consent toggle to parent settings
   - [ ] Show which orgs can see shared data
   - [ ] Explanation modal (what's shared, what's not)
   - [ ] Persist consent changes via `updateLinkConsent()`

3. **Coach View of Shared Passports**
   - [ ] Add "Shared Players" section to coach dashboard
   - [ ] Show players from other orgs (where consent granted)
   - [ ] Display passport data with "Shared from [Org Name]" badge
   - [ ] Read-only view (no editing cross-org data)

### Phase 2: Enhanced Sharing (Estimated: 2-3 sprints)

**Goal**: Public share links and unified parent view

4. **Public Share Token System**
   - [ ] Create `passportShareTokens` table
   - [ ] Implement `generateShareToken()` mutation
   - [ ] Build public passport view route (`/passport/shared/[token]`)
   - [ ] Add token validation, expiry, revocation logic

5. **Share Management UI**
   - [ ] Add "Share Passport" option in parent dashboard
   - [ ] Configurable sections (choose what to share)
   - [ ] Set expiration date
   - [ ] View active shares and revoke

6. **Cross-Org Parent Dashboard**
   - [ ] Create `/parents` or `/parent/dashboard` route
   - [ ] Show all children across all organizations
   - [ ] Unified activity feed
   - [ ] Quick navigation to org-specific views

### Phase 3: Analytics & Advanced Features (Estimated: 1-2 sprints)

7. **Share Analytics**
   - [ ] Track share views (who, when, from where)
   - [ ] Display analytics to guardians
   - [ ] Email notifications on share events

8. **Advanced Visibility Controls**
   - [ ] Restrict shares to specific organizations (like injuries)
   - [ ] Time-limited shares (auto-expire)
   - [ ] QR code generation for mobile sharing
   - [ ] Share via SMS with token link

---

## 7. Technical Considerations

### 7.1 Data Privacy & Security

**Consent Required**: Never show cross-org data without explicit guardian consent

**Ownership Rules** (from architecture docs):
- Club A **CANNOT** see Club B's assessments (org-owned data)
- Club A **CAN** see player's platform-level profile (if consented)
- Club A **CAN** see aggregated skills/goals (if consented)
- Club A **CANNOT** edit any data from Club B

**Audit Trail**:
- Log all cross-org data access
- Show guardians who viewed their child's passport
- Compliance with GDPR/data protection regulations

### 7.2 Performance Considerations

**Query Optimization**:
- Cross-org queries will be more expensive (no single org index)
- Consider caching shared passport views
- Implement pagination for long activity histories

**Database Indexes Needed**:
```typescript
// Already exists
guardianPlayerLinks
  .index("by_guardian_and_player", ["guardianIdentityId", "playerIdentityId"])
  .index("by_player", ["playerIdentityId"])

// May need to add
guardianPlayerLinks
  .index("by_player_and_consent", ["playerIdentityId", "consentedToSharing"])
```

### 7.3 UI/UX Design Questions

**Questions to Answer**:
1. Should shared passport show org names or be anonymized?
2. How granular should visibility controls be? (per-section vs all-or-nothing)
3. Should coaches be notified when new shared players appear?
4. Should parents see which coaches viewed their child's passport?
5. What happens when a player leaves an organization? Does shared data persist?

---

## 8. Gap Analysis Summary

| Feature Component | Status | Effort | Priority |
|-------------------|--------|--------|----------|
| Platform Identity System | ✅ Built | - | - |
| Consent Flag (Schema) | ✅ Built | - | - |
| Consent Mutation (Backend) | ✅ Built | - | - |
| Cross-Org Query Logic | ❌ Not Built | Medium | **HIGH** |
| Guardian Consent UI | ❌ Not Built | Medium | **HIGH** |
| Coach Shared Players View | ❌ Not Built | Medium | **HIGH** |
| Cross-Org Parent Dashboard | ❌ Not Built | Large | Medium |
| Public Share Tokens (Schema) | ❌ Not Built | Medium | Medium |
| Public Share Token Generation | ❌ Not Built | Medium | Medium |
| Public Passport View Route | ❌ Not Built | Medium | Medium |
| Share Analytics | ❌ Not Built | Small | Low |
| Advanced Visibility Controls | ❌ Not Built | Medium | Low |

---

## 9. Next Steps for Ideation

### Questions to Explore:

1. **Scope Definition**
   - Is public sharing (via tokens) required for MVP, or only coach-to-coach cross-org viewing?
   - Should parents have a unified dashboard, or is per-org sufficient for now?

2. **User Flows**
   - Map the end-to-end flow: Guardian enables sharing → Coach A sees player from Coach B's org → Coach A views shared passport
   - Define what data should/shouldn't be visible in shared view

3. **Privacy & Compliance**
   - What's the legal/regulatory framework for sharing youth athlete data?
   - Do we need explicit guardian consent per viewing organization, or blanket consent?

4. **Business Logic**
   - Should guardians be able to restrict sharing to specific orgs?
   - What happens when a player leaves an org? Does their data remain visible to former coaches?
   - Should there be a "request to view" workflow where coaches request access and guardians approve?

5. **MVP vs Full Feature**
   - **MVP**: Cross-org viewing for consented players, guardian consent UI
   - **Full**: Public share links, unified parent dashboard, analytics, QR codes

---

## 10. Key Files Reference

### Schema
- `packages/backend/convex/schema.ts` (Lines 166-363)
  - playerIdentities, guardianIdentities, guardianPlayerLinks, orgPlayerEnrollments

### Backend Functions
- `packages/backend/convex/models/guardianPlayerLinks.ts` (Lines 226-424)
  - createGuardianPlayerLink, updateLinkConsent
- `packages/backend/convex/models/playerInjuries.ts` (Lines 142-173)
  - Reference implementation for cross-org visibility

### Frontend Components
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/share-modal.tsx`
  - Current PDF sharing implementation
- `apps/web/src/lib/pdf-generator.ts`
  - PDF generation logic
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
  - Current parent dashboard (org-scoped)

### Documentation
- `docs/architecture/player-passport.md` (Lines 432-479)
- `docs/architecture/identity-system.md` (Lines 466-544)
- `docs/archive/testing/master-test-plan.md` (Lines 1859-1877)

---

## Conclusion

**The foundation is solid**, but the feature is only **40% implemented**. The platform has the architectural pieces in place (platform identities, consent flags, cross-org visibility patterns), but the **critical business logic and UI are missing**.

**Biggest Gap**: No queries or UI that actually use the `consentedToSharing` flag to enable cross-org passport viewing.

**Recommended Next Step**: Define the MVP scope and user flows, then prioritize Phase 1 implementation (cross-org queries + guardian consent UI + coach shared view).

---

**End of Current State Analysis**
