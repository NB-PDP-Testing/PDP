# PRD: Coach-to-Parent Messaging System

**Document Version:** 1.1
**Created:** January 11, 2026
**Updated:** January 11, 2026
**Status:** Refined - Ready for Implementation
**Author:** Product Team
**Target Release:** Q1 2026

---

## Executive Summary

This PRD defines a secure, auditable coach-to-parent messaging system that enables coaches to communicate directly with parents/guardians about their children's development, performance, and well-being. The system integrates with the existing voice notes infrastructure, allowing coaches to approve AI-generated insights for parent delivery, while also supporting direct text messages.

### Key Value Propositions

1. **Streamlined Communication** - Coaches can share observations with parents without leaving the platform
2. **Voice Note Integration** - Leverage existing AI-transcribed insights with parent approval workflow
3. **Audit Trail** - Full compliance and safeguarding through comprehensive message logging
4. **Parent Engagement** - Parents receive actionable feedback they can discuss with their child
5. **GDPR Compliant** - Built-in consent management and data retention policies

---

## Problem Statement

### Current Pain Points

1. **Fragmented Communication** - Coaches use WhatsApp, email, or in-person conversations with no central record
2. **No Audit Trail** - Safeguarding requirements demand documented communication, especially for youth sports
3. **Voice Notes Underutilized** - AI insights from voice notes don't flow to parents who would benefit most
4. **Inconsistent Updates** - Some parents get detailed feedback; others get nothing
5. **Time Burden** - Coaches spend excessive time on individual parent communications

### Opportunity

The platform already has:
- Voice notes with AI insight extraction
- Guardian identity system linking parents to players
- Flow/notification infrastructure for alerts and announcements
- Email delivery via Resend API
- Comprehensive audit logging patterns

This feature unifies these capabilities into a purpose-built coach-to-parent communication channel.

---

## Codebase Integration Analysis

### Existing Infrastructure to Leverage

| Component | File Location | Usage |
|-----------|---------------|-------|
| **Parent messages placeholder** | `apps/web/src/app/orgs/[orgId]/parents/messages/page.tsx` | Existing route with "coming soon" - implement here |
| **Guardian identity hook** | `apps/web/src/hooks/use-guardian-identity.ts` | `useGuardianChildrenInOrg(orgId, userEmail)` returns guardian + children |
| **Coach assignments** | `packages/backend/convex/models/coaches.ts` | `getCoachAssignments()` returns teams array for access control |
| **Guardian-player links** | `packages/backend/convex/models/guardianPlayerLinks.ts` | `getGuardiansForPlayer()` to find message recipients |
| **Email templates** | `packages/backend/convex/utils/email.ts` | Follow `sendOrganizationInvitation()` pattern (Resend API) |
| **Audit logging** | `invitationEvents` table in schema | Copy pattern: eventType, performedBy, timestamp, changes |
| **Voice notes insights** | `packages/backend/convex/models/voiceNotes.ts:249-720` | Insight structure with playerIdentityId, category, status |
| **Flow system** | `packages/backend/convex/models/flows.ts` | For high-priority message alerts (modal/banner) |

### Critical Implementation Patterns

#### 1. Coach Access Verification
```typescript
// Must verify coach has assignment to player's team
const coachAssignment = await ctx.db
  .query("coachAssignments")
  .withIndex("by_user_and_org", (q) =>
    q.eq("userId", coachUserId).eq("organizationId", orgId)
  )
  .first();

// Check player's team is in coach's teams array
const playerTeam = await getPlayerTeam(ctx, playerIdentityId);
if (!coachAssignment?.teams.includes(playerTeam)) {
  throw new Error("Coach not authorized for this player");
}
```

#### 2. Guardian Resolution for Recipients
```typescript
// Get all guardians linked to a player
const guardianLinks = await ctx.db
  .query("guardianPlayerLinks")
  .withIndex("by_playerIdentityId", (q) =>
    q.eq("playerIdentityId", playerIdentityId)
  )
  .collect();

// Fetch full guardian identities
const guardians = await Promise.all(
  guardianLinks.map(link => ctx.db.get(link.guardianIdentityId))
);
```

#### 3. Functional Role Checking
```typescript
// Roles are in member.functionalRoles[] array, NOT Better Auth hierarchy
const member = await getMemberForOrg(ctx, userId, orgId);
const isCoach = member.functionalRoles?.includes("coach")
  || member.functionalRoles?.includes("admin");
const isParent = member.functionalRoles?.includes("parent")
  || member.functionalRoles?.includes("admin");
```

#### 4. Index Naming Convention
```typescript
// Follow existing patterns
.index("by_field", ["field"])
.index("by_org", ["organizationId"])
.index("by_org_and_status", ["organizationId", "status"])
.index("by_sender_and_org", ["senderId", "organizationId"])
```

#### 5. Email Template Pattern
```typescript
// From utils/email.ts - follow this structure
export async function sendCoachParentMessage(data: {
  guardianEmail: string;
  guardianName: string;
  coachName: string;
  playerName: string;
  subject: string;
  body: string;
  discussionPrompts?: string[];
  viewMessageUrl: string;
  organizationName: string;
}): Promise<{ success: boolean; error?: string }> {
  // Use Resend API pattern from sendOrganizationInvitation
}
```

### Voice Notes Insight Structure (for integration)
```typescript
// Current insight structure in voiceNotes table
insights: [{
  id: string,
  playerIdentityId?: Id<"playerIdentities">,
  playerName?: string,
  title: string,
  description: string,
  category?: "injury" | "skill_progress" | "behavior" | "performance",
  recommendedUpdate?: string,
  status: "pending" | "applied" | "dismissed",
  appliedDate?: string,
}]
```

### Files That Will Be Modified

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add 4 new tables |
| `packages/backend/convex/models/coachParentMessages.ts` | New file - queries/mutations |
| `packages/backend/convex/actions/messaging.ts` | New file - email delivery |
| `packages/backend/convex/utils/email.ts` | Add message email template |
| `apps/web/src/app/orgs/[orgId]/parents/messages/page.tsx` | Replace placeholder |
| `apps/web/src/app/orgs/[orgId]/coach/messages/*` | New route folder |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` | Add "Share with Parent" button |
| `apps/web/src/app/orgs/[orgId]/admin/messaging/*` | New route folder |

---

## MVP Mockup Reference

The MVP mockup (https://pdp-portal-newmockup.pages.dev/, password: pdpmock2025) demonstrates key UI patterns for the parent dashboard that should inform this implementation.

### Parent Dashboard - "Latest Coach Feedback" Section

From the MVP (`src/PDPMicrosite.tsx` lines 4157-4170):

```tsx
{/* Coach's Notes Section */}
{players.some(p => p.coachNotes) && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
      <MessageSquare size={20} />
      Latest Coach Feedback
    </h3>
    <div className="space-y-4">
      {players.filter(p => p.coachNotes).map(player => (
        <div key={player.id} className="border-l-4 border-blue-500 pl-4 py-2">
          <p className="font-medium text-gray-800 mb-1">{player.name} ({player.team})</p>
          <p className="text-sm text-gray-600">{player.coachNotes}</p>
        </div>
      ))}
    </div>
  </div>
)}
```

**Key UI Patterns from MVP:**
1. **Blue left border** (`border-l-4 border-blue-500`) for feedback items
2. **MessageSquare icon** from Lucide for coach feedback header
3. **Player name + team** in bold, feedback text in gray
4. **Conditional rendering** - only shows if any player has coach notes

### MVP Data Structure for Coach Notes

From `src/types.ts`:
```typescript
// On Player object
coachNotes: string;           // Simple text field
parentNotes: string;
playerNotes: string;

// On Injury object - timestamped notes
coachNotes: Array<{
  date: string;
  note: string;
}>;

// On DevelopmentGoal - timestamped notes
coachNotes: Array<{
  date: string;
  note: string;
}>;
```

### Design Decisions from MVP Analysis

1. **Coach Feedback Display**: MVP shows coach notes inline on parent dashboard, not in a separate messages section. For the new messaging feature, we should:
   - Keep the "Latest Coach Feedback" section for quick notes (from voice notes/insights)
   - Add a separate "Messages" section for direct coach-parent communication

2. **Multi-Child Support**: The MVP's `ParentInsightsDashboard` groups players by name and shows "Your Family's Journey" header with count of children tracked.

3. **AI Practice Assistant Integration**: The MVP shows AI-generated practice plans with "discussion prompts" - this pattern should inform our `discussionPrompts` field in coach messages.

4. **Weekly Schedule Integration**: Parent dashboard shows calendar view - messages could include session context (training date, match date).

### Visual Design Reference

From MVP parent dashboard:
- **Header gradient**: `bg-gradient-to-r from-blue-600 to-blue-700` with white text
- **Stats cards**: Icon + label + large number (Children: 3, Completed Reviews: 3, etc.)
- **Card shadows**: `shadow-md` for content cards, `shadow-lg` for featured sections
- **Color coding**:
  - Blue: Training sessions, primary actions, coach feedback
  - Green: Matches, completed items, success states
  - Purple: AI features, special actions
  - Red: Alerts, overdue items

---

## Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **G1** | Enable coaches to send player-specific messages to parents |
| **G2** | Allow coaches to approve voice note insights for parent delivery |
| **G3** | Provide parents with an in-app notification/message inbox |
| **G4** | Create comprehensive audit trail for all communications |
| **G5** | Ensure message delivery reliability and tracking |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coach adoption | 60% of coaches send ≥1 message/month | Analytics |
| Parent engagement | 80% of messages viewed within 48 hours | Read receipts |
| Response rate | 40% of messages receive parent acknowledgment | UI tracking |
| Voice note conversion | 30% of voice insights approved for parents | System data |
| Audit compliance | 100% of messages have full audit trail | System validation |

---

## User Stories

### Coach Stories

```
As a coach, I want to:
- Send a quick message to a player's parent(s) about today's training
- Approve an AI insight from my voice note to be shared with parents
- See a history of all messages I've sent to parents
- Know when parents have read my messages
- Attach context (training type, date, player development area) to messages
```

### Parent Stories

```
As a parent, I want to:
- Receive notifications when coaches send me messages about my child
- See all messages in one place (not buried in email)
- Acknowledge messages so coaches know I've read them
- Have discussion prompts to use with my child based on coach feedback
- Access message history across all my children
```

### Admin Stories

```
As an organization admin, I want to:
- View all coach-parent communications for safeguarding review
- Export communication logs for compliance audits
- Set organization-wide messaging policies
- Monitor message volume and response metrics
- Handle escalations or complaints about messages
```

---

## Feature Specification

### 1. Message Types

The system supports two primary message creation flows:

#### 1.1 Direct Messages

Coaches compose text messages directly to parents about a specific player.

```typescript
interface DirectMessage {
  type: "direct";
  senderId: string;           // Coach user ID
  recipientGuardianIds: string[];  // Guardian identity IDs
  playerIdentityId: string;   // Player the message is about
  organizationId: string;
  teamId?: string;

  // Content
  subject: string;            // Brief subject line
  body: string;               // Markdown-supported body
  context?: {
    sessionType?: "training" | "match" | "assessment" | "general";
    sessionDate?: string;
    developmentArea?: string; // "technical", "tactical", "physical", "mental"
  };

  // Delivery
  deliveryMethod: "in_app" | "email" | "both";
  priority: "normal" | "high";

  // Metadata
  createdAt: number;
  sentAt?: number;
  status: "draft" | "sent" | "delivered" | "failed";
}
```

#### 1.2 Voice Note Insight Messages

Coaches approve AI-extracted insights from voice notes for parent sharing.

```typescript
interface InsightMessage {
  type: "insight";
  sourceVoiceNoteId: string;  // Original voice note
  sourceInsightId: string;    // Specific insight being shared

  // Same fields as DirectMessage
  senderId: string;
  recipientGuardianIds: string[];
  playerIdentityId: string;
  organizationId: string;
  teamId?: string;

  // AI-generated content (coach can edit)
  subject: string;            // AI-generated, editable
  body: string;               // AI-generated, editable
  originalInsight: {          // Preserved for audit
    title: string;
    description: string;
    category: string;
    recommendedUpdate?: string;
  };

  // Parent-specific additions
  discussionPrompts?: string[];  // AI-generated conversation starters
  actionItems?: string[];        // Suggested activities for parent/child

  // Same delivery fields
  deliveryMethod: "in_app" | "email" | "both";
  priority: "normal" | "high";
  createdAt: number;
  sentAt?: number;
  status: "draft" | "pending_approval" | "sent" | "delivered" | "failed";
}
```

### 2. Database Schema

#### 2.1 New Tables

```typescript
// packages/backend/convex/schema.ts additions

// Coach-to-parent messages
coachParentMessages: defineTable({
  // Message identity
  messageType: v.union(v.literal("direct"), v.literal("insight")),
  organizationId: v.string(),
  teamId: v.optional(v.string()),

  // Sender
  senderId: v.string(),           // Coach user ID
  senderName: v.string(),         // Denormalized for display

  // Recipients (can be multiple guardians for same player)
  recipientGuardianIds: v.array(v.string()),
  playerIdentityId: v.id("playerIdentities"),
  playerName: v.string(),         // Denormalized for display

  // Content
  subject: v.string(),
  body: v.string(),
  context: v.optional(v.object({
    sessionType: v.optional(v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("assessment"),
      v.literal("general")
    )),
    sessionDate: v.optional(v.string()),
    developmentArea: v.optional(v.string()),
  })),

  // For insight messages
  sourceVoiceNoteId: v.optional(v.id("voiceNotes")),
  sourceInsightId: v.optional(v.string()),
  originalInsight: v.optional(v.object({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    recommendedUpdate: v.optional(v.string()),
  })),

  // Parent engagement aids
  discussionPrompts: v.optional(v.array(v.string())),
  actionItems: v.optional(v.array(v.string())),

  // Delivery configuration
  deliveryMethod: v.union(
    v.literal("in_app"),
    v.literal("email"),
    v.literal("both")
  ),
  priority: v.union(v.literal("normal"), v.literal("high")),

  // Status tracking
  status: v.union(
    v.literal("draft"),
    v.literal("pending_approval"),  // Insight messages awaiting coach approval
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("failed")
  ),

  // Timestamps
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_sender", ["senderId"])
  .index("by_player", ["playerIdentityId"])
  .index("by_status", ["status"])
  .index("by_org_and_status", ["organizationId", "status"])
  .index("by_sender_and_createdAt", ["senderId", "createdAt"])
  .index("by_voiceNote", ["sourceVoiceNoteId"]),

// Per-recipient delivery tracking
messageRecipients: defineTable({
  messageId: v.id("coachParentMessages"),
  guardianIdentityId: v.id("guardianIdentities"),
  guardianUserId: v.optional(v.string()),  // If guardian has account

  // Delivery status
  deliveryStatus: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("failed"),
    v.literal("bounced")
  ),
  deliveryMethod: v.union(v.literal("in_app"), v.literal("email")),

  // Email specifics
  emailSentAt: v.optional(v.number()),
  emailDeliveredAt: v.optional(v.number()),
  emailOpenedAt: v.optional(v.number()),
  emailBouncedAt: v.optional(v.number()),
  emailBounceReason: v.optional(v.string()),

  // In-app specifics
  inAppNotifiedAt: v.optional(v.number()),
  inAppViewedAt: v.optional(v.number()),

  // Parent engagement
  acknowledgedAt: v.optional(v.number()),
  acknowledgmentNote: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_guardian", ["guardianIdentityId"])
  .index("by_guardianUser", ["guardianUserId"])
  .index("by_status", ["deliveryStatus"])
  .index("by_guardian_and_viewed", ["guardianIdentityId", "inAppViewedAt"]),

// Audit log for all messaging actions
messageAuditLog: defineTable({
  messageId: v.id("coachParentMessages"),
  organizationId: v.string(),

  // Action details
  action: v.union(
    v.literal("created"),
    v.literal("edited"),
    v.literal("sent"),
    v.literal("viewed"),
    v.literal("acknowledged"),
    v.literal("deleted"),
    v.literal("exported"),
    v.literal("flagged"),
    v.literal("reviewed")
  ),

  // Actor
  actorId: v.string(),
  actorType: v.union(
    v.literal("coach"),
    v.literal("parent"),
    v.literal("admin"),
    v.literal("system")
  ),
  actorName: v.string(),

  // Details
  details: v.optional(v.object({
    previousContent: v.optional(v.string()),
    newContent: v.optional(v.string()),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })),

  timestamp: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_org", ["organizationId"])
  .index("by_actor", ["actorId"])
  .index("by_org_and_timestamp", ["organizationId", "timestamp"])
  .index("by_action", ["action"]),

// Organization messaging settings
orgMessagingSettings: defineTable({
  organizationId: v.string(),

  // Feature toggles
  messagingEnabled: v.boolean(),
  voiceNoteInsightsEnabled: v.boolean(),

  // Delivery preferences
  defaultDeliveryMethod: v.union(
    v.literal("in_app"),
    v.literal("email"),
    v.literal("both")
  ),
  allowCoachToChangeDelivery: v.boolean(),

  // Content policies
  requireSubject: v.boolean(),
  maxMessageLength: v.optional(v.number()),
  allowAttachments: v.boolean(),

  // Approval workflows
  requireAdminApproval: v.boolean(),  // All messages need admin review
  requireApprovalForInsights: v.boolean(),  // Just insight messages

  // Retention
  retentionDays: v.optional(v.number()),  // null = keep forever

  // Audit settings
  enableDetailedAuditLog: v.boolean(),
  notifyAdminOnMessage: v.boolean(),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"]),
```

### 3. Backend Functions

#### 3.1 Coach Functions

```typescript
// packages/backend/convex/models/coachParentMessages.ts

/**
 * Create a direct message to parent(s)
 */
export const createDirectMessage = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    playerIdentityId: v.id("playerIdentities"),
    recipientGuardianIds: v.array(v.id("guardianIdentities")),
    subject: v.string(),
    body: v.string(),
    context: v.optional(v.object({
      sessionType: v.optional(v.string()),
      sessionDate: v.optional(v.string()),
      developmentArea: v.optional(v.string()),
    })),
    deliveryMethod: v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("both")
    ),
    priority: v.optional(v.union(v.literal("normal"), v.literal("high"))),
    sendImmediately: v.optional(v.boolean()),
  },
  returns: v.id("coachParentMessages"),
  handler: async (ctx, args) => {
    // 1. Verify coach has access to this player/team
    // 2. Validate recipients are guardians of the player
    // 3. Create message record
    // 4. Create recipient records
    // 5. Log audit event
    // 6. If sendImmediately, schedule delivery action
    // 7. Return message ID
  },
});

/**
 * Approve a voice note insight for parent sharing
 * Creates a pre-populated insight message that coach can edit before sending
 */
export const createInsightMessage = mutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    recipientGuardianIds: v.array(v.id("guardianIdentities")),
    // Coach can customize the AI-generated content
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    discussionPrompts: v.optional(v.array(v.string())),
    actionItems: v.optional(v.array(v.string())),
    deliveryMethod: v.optional(v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("both")
    )),
  },
  returns: v.id("coachParentMessages"),
  handler: async (ctx, args) => {
    // 1. Fetch the voice note and insight
    // 2. Generate parent-friendly version of insight
    // 3. Generate discussion prompts using AI
    // 4. Create message with status "pending_approval"
    // 5. Return for coach review/edit
  },
});

/**
 * Send a message (can be called on draft or pending_approval message)
 */
export const sendMessage = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Validate message exists and sender is the coach
    // 2. Check org settings for approval requirements
    // 3. Update status to "sent"
    // 4. Schedule delivery action for each recipient
    // 5. Log audit event
  },
});

/**
 * Get messages sent by current coach
 */
export const getMyMessages = query({
  args: {
    organizationId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    messages: v.array(v.any()),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Return paginated messages with recipient status summaries
  },
});

/**
 * Get delivery status for a message
 */
export const getMessageDeliveryStatus = query({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.object({
    message: v.any(),
    recipients: v.array(v.any()),
    summary: v.object({
      total: v.number(),
      sent: v.number(),
      delivered: v.number(),
      viewed: v.number(),
      acknowledged: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // Return message with recipient-level delivery details
  },
});
```

#### 3.2 Parent Functions

```typescript
/**
 * Get messages for parent (across all their children)
 */
export const getMessagesForParent = query({
  args: {
    organizationId: v.optional(v.string()),  // Filter by org, or all orgs
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    message: v.any(),
    recipient: v.any(),
    player: v.any(),
    coach: v.any(),
  })),
  handler: async (ctx, args) => {
    // 1. Get current user's guardian identity
    // 2. Find all messageRecipients for this guardian
    // 3. Join with messages and sender info
    // 4. Filter by org/unread if specified
    // 5. Return enriched messages
  },
});

/**
 * Mark message as viewed
 */
export const markMessageViewed = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Find recipient record for current user
    // 2. Update inAppViewedAt if not already set
    // 3. Log audit event
  },
});

/**
 * Acknowledge message (optional note from parent)
 */
export const acknowledgeMessage = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Find recipient record
    // 2. Set acknowledgedAt and acknowledgmentNote
    // 3. Log audit event
    // 4. Optionally notify coach of acknowledgment
  },
});

/**
 * Get unread message count for badge display
 */
export const getUnreadCount = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Count messages where inAppViewedAt is null
  },
});
```

#### 3.3 Admin Functions

```typescript
/**
 * Get all messages in organization (admin audit view)
 */
export const getOrganizationMessages = query({
  args: {
    organizationId: v.string(),
    filters: v.optional(v.object({
      coachId: v.optional(v.string()),
      playerId: v.optional(v.string()),
      teamId: v.optional(v.string()),
      status: v.optional(v.string()),
      dateFrom: v.optional(v.number()),
      dateTo: v.optional(v.number()),
    })),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    messages: v.array(v.any()),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Admin-only: return all messages with full audit details
  },
});

/**
 * Get audit log for organization messaging
 */
export const getMessageAuditLog = query({
  args: {
    organizationId: v.string(),
    messageId: v.optional(v.id("coachParentMessages")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Return audit log entries
  },
});

/**
 * Export messages for compliance
 */
export const exportMessages = action({
  args: {
    organizationId: v.string(),
    dateFrom: v.number(),
    dateTo: v.number(),
    format: v.union(v.literal("csv"), v.literal("json")),
  },
  returns: v.string(),  // URL to download
  handler: async (ctx, args) => {
    // 1. Fetch messages in date range
    // 2. Include all audit log entries
    // 3. Generate export file
    // 4. Upload to Convex storage
    // 5. Log export audit event
    // 6. Return download URL
  },
});

/**
 * Flag message for review
 */
export const flagMessage = mutation({
  args: {
    messageId: v.id("coachParentMessages"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Flag for safeguarding review
    // Log audit event
    // Notify designated reviewers
  },
});

/**
 * Update organization messaging settings
 */
export const updateMessagingSettings = mutation({
  args: {
    organizationId: v.string(),
    settings: v.object({
      messagingEnabled: v.optional(v.boolean()),
      voiceNoteInsightsEnabled: v.optional(v.boolean()),
      defaultDeliveryMethod: v.optional(v.string()),
      requireAdminApproval: v.optional(v.boolean()),
      retentionDays: v.optional(v.number()),
      // ... other settings
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update org settings
    // Log audit event
  },
});
```

#### 3.4 Delivery Actions

```typescript
// packages/backend/convex/actions/messaging.ts

/**
 * Send email notification to parent
 */
export const sendMessageEmail = action({
  args: {
    messageId: v.id("coachParentMessages"),
    recipientId: v.id("messageRecipients"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch message and recipient details
    // 2. Build email content using template
    // 3. Send via Resend API
    // 4. Update recipient record with email status
    // 5. Log audit event
  },
});

/**
 * Generate parent-friendly version of coach insight
 */
export const generateParentInsight = action({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
  },
  returns: v.object({
    subject: v.string(),
    body: v.string(),
    discussionPrompts: v.array(v.string()),
    actionItems: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Fetch original insight
    // 2. Call OpenAI to generate:
    //    - Parent-friendly subject line
    //    - Encouraging, constructive body text
    //    - Discussion prompts for parent-child conversation
    //    - Suggested activities or focus areas
    // 3. Return generated content for coach review
  },
});
```

### 4. Frontend Components

#### 4.1 Coach UI

**Message Composer** (`apps/web/src/app/orgs/[orgId]/coach/messages/compose/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│  📝 New Message to Parent                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Player:        [Select Player ▼]                            │
│                                                              │
│  Recipients:    ☑ Mary Smith (Mother) - Primary              │
│                 ☐ John Smith (Father)                        │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Context (optional):                                         │
│  Session: [Training ▼]  Date: [Today ▼]  Area: [Technical ▼] │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Subject:                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Great progress in today's training                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Message:                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hi Mary,                                              │   │
│  │                                                       │   │
│  │ Just wanted to share that Jamie showed excellent      │   │
│  │ improvement in ball control during today's session.   │   │
│  │ They're really responding well to the drills we've    │   │
│  │ been working on.                                      │   │
│  │                                                       │   │
│  │ Best,                                                 │   │
│  │ Coach Mike                                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Delivery:  ◉ In-app & Email  ○ In-app only  ○ Email only   │
│  Priority:  ○ Normal  ○ High                                 │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │ Save as Draft    │  │ Send Message →                  │  │
│  └──────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Voice Note Insight Approval** (Enhancement to existing voice notes page)

```
┌──────────────────────────────────────────────────────────────┐
│  💡 Insight: Ball Control Improvement                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Player: Jamie Smith                                         │
│  Category: 🎯 Skill Progress                                 │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Original Insight:                                           │
│  "Jamie is showing marked improvement in ball control.       │
│   Recommend focusing on first touch drills at home."         │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ ✓ Apply       │  │ ✕ Dismiss     │  │ 📤 Share with  │ │
│  │   to Profile  │  │               │  │    Parent      │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Message History** (`apps/web/src/app/orgs/[orgId]/coach/messages/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│  📬 Message History                         [+ New Message]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Filter: [All Players ▼]  [All Status ▼]  [Last 30 days ▼]  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 📤 Great progress in training                          │ │
│  │    Jamie Smith → Mary Smith                            │ │
│  │    Jan 10, 2026 • Training • ✓ Delivered ✓ Read       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 📤 Match performance feedback                          │ │
│  │    Sarah Johnson → Parents (2)                         │ │
│  │    Jan 8, 2026 • Match • ✓ Delivered ◐ 1/2 Read       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 📝 Development focus areas (Draft)                     │ │
│  │    Alex Murphy → Not sent                              │ │
│  │    Jan 7, 2026 • Assessment                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 4.2 Parent UI

**Message Inbox** (`apps/web/src/app/orgs/[orgId]/parent/messages/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│  📬 Messages from Coaches                    🔔 2 Unread     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Filter: [All Children ▼]  [Unread ▼]                        │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔵 Great progress in today's training                  │ │
│  │    From: Coach Mike • About: Jamie                     │ │
│  │    Jan 10, 2026 • Training session                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔵 Ball control improvement                            │ │
│  │    From: Coach Mike • About: Jamie                     │ │
│  │    Jan 9, 2026 • From voice note insight               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    Match performance feedback                          │ │
│  │    From: Coach Sarah • About: Emma                     │ │
│  │    Jan 8, 2026 • ✓ Read                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Message Detail View**

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back                                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📝 Great progress in today's training                       │
│                                                              │
│  From: Coach Mike                                            │
│  About: Jamie Smith                                          │
│  Date: January 10, 2026                                      │
│  Session: Training • Development Area: Technical             │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Hi Mary,                                                    │
│                                                              │
│  Just wanted to share that Jamie showed excellent            │
│  improvement in ball control during today's session.         │
│  They're really responding well to the drills we've          │
│  been working on.                                            │
│                                                              │
│  Best,                                                       │
│  Coach Mike                                                  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  💬 Discussion Prompts for Jamie:                            │
│  • Ask about the new drill they practiced today              │
│  • Celebrate the improvement in first touch                  │
│  • Practice ball control for 10 mins at home                 │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Acknowledge                                             │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Optional note for coach...                       │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  │ [Send Acknowledgment]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Notification Badge**

In the parent dashboard header or navigation:

```
Messages 🔴2
```

#### 4.3 Admin UI

**Messaging Dashboard** (`apps/web/src/app/orgs/[orgId]/admin/messaging/page.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│  📊 Messaging Overview                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Total Sent   │  │ Read Rate    │  │ Acknowledged │       │
│  │    127       │  │    84%       │  │     42%      │       │
│  │ this month   │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  All Messages                                                │
│                                                              │
│  Coach    Player     Parent      Date      Status            │
│  ─────────────────────────────────────────────────────       │
│  Mike     Jamie S.   Mary S.     Jan 10    ✓ Read ✓ Ack     │
│  Mike     Jamie S.   Mary S.     Jan 9     ✓ Read           │
│  Sarah    Emma J.    Both        Jan 8     ◐ 1/2 Read       │
│  ...                                                         │
│                                                              │
│  [Export] [Audit Log] [Settings]                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Audit Log View**

```
┌──────────────────────────────────────────────────────────────┐
│  📋 Message Audit Log                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Date Range: [Jan 1] to [Jan 11]  [Apply]                    │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  Jan 10, 14:32 • Coach Mike created message                  │
│  Jan 10, 14:35 • Coach Mike sent message                     │
│  Jan 10, 14:35 • System delivered email to mary@email.com    │
│  Jan 10, 15:12 • Mary Smith viewed message                   │
│  Jan 10, 15:15 • Mary Smith acknowledged message             │
│                                                              │
│  Jan 9, 10:15 • Coach Mike created insight message           │
│  Jan 9, 10:18 • Coach Mike approved for sending              │
│  Jan 9, 10:18 • System delivered via in-app notification     │
│  Jan 9, 11:45 • Mary Smith viewed message                    │
│                                                              │
│  [Export Full Log]                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5. Email Templates

#### 5.1 Message Notification Email

```html
<!-- packages/backend/convex/utils/emailTemplates/coachMessage.ts -->

Subject: 📬 Message from Coach {coachName} about {playerFirstName}

---

Hi {guardianFirstName},

Coach {coachName} has sent you a message about {playerFirstName}:

---

**{subject}**

{body}

---

**Session Context:**
- Type: {sessionType}
- Date: {sessionDate}
- Development Area: {developmentArea}

---

💬 **Discussion Prompts for {playerFirstName}:**
{discussionPrompts}

---

[View in PlayerARC →]

You can view all messages and respond in your PlayerARC dashboard.

---

{organizationName}
This message was sent via PlayerARC.
```

### 6. Integration Points

#### 6.1 Voice Notes Integration

Modify the existing insight review panel to include "Share with Parent" option:

```typescript
// In voice-notes-dashboard.tsx insight actions

const handleShareWithParent = async (insight: Insight) => {
  // 1. Navigate to insight message composer
  // 2. Pre-populate with insight data
  // 3. Generate parent-friendly content via AI
  router.push(`/orgs/${orgId}/coach/messages/compose?` +
    `type=insight&voiceNoteId=${noteId}&insightId=${insight.id}`);
};
```

#### 6.2 Flow System Integration

Use the existing flow system for urgent messages:

```typescript
// High-priority messages can create a flow for immediate display
if (message.priority === "high") {
  await ctx.db.insert("flows", {
    type: "action_required",
    priority: "high",
    scope: "organization",
    organizationId: message.organizationId,
    targetAudience: "specific_users",
    targetUserIds: [recipientUserId],
    steps: [{
      id: "message_alert",
      type: "modal",
      title: `New message from Coach ${senderName}`,
      content: message.subject,
      ctaText: "View Message",
      ctaAction: `/orgs/${orgId}/parent/messages/${messageId}`,
      dismissible: true,
    }],
    active: true,
    createdAt: Date.now(),
  });
}
```

#### 6.3 Email System Integration

Extend existing Resend integration:

```typescript
// packages/backend/convex/actions/messaging.ts

export const sendMessageEmail = action({
  args: {
    messageId: v.id("coachParentMessages"),
    recipientId: v.id("messageRecipients"),
  },
  handler: async (ctx, args) => {
    // Use existing email infrastructure from utils/email.ts
    // Add tracking webhook for open/click events
    const result = await resend.emails.send({
      from: "notifications@playerarc.com",
      to: guardian.email,
      subject: buildSubject(message),
      html: buildCoachMessageEmail(message, guardian, player),
      headers: {
        "X-Message-ID": message._id,
        "X-Recipient-ID": recipientId,
      },
    });

    // Update delivery status
    await ctx.runMutation(internal.messaging.updateDeliveryStatus, {
      recipientId,
      status: "sent",
      emailSentAt: Date.now(),
    });
  },
});
```

---

## Security & Compliance

### 7.1 Access Control

| Action | Coach | Parent | Admin | Platform Staff |
|--------|-------|--------|-------|----------------|
| Create message | ✓ (own players) | ✗ | ✗ | ✗ |
| Send message | ✓ (own) | ✗ | ✓ (all) | ✓ (all) |
| View own messages | ✓ | ✓ | ✓ | ✓ |
| View org messages | ✗ | ✗ | ✓ | ✓ |
| View audit log | ✗ | ✗ | ✓ | ✓ |
| Export messages | ✗ | ✗ | ✓ | ✓ |
| Flag for review | ✗ | ✓ | ✓ | ✓ |
| Configure settings | ✗ | ✗ | ✓ | ✓ |

### 7.2 Data Protection

1. **GDPR Compliance**
   - Messages are organization-scoped data
   - Export/deletion available on request
   - Retention policies configurable per org
   - Consent tracked via guardian identity system

2. **Safeguarding**
   - Full audit trail of all communications
   - Admin review capabilities
   - Flag and escalation workflow
   - No deletion of messages (archive only)

3. **Data Retention**
   - Default: 3 years (configurable per org)
   - Audit logs: 7 years (non-configurable)
   - Deleted guardians: messages retained but anonymized

### 7.3 Content Guidelines

- No attachments in v1 (reduces risk surface)
- Max message length: 5000 characters
- Subject required: max 200 characters
- No HTML in body (Markdown only)

---

## Implementation Phases

### Phase 1: Core Messaging (Weeks 1-2)

**Backend:**
- [ ] Schema updates (new tables)
- [ ] Create/send direct message mutations
- [ ] Get messages queries (coach/parent views)
- [ ] Basic audit logging

**Frontend:**
- [ ] Coach message composer
- [ ] Coach message history
- [ ] Parent message inbox
- [ ] Parent message detail view

**Delivery:**
- [ ] In-app notification system
- [ ] Email delivery via Resend

### Phase 2: Voice Note Integration (Week 3)

**Backend:**
- [ ] createInsightMessage mutation
- [ ] generateParentInsight AI action
- [ ] Link insights to messages

**Frontend:**
- [ ] "Share with Parent" button on insights
- [ ] Pre-populated insight message composer
- [ ] Discussion prompts display

### Phase 3: Admin & Audit (Week 4)

**Backend:**
- [ ] Admin query functions
- [ ] Export action
- [ ] Full audit log implementation

**Frontend:**
- [ ] Admin messaging dashboard
- [ ] Audit log viewer
- [ ] Messaging settings page
- [ ] Export UI

### Phase 4: Enhancement & Polish (Week 5)

- [ ] Read receipts and acknowledgments
- [ ] Unread count badges
- [ ] Email open tracking
- [ ] Parent acknowledgment notifications to coach
- [ ] High-priority flow integration
- [ ] Mobile responsiveness testing

---

## Testing Strategy

### Unit Tests

- Message creation validation
- Recipient resolution from guardian links
- Audit log entry creation
- Permission checks

### Integration Tests

- Full message send flow
- Email delivery and status updates
- Parent notification display
- Voice note to insight message flow

### E2E Tests

1. Coach creates and sends direct message
2. Parent receives in-app notification
3. Parent views and acknowledges message
4. Coach sees delivery status
5. Admin reviews audit log
6. Coach shares voice note insight with parent

### UAT Scenarios

```
Scenario 1: Direct Message Flow
1. Log in as coach
2. Navigate to Messages > Compose
3. Select player (Jamie Smith)
4. Compose message about training
5. Send to parent
6. Verify parent receives notification
7. Log in as parent
8. View message in inbox
9. Acknowledge message
10. Log in as coach
11. Verify acknowledgment visible

Scenario 2: Voice Note Insight Sharing
1. Log in as coach
2. Create voice note mentioning player improvement
3. Review AI-generated insight
4. Click "Share with Parent"
5. Review auto-generated parent message
6. Edit discussion prompts
7. Send message
8. Verify parent receives enriched message

Scenario 3: Admin Audit
1. Log in as org admin
2. Navigate to Messaging Dashboard
3. Filter messages by date range
4. View audit log for specific message
5. Export messages for compliance
6. Verify export contains all fields
```

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Email deliverability issues | High | Medium | Use Resend reputation, monitor bounces |
| Parents miss important messages | High | Medium | Multiple delivery methods, unread badges |
| Inappropriate content | High | Low | Admin review capability, audit trail |
| Over-messaging by coaches | Medium | Medium | Rate limiting, admin dashboards |
| AI-generated content errors | Medium | Medium | Coach review before sending |
| Performance with high volume | Medium | Low | Pagination, query optimization |

---

## Success Criteria

1. **Functional:** All core messaging flows work end-to-end
2. **Performance:** Message delivery <5s, inbox load <2s
3. **Adoption:** 50% of coaches send ≥1 message within 30 days
4. **Engagement:** 70% parent read rate
5. **Compliance:** 100% audit trail coverage
6. **Quality:** <5% email bounce rate

---

## Appendix

### A. Related Documentation

- [Voice Notes Architecture](./voice-notes.md)
- [Flow Wizard System](../architecture/flow-wizard-system.md)
- [Guardian Identity System](./guardian-identity.md)
- [Email Infrastructure](../setup/invitation-emails.md)

### B. Open Questions

1. Should parents be able to reply to coaches? (Consider for v2)
2. Should we support attachments (photos from training)? (Consider for v2)
3. Should messages be threaded or flat? (Flat for v1)
4. Should there be message templates for common updates? (Consider for v2)

### C. Future Enhancements

- **v2:** Parent-to-coach replies
- **v2:** Message templates and quick sends
- **v2:** Photo/video attachments
- **v2:** Team-wide announcements (separate from org flows)
- **v2:** Scheduled message sending
- **v2:** Message translation for multi-language clubs

---

**Document Status:** Ready for Review
**Next Steps:** Product/Engineering alignment, sprint planning
**Reviewer:** [Pending]
