# Issue #17 Update: Parent Notification System

**Date**: January 23, 2026
**Updated by**: Claude (via automated session)

---

## Current State Assessment

### Features from Original Issue

| Feature | Status | Notes |
|---------|--------|-------|
| Notify parents when insights applied | ✅ PARTIAL | Via Coach Parent Summaries system |
| Injury notifications (always on) | ✅ PARTIAL | Injury insights create summaries |
| Review due reminders | ❌ Not Started | Not yet implemented |
| In-app notification center | ❌ Not Started | No bell icon/notification list |

---

## What HAS Been Implemented

### Coach Parent Summaries System

A comprehensive system for notifying parents about their child's progress has been built:

**Key Files:**
- `packages/backend/convex/models/coachParentSummaries.ts`
- `packages/backend/convex/actions/coachParentSummaries.ts`
- `apps/web/src/app/orgs/[orgId]/parent/dashboard/`

**Features:**
- AI-generated summaries from voice note insights
- Category-specific styling (injury = red, behavioral = orange)
- Parent acknowledgment system
- Coach name and avatar display
- Unread/read status tracking

### Trust-Based Summary Generation

Summaries are triggered based on coach trust level:

| Trust Level | Behavior |
|-------------|----------|
| 0-2 | Summaries require manual review before sending |
| 3 | Auto-generate and send parent summaries |

**Important**: Injury and behavioral insights ALWAYS require human review before generating parent summaries, regardless of trust level.

### Parent Dashboard Integration

Parents see:
- Child summary cards on their dashboard
- Coach updates in player passport
- Acknowledgment buttons to confirm they've seen updates
- Unread indicators for new summaries

---

## What's Still Needed

### 1. In-App Notification Center
```
Bell icon with notification list
```
- Centralized notification hub
- Badge count for unread items
- Quick navigation to related content
- Mark all as read functionality

### 2. Email Notifications
```
Email alerts for important updates
```
- Injury alerts (immediate)
- Weekly digest of updates
- Configurable preferences per parent

### 3. Review Due Reminders
```
Alert parents about upcoming reviews
```
- Connect to performance review scheduling
- Push notification support (future)

### 4. WhatsApp Notifications to Parents
```
Send summaries via WhatsApp (future)
```
- Leverage existing Twilio WhatsApp integration
- Would require parent phone number collection
- Opt-in consent required

---

## Connection to Voice Notes System

The voice notes system now directly feeds into parent notifications:

```
Coach Voice Note → AI Transcription → Insights Extracted
                                           ↓
                              Trust Level Check
                                           ↓
                    ┌──────────────────────┴──────────────────────┐
                    ↓                                              ↓
            Level 0-2: Manual Review                    Level 3: Auto-Apply
                    ↓                                              ↓
            Coach Reviews & Approves                    Insight Auto-Applied
                    ↓                                              ↓
            Generate Parent Summary                     Generate Parent Summary
                    ↓                                              ↓
                         Parent Sees in Dashboard/Passport
```

### NEW: WhatsApp Voice Notes

Coaches can now submit voice notes via WhatsApp, which flow through the same pipeline:
- WhatsApp message → Transcription → Insights → Parent Summary
- Full documentation: `docs/features/whatsapp-integration.md`

---

## Related Issues

- **#247** - VoiceNote Comprehensive Enhancement (insight source)
- **#15** - Voice Notes UX Enhancements (coach-side improvements)
- **#242** - Parent-Coach Communication (bidirectional messaging)

---

## Technical Implementation Notes

### Current Parent Summary Schema
```typescript
coachParentSummaries: defineTable({
  organizationId: v.string(),
  playerId: v.id("playerIdentities"),
  coachId: v.string(),
  coachName: v.string(),
  category: v.string(),  // skill_progress, injury, behavior, etc.
  title: v.string(),
  summary: v.string(),
  sourceInsightIds: v.array(v.string()),
  status: v.union(...),  // draft, pending_review, sent, acknowledged
  sentAt: v.optional(v.number()),
  acknowledgedAt: v.optional(v.number()),
  // ... more fields
})
```

### Indexes for Efficient Queries
```
coachParentSummaries:
- by_playerId
- by_organizationId
- by_status
- by_coachId
```

### Parent Dashboard Query
```typescript
// Get summaries for parent's children
getParentSummaries({ parentUserId, organizationId })
```

---

## Recommendations for Next Steps

1. **Build notification center UI** - Bell icon in header, dropdown with recent notifications
2. **Add email integration** - SendGrid or Resend for transactional emails
3. **Create notification preferences** - Let parents control what/how they're notified
4. **Consider push notifications** - For mobile app (future phase)
