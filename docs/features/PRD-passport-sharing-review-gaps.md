# Passport Sharing PRD - Comprehensive Review & Gaps Analysis

**Review Date:** January 14, 2026
**Reviewer:** Deep Analysis Pass
**Status:** Requires Stakeholder Input

---

## Executive Summary

After thorough review of the PRD, UX Specification, and Decisions Log, I've identified **23 gaps or areas requiring clarification** across 7 categories. This document captures these for stakeholder discussion before finalizing the PRD.

---

## 1. Guardian Authority & Family Complexity

### Gap 1.1: Multiple Guardians
**Current State:** PRD assumes single decision-maker per child
**Issue:** Many children have multiple guardians (both parents, step-parents, grandparents as primary caregivers)

**Questions:**
- When a child has multiple guardians with `hasParentalResponsibility: true`, who can enable/modify/revoke sharing?
- If Parent A enables sharing and Parent B wants to revoke it, whose decision wins?
- Should there be a "primary guardian" concept specifically for sharing authority?
- What about notification to non-primary guardians when sharing is modified?

**Recommendation:** Consider one of these models:
- **Option A (Any guardian):** Any guardian with parental responsibility can modify sharing; all others are notified
- **Option B (Primary only):** Only primary guardian can modify; others can only view
- **Option C (Consensus):** Both guardians must agree (more protective, but friction)

### Gap 1.2: Divorced/Separated Parents
**Issue:** Divorced parents may have different views on data sharing, potentially using it as a conflict point

**Questions:**
- How do we prevent sharing being weaponized in custody disputes?
- Should there be a mechanism for flagging disagreement?
- What if one parent enrolls child at a new club and enables sharing without other parent's knowledge?

### Gap 1.3: Non-Parent Guardians
**Issue:** Foster parents, legal guardians, grandparents as primary caregivers have different legal standing

**Questions:**
- Do foster parents have sharing authority?
- What documentation/verification is needed for non-parent guardians?
- Should there be different consent flows for different guardian types?

---

## 2. Player Age Transitions

### Gap 2.1: Turning 18 Transition
**Current State:** PRD mentions adult players (18+) have self-control, but doesn't address transition

**Questions:**
- When a player turns 18, does control automatically transfer to them?
- Is there a transition workflow? (e.g., "You're now 18, review your sharing settings")
- What happens to existing shares when player turns 18?
  - Auto-continue? Auto-revoke? Require player confirmation?
- Are parents notified when control transfers?

**Recommendation:** Add explicit transition flow:
1. Player approaches 18th birthday → Notification to both player and parent
2. On 18th birthday → Control transfers, all shares PAUSED pending player review
3. Player reviews and confirms/modifies/revokes each share
4. Parents retain read-only access to audit log for previously shared data

### Gap 2.2: 16-17 Year Old Agency
**Issue:** In some jurisdictions, 16-17 year olds have limited consent capability

**Questions:**
- Should players aged 16-17 have any visibility into what's being shared?
- Should they be able to request changes (even if parent makes final decision)?
- Could there be a "player voice" feature where older youth can see their sharing status?

---

## 3. Data Scope & Freshness

### Gap 3.1: Historical vs Forward Data
**Critical Question:** When sharing is enabled today, what data can the receiving coach see?

**Options:**
- **Option A (Historical + Forward):** All existing data plus future updates
- **Option B (Forward Only):** Only data created/updated after share enabled
- **Option C (Configurable):** Parent chooses during consent flow

**Questions:**
- If forward-only, does that include historical skill trends (which require past data)?
- What about injury history? If forward-only, coaches wouldn't see relevant past injuries
- How do we handle AI insights that need historical data?

**Recommendation:** Option A with clear explanation to parents ("Coaches will see Jamie's full development history from [Club Name]")

### Gap 3.2: Data Freshness Indicators
**Issue:** Shared data could become stale if source org stops updating

**Questions:**
- Should we show "last updated" timestamps on shared data?
- Should there be a warning if data hasn't been updated in X months?
- What if the source organization leaves the platform entirely?

**Recommendation:** Add freshness indicators:
- Show "Last updated: [date]" on all shared sections
- Amber warning if no updates in 6+ months
- If source org becomes inactive, notify parent and receiving coach

### Gap 3.3: Organization vs Team Scope
**Issue:** PRD is at organization level, but players may be on specific teams

**Questions:**
- If a player is on U14 Boys team, but org also has U14 Girls team, can U14 Girls coaches see shared data?
- Should sharing be scoped to specific teams within an org?
- What about coaches who work across multiple teams?

**Recommendation:** Keep at organization level for MVP (simpler), but add team-level scoping in future phase.

---

## 4. Coach & Staff Mobility

### Gap 4.1: Coach Moves to New Organization
**Issue:** If Coach Michael accepts a share at Club A, then moves to Club B, what happens?

**Questions:**
- Does Coach Michael retain access to previously accepted shares at new org?
- Should the share follow the coach or stay with the organization?
- How do parents get notified of coach changes?

**Recommendation:** Share stays with organization, not individual coach. When coach leaves:
1. Their acceptance is removed
2. A different coach at the org can re-accept
3. Or the share becomes inactive until re-accepted

### Gap 4.2: Temporary/Guest Coaches
**Issue:** Clubs sometimes have guest coaches for camps, workshops, trials

**Questions:**
- Can guest coaches access shared data?
- Should there be a concept of "temporary access" for trial periods?
- How do we prevent ex-coaches retaining access after leaving?

**Recommendation:** Access tied to `member` status in Better Auth. When membership ends, access automatically revokes. Guest coaches would need formal (temporary) membership.

---

## 5. Special Scenarios

### Gap 5.1: Trial/Guest Players
**Issue:** When a player trials at a new club, the club may want to see their development history before formal enrollment

**Questions:**
- Can parents share passport with clubs where child isn't yet enrolled?
- Should there be a "trial access" feature with limited scope and duration?
- How do we prevent clubs pressuring parents to share before trials?

**Recommendation:** Allow sharing with any organization on platform, but show clear warning: "Jamie is not currently enrolled at [Club]. Are you sure you want to share?"

### Gap 5.2: Emergency Medical Access
**Issue:** In a medical emergency during training/match, coaches may need medical info immediately

**Questions:**
- Should there be an emergency override for medical information?
- What constitutes an "emergency" and who can declare it?
- How do we prevent abuse of emergency access?

**Recommendation:** Consider separate "emergency medical access" feature (could be future phase):
- Parent pre-authorizes emergency medical access
- Any coach at enrolled orgs can view medical info in declared emergency
- All emergency access is logged with mandatory reason
- Parent notified immediately

### Gap 5.3: Safeguarding & Child Protection
**Issue:** In safeguarding investigations, authorities may need access to sharing records

**Questions:**
- Who can access sharing audit trails in safeguarding investigations?
- Can platform staff share data with authorities?
- How do we balance privacy with child protection obligations?

**Recommendation:** Add platform staff capability:
- "Safeguarding export" function for designated platform staff
- Requires documented reason and case reference
- All safeguarding access is independently audited
- Clear policy documented in terms of service

---

## 6. Technical & Operational Gaps

### Gap 6.1: Multi-Coach Acceptance (Flagged in Decisions - Unresolved)
**Question:** If Org A has 5 coaches, and one coach accepts a share:
- Can all 5 coaches now view the data?
- Or does each coach need to individually accept?

**Recommendation:** One acceptance per organization. Any coach with appropriate role can accept. Once accepted, all coaches at that org can view. Simpler and matches how orgs typically operate.

### Gap 6.2: Re-offer Timing After Decline (Flagged in Decisions - Unresolved)
**Question:** If Coach declines a share, how long before parent can re-offer?

**Options:**
- Immediate (coach can just decline again if still unwanted)
- 7 days
- 30 days
- Until parent modifies the share (adds/removes elements)

**Recommendation:** Immediate re-offer allowed, but coach sees "Previously declined on [date]" badge. This respects parent autonomy while giving coach context.

### Gap 6.3: Request Expiry (Flagged in Decisions - Unresolved)
**Question:** How long do coach requests remain pending?

**Recommendation:** 14 days, then auto-expire. Coach can re-request after expiry. Parent can dismiss early if not interested.

### Gap 6.4: Migration from Existing System
**Issue:** The existing `guardianPlayerLinks.consentedToSharing` field needs to be reconciled

**Questions:**
- Is the existing field a "master switch" that gates the new granular system?
- Or is it deprecated in favor of the new `passportShareConsents` table?
- What about existing users who already have `consentedToSharing: true`?

**Recommendation:**
- Existing field becomes legacy/deprecated
- Migration: Users with `consentedToSharing: true` get prompted to set up new granular sharing
- Users with `consentedToSharing: false` see new sharing as opt-in opportunity
- Don't auto-migrate - require explicit new consent

### Gap 6.5: Coach Notes - Public vs Private
**Issue:** PRD mentions "public notes only" for coach notes sharing, and decisions say "private notes" are sensitive. But what defines public vs private?

**Questions:**
- Is there currently a flag on coach notes distinguishing public/private?
- If not, do we need to add one?
- What's the default - public or private?

**Recommendation:** Check existing notes schema. If no public/private flag exists, add one:
- Default: Private (more protective)
- Coach explicitly marks notes as "shareable" if they want them visible to other orgs
- Only "shareable" notes included in passport sharing

---

## 7. Business & Adoption Gaps

### Gap 7.1: Network Seeding Problem
**Issue:** First organizations to adopt have no one to share with, reducing initial value

**Questions:**
- What's the go-to-market strategy for building the network?
- Should we partner with specific federations (GAA, FAI, etc.) for critical mass?
- Are there marquee clubs we should onboard first?

**Recommendation:** Consider:
- Launch in specific geographic region with concentrated clubs
- Partner with county/regional boards who oversee multiple clubs
- Offer incentives for early adopter organizations
- Feature works both ways - even single-org parents get value from future-proofing

### Gap 7.2: Pricing/Monetization
**Question:** Is passport sharing:
- Core functionality (included in all plans)
- Premium feature (paid tier only)
- Freemium (basic sharing free, AI insights premium)

**Recommendation:** Core functionality to drive network effects. Consider AI insights as premium add-on.

### Gap 7.3: Rollout Strategy
**Issue:** No rollout plan in PRD

**Questions:**
- Phased rollout by geography? Organization size? Sport?
- Beta testing with select orgs first?
- Feature flags for gradual enablement?

**Recommendation:** Add rollout section to PRD:
1. Internal testing (2 weeks)
2. Closed beta with 5-10 partner organizations (4 weeks)
3. Open beta with all organizations (4 weeks)
4. General availability

### Gap 7.4: Support & Training
**Issue:** No mention of support burden or training materials

**Questions:**
- What training do parents/coaches/admins need?
- What's the expected support volume?
- Should there be in-app help/tutorials?

**Recommendation:** Plan for:
- In-app onboarding tooltips
- Help center articles for each user type
- Video tutorial (2-3 minutes) for parents
- Admin guide for club administrators
- Support playbook for support team

---

## 8. UX Refinements

### Gap 8.1: Quick Share Option
**Issue:** Current flow is 5-6 screens, which may be too long for busy parents on mobile

**Question:** Should there be a "quick share" option?
- One-click share everything with all enrolled orgs for 1 year
- With ability to customize later

**Recommendation:** Add "Quick Setup" vs "Custom Setup" choice on first screen:
- Quick Setup: Full passport, all enrolled orgs, 1 year (2 clicks total)
- Custom Setup: Full 5-screen flow

### Gap 8.2: Flow Abandonment & Resume
**Issue:** What if parent abandons consent flow mid-way?

**Questions:**
- Is there a draft state?
- Can parent resume later?
- How long is draft retained?

**Recommendation:** Save draft state for 7 days. On return, ask "Resume where you left off?" or "Start over?"

### Gap 8.3: Localization
**Issue:** No mention of multi-language support

**Questions:**
- What languages are needed for launch?
- Are consent documents available in multiple languages?
- What about date/time formats for different locales?

**Recommendation:** English for MVP. Plan for Irish, Polish (significant communities) in future phase.

---

## Summary: Questions for Stakeholder

### Must Decide Before Development

1. **Multi-guardian authority:** Who can modify sharing when multiple guardians exist?
2. **Historical data:** Can coaches see historical data or only forward?
3. **Multi-coach acceptance:** One acceptance per org or per coach?
4. **18th birthday transition:** Auto-transfer, auto-revoke, or auto-pause?
5. **Quick share option:** Include in Phase 1?

### Can Decide During Development

6. **Re-offer timing:** How long after decline before re-offer allowed?
7. **Request expiry:** 7, 14, or 30 days?
8. **Coach notes public/private:** How is this currently handled?
9. **Migration strategy:** How to handle existing `consentedToSharing` users?

### Can Defer to Future Phase

10. **16-17 player voice:** Let older youth see their sharing status?
11. **Emergency medical access:** Override mechanism for emergencies?
12. **Team-level scoping:** Allow org-level for MVP, team-level later?
13. **Trial player access:** Allow sharing with non-enrolled orgs?
14. **Localization:** Non-English language support?

### Business Decisions Needed

15. **Pricing:** Core or premium feature?
16. **Rollout strategy:** Phased or big bang?
17. **Network seeding:** Partner with federations?

---

## Recommended PRD Updates

Based on this review, the following sections should be added/updated:

1. **Section 4.1:** Add guardian complexity scenarios to personas
2. **Section 6.1:** Add FR-P10 for multi-guardian handling
3. **Section 6.1:** Add FR-P11 for 18th birthday transition
4. **Section 7.2:** Update schema for multi-guardian tracking
5. **Section 8:** Add data scope clarification (historical vs forward)
6. **Section 13:** Add safeguarding access capabilities
7. **Section 15:** Add rollout strategy section
8. **Section 18:** Add migration plan appendix
9. **UX Spec Section 3:** Add quick share flow option
10. **UX Spec Section 7:** Add flow abandonment handling

---

**End of Review Document**
