# WhatsApp Coach Groups - Implementation Plan

## Overview

Extend the existing WhatsApp integration to support **coach group chats**, enabling:
1. **Passive observation** of coaching discussions in WhatsApp groups
2. **Meeting mode** for structured capture of team debriefs, selection meetings, etc.
3. **Multi-speaker insight extraction** from group conversations

This builds on the existing WhatsApp → voice notes → AI insights pipeline.

---

## Current State vs. Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Message source | 1:1 coach → PlayerARC | 1:1 + group chats |
| Speaker | Single coach | Multiple coaches |
| Capture mode | All messages processed | Configurable: passive / triggered / meeting-only |
| Context | Per-message | Conversation windows / meeting sessions |
| Attribution | Single coachId | Multiple speakers with attribution |

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Group Chat                       │
│         "U14 Coaches" (includes PlayerARC number)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Twilio Webhook                             │
│  POST /whatsapp/incoming                                     │
│  New fields: Author (sender), ProfileName                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Group Message Router                            │
│  - Detect group vs individual (Author field present?)        │
│  - Find/create group record                                  │
│  - Check capture mode                                        │
│  - Route to appropriate handler                              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Passive  │    │Triggered │    │ Meeting  │
       │  Mode    │    │  Mode    │    │  Mode    │
       └──────────┘    └──────────┘    └──────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              Conversation Aggregator                         │
│  - Buffer messages by time window or session                 │
│  - Concatenate for batch processing                          │
│  - Track speakers                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Enhanced Voice Note (source: "group_meeting")        │
│  - Multi-speaker transcription                               │
│  - Speaker attribution in insights                           │
│  - Meeting metadata (duration, participants)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Insight Extraction                           │
│  - Enhanced prompt for meeting context                       │
│  - Multi-speaker awareness                                   │
│  - Action item assignment to specific coaches                │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### New Tables

#### `whatsappGroups` - Group Chat Configuration

```typescript
whatsappGroups: defineTable({
  // WhatsApp group identification
  groupId: v.string(),                    // WhatsApp group ID (from "From" field)
  groupName: v.optional(v.string()),      // Detected from first message or set manually
  twilioNumber: v.string(),               // Our Twilio number in this group

  // Organization linkage
  organizationId: v.id("organizations"),
  organizationName: v.string(),

  // Optional team linkage (for context)
  teamId: v.optional(v.id("teams")),
  teamName: v.optional(v.string()),

  // Known members (discovered from Author field over time)
  knownMembers: v.array(v.object({
    phoneNumber: v.string(),              // E.164 format
    profileName: v.string(),              // WhatsApp display name
    odId: v.optional(v.string()),     // Linked Better Auth user ID
    coachName: v.optional(v.string()),    // From user record
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    messageCount: v.number(),
  })),

  // Capture configuration
  captureMode: v.union(
    v.literal("passive"),                 // Capture all messages (aggregate by time window)
    v.literal("triggered"),               // Only capture on @playerarc mention
    v.literal("meeting_only")             // Only capture between start/end commands
  ),

  // Passive mode settings
  passiveWindowMinutes: v.optional(v.number()),  // Aggregate window (default: 30 min)

  // Status
  isActive: v.boolean(),
  isPaused: v.boolean(),                  // Temporarily pause capture

  // Timestamps
  joinedAt: v.number(),                   // When bot was added to group
  lastMessageAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_groupId", ["groupId"])
.index("by_organizationId", ["organizationId"])
.index("by_teamId", ["teamId"])
.index("by_isActive", ["isActive"])
```

#### `whatsappGroupMessages` - Individual Group Messages

```typescript
whatsappGroupMessages: defineTable({
  // Message identification
  messageSid: v.string(),                 // Twilio message SID
  groupId: v.string(),                    // Links to whatsappGroups.groupId

  // Sender info (from Author field)
  authorPhone: v.string(),                // E.164 format
  authorName: v.string(),                 // WhatsApp profile name
  authorCoachId: v.optional(v.string()),  // Matched coach user ID

  // Content
  messageType: v.union(
    v.literal("text"),
    v.literal("audio"),
    v.literal("image"),
    v.literal("video"),
    v.literal("document")
  ),
  body: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  mediaContentType: v.optional(v.string()),
  mediaStorageId: v.optional(v.id("_storage")),

  // Transcription (for audio messages)
  transcription: v.optional(v.string()),
  transcriptionStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  )),

  // Processing status
  isProcessed: v.boolean(),               // Has been included in a meeting/window
  meetingSessionId: v.optional(v.id("whatsappMeetingSessions")),

  // Timestamps
  receivedAt: v.number(),
})
.index("by_messageSid", ["messageSid"])
.index("by_groupId", ["groupId"])
.index("by_groupId_and_receivedAt", ["groupId", "receivedAt"])
.index("by_meetingSessionId", ["meetingSessionId"])
.index("by_isProcessed", ["isProcessed"])
```

#### `whatsappMeetingSessions` - Meeting Capture Sessions

```typescript
whatsappMeetingSessions: defineTable({
  // Group context
  groupId: v.string(),
  organizationId: v.id("organizations"),
  teamId: v.optional(v.id("teams")),

  // Session lifecycle
  status: v.union(
    v.literal("active"),                  // Currently capturing
    v.literal("processing"),              // Transcription/insights in progress
    v.literal("completed"),               // Done
    v.literal("failed"),                  // Processing error
    v.literal("cancelled")                // Manually cancelled
  ),

  // Session metadata
  title: v.optional(v.string()),          // "U14 training debrief", extracted or provided
  sessionType: v.optional(v.union(
    v.literal("training_debrief"),
    v.literal("match_debrief"),
    v.literal("selection_meeting"),
    v.literal("player_review"),
    v.literal("general")
  )),

  // Participants (coaches who contributed)
  participants: v.array(v.object({
    phoneNumber: v.string(),
    profileName: v.string(),
    coachId: v.optional(v.string()),
    coachName: v.optional(v.string()),
    messageCount: v.number(),
    audioCount: v.number(),               // Number of voice notes
  })),

  // Start/end
  startedAt: v.number(),
  startedByPhone: v.string(),
  startedByName: v.string(),
  endedAt: v.optional(v.number()),
  endedByPhone: v.optional(v.string()),
  endedByName: v.optional(v.string()),

  // Message aggregation
  messageCount: v.number(),
  audioMessageCount: v.number(),

  // Processing results
  combinedTranscription: v.optional(v.string()),  // All messages concatenated
  voiceNoteId: v.optional(v.id("voiceNotes")),   // Created voice note

  // Error handling
  errorMessage: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_groupId", ["groupId"])
.index("by_groupId_and_status", ["groupId", "status"])
.index("by_organizationId", ["organizationId"])
.index("by_status", ["status"])
.index("by_voiceNoteId", ["voiceNoteId"])
```

### Schema Changes to Existing Tables

#### `voiceNotes` - Add Meeting Source

```typescript
// Add to source union:
source: v.optional(v.union(
  v.literal("app_recorded"),
  v.literal("app_typed"),
  v.literal("whatsapp_audio"),
  v.literal("whatsapp_text"),
  v.literal("group_meeting"),       // NEW: From group meeting session
  v.literal("group_passive"),       // NEW: From passive group capture
)),

// Add meeting context:
meetingSessionId: v.optional(v.id("whatsappMeetingSessions")),
groupId: v.optional(v.string()),

// Add multi-speaker context:
speakers: v.optional(v.array(v.object({
  phoneNumber: v.string(),
  profileName: v.string(),
  coachId: v.optional(v.string()),
  coachName: v.optional(v.string()),
}))),
```

#### `voiceNotes.insights[]` - Add Speaker Attribution

```typescript
// Add to insight object:
speakerPhone: v.optional(v.string()),     // Who mentioned this insight
speakerName: v.optional(v.string()),      // Display name
speakerCoachId: v.optional(v.string()),   // Matched coach
```

---

## Implementation Phases

### Phase 1: Group Detection & Storage (Foundation)

**Goal:** Detect group messages, store them, and track group membership.

#### 1.1 Update HTTP Webhook Handler

```typescript
// http.ts - Extract new group fields
http.route({
  path: "/whatsapp/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();

    // Existing fields
    const messageSid = formData.get("MessageSid");
    const from = formData.get("From");
    const to = formData.get("To");
    const body = formData.get("Body");

    // NEW: Group-specific fields
    const author = formData.get("Author");           // Present if group message
    const profileName = formData.get("ProfileName"); // Sender's display name

    // Determine if group message
    const isGroupMessage = author !== null;

    await ctx.runAction(internal.actions.whatsapp.processIncomingMessage, {
      messageSid,
      from,              // For groups: this is the group ID
      to,
      body,
      author,            // NEW: actual sender (null for 1:1)
      profileName,       // NEW: sender's display name
      isGroupMessage,    // NEW: flag for routing
      // ... media fields
    });

    return new Response(EMPTY_TWIML, { status: 200 });
  }),
});
```

#### 1.2 Create Group Message Router

```typescript
// actions/whatsapp.ts - Route based on message type

export const processIncomingMessage = internalAction({
  args: {
    // ... existing args
    author: v.optional(v.string()),
    profileName: v.optional(v.string()),
    isGroupMessage: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.isGroupMessage) {
      return await processGroupMessage(ctx, {
        groupId: args.from,              // Group ID
        authorPhone: args.author!,       // Sender's phone
        authorName: args.profileName!,   // Sender's display name
        messageSid: args.messageSid,
        body: args.body,
        mediaUrl: args.mediaUrl,
        mediaContentType: args.mediaContentType,
      });
    }

    // Existing individual message handling
    return await processIndividualMessage(ctx, args);
  }
});
```

#### 1.3 Group Message Processing

```typescript
async function processGroupMessage(ctx, args: {
  groupId: string;
  authorPhone: string;
  authorName: string;
  messageSid: string;
  body?: string;
  mediaUrl?: string;
  mediaContentType?: string;
}) {
  const phoneNumber = normalizePhone(args.authorPhone);

  // 1. Find or create group record
  let group = await ctx.runQuery(
    internal.models.whatsappGroups.getByGroupId,
    { groupId: args.groupId }
  );

  if (!group) {
    // New group - need to determine org context
    group = await handleNewGroup(ctx, args);
    if (!group) return; // Couldn't determine org, sent clarification message
  }

  if (!group.isActive || group.isPaused) {
    return; // Group is inactive/paused, ignore message
  }

  // 2. Update member tracking
  await ctx.runMutation(
    internal.models.whatsappGroups.updateMember,
    {
      groupId: args.groupId,
      phoneNumber,
      profileName: args.authorName,
    }
  );

  // 3. Determine message type and store
  const messageType = determineMessageType(args.mediaContentType);

  // Download and store audio if applicable
  let mediaStorageId;
  if (messageType === "audio" && args.mediaUrl) {
    mediaStorageId = await downloadAndStoreMedia(ctx, args.mediaUrl);
  }

  // 4. Store group message
  const messageId = await ctx.runMutation(
    internal.models.whatsappGroupMessages.create,
    {
      messageSid: args.messageSid,
      groupId: args.groupId,
      authorPhone: phoneNumber,
      authorName: args.authorName,
      messageType,
      body: args.body,
      mediaUrl: args.mediaUrl,
      mediaStorageId,
      isProcessed: false,
    }
  );

  // 5. Route based on capture mode
  switch (group.captureMode) {
    case "meeting_only":
      await handleMeetingModeMessage(ctx, group, messageId, args);
      break;
    case "triggered":
      await handleTriggeredModeMessage(ctx, group, messageId, args);
      break;
    case "passive":
      await handlePassiveModeMessage(ctx, group, messageId, args);
      break;
  }
}
```

#### 1.4 New Group Handling

```typescript
async function handleNewGroup(ctx, args: {
  groupId: string;
  authorPhone: string;
  authorName: string;
  body?: string;
}) {
  const phoneNumber = normalizePhone(args.authorPhone);

  // Try to find coach by phone number
  const coachContext = await ctx.runQuery(
    internal.models.whatsappMessages.findCoachWithOrgContext,
    { phoneNumber, messageBody: args.body }
  );

  if (!coachContext) {
    // Unknown phone number - send welcome with instructions
    await sendGroupMessage(args.groupId,
      `Hi! I'm PlayerARC. I don't recognize the phone number that added me. ` +
      `A registered coach needs to send a message to link this group.`
    );
    return null;
  }

  if (coachContext.needsClarification) {
    // Multi-org coach - ask for org selection
    const orgList = coachContext.availableOrgs
      .map((org, i) => `${i + 1}. ${org.name}`)
      .join("\n");

    await sendGroupMessage(args.groupId,
      `Hi coaches! I'm PlayerARC, ready to capture your discussions.\n\n` +
      `${args.authorName} coaches at multiple clubs. ` +
      `Please reply with the number of the club this group is for:\n\n${orgList}`
    );

    // Create pending group setup
    await ctx.runMutation(
      internal.models.whatsappGroups.createPending,
      {
        groupId: args.groupId,
        initiatorPhone: phoneNumber,
        initiatorName: args.authorName,
        availableOrgs: coachContext.availableOrgs,
      }
    );

    return null;
  }

  // Single org - create group immediately
  const group = await ctx.runMutation(
    internal.models.whatsappGroups.create,
    {
      groupId: args.groupId,
      organizationId: coachContext.organization.id,
      organizationName: coachContext.organization.name,
      twilioNumber: process.env.TWILIO_WHATSAPP_NUMBER!,
      captureMode: "meeting_only", // Default to meeting_only (safest)
      isActive: true,
      isPaused: false,
      knownMembers: [{
        phoneNumber,
        profileName: args.authorName,
        odId: coachContext.coachId,
        coachName: coachContext.coachName,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        messageCount: 1,
      }],
    }
  );

  // Send welcome message
  await sendGroupMessage(args.groupId,
    `Hi coaches! I'm PlayerARC, now linked to *${coachContext.organization.name}*.\n\n` +
    `📝 *Meeting Mode* (default)\n` +
    `Say "playerarc start meeting" to begin capturing.\n` +
    `Say "playerarc end meeting" when done.\n\n` +
    `⚙️ *Settings*\n` +
    `• "playerarc link [team name]" - Connect to a specific team\n` +
    `• "playerarc pause" / "playerarc resume" - Pause/resume capture\n` +
    `• "playerarc status" - Show current settings`
  );

  return group;
}
```

### Phase 2: Meeting Mode (Core Feature)

**Goal:** Implement start/end meeting flow with message buffering.

#### 2.1 Meeting Command Detection

```typescript
// Command patterns
const COMMANDS = {
  START_MEETING: /playerarc\s+start\s+meeting(?:\s+(.+))?/i,
  END_MEETING: /playerarc\s+end\s+meeting/i,
  CANCEL_MEETING: /playerarc\s+cancel\s+meeting/i,
  LINK_TEAM: /playerarc\s+link\s+(.+)/i,
  PAUSE: /playerarc\s+pause/i,
  RESUME: /playerarc\s+resume/i,
  STATUS: /playerarc\s+status/i,
  HELP: /playerarc\s+help/i,
};

async function handleMeetingModeMessage(ctx, group, messageId, args) {
  const body = args.body?.trim() || "";

  // Check for commands
  const startMatch = body.match(COMMANDS.START_MEETING);
  if (startMatch) {
    const title = startMatch[1]; // Optional meeting title
    return await startMeetingSession(ctx, group, args, title);
  }

  const endMatch = body.match(COMMANDS.END_MEETING);
  if (endMatch) {
    return await endMeetingSession(ctx, group, args);
  }

  const cancelMatch = body.match(COMMANDS.CANCEL_MEETING);
  if (cancelMatch) {
    return await cancelMeetingSession(ctx, group, args);
  }

  // Check for active meeting session
  const activeSession = await ctx.runQuery(
    internal.models.whatsappMeetingSessions.getActive,
    { groupId: args.groupId }
  );

  if (activeSession) {
    // Buffer message to active session
    await bufferMessageToSession(ctx, activeSession, messageId, args);
  }

  // Handle other commands (link, pause, resume, status, help)
  await handleGroupCommand(ctx, group, args, body);
}
```

#### 2.2 Start Meeting Session

```typescript
async function startMeetingSession(
  ctx,
  group: WhatsappGroup,
  args: GroupMessageArgs,
  title?: string
) {
  // Check for existing active session
  const existingSession = await ctx.runQuery(
    internal.models.whatsappMeetingSessions.getActive,
    { groupId: args.groupId }
  );

  if (existingSession) {
    await sendGroupMessage(args.groupId,
      `⚠️ A meeting is already in progress (started by ${existingSession.startedByName}).\n` +
      `Say "playerarc end meeting" to finish it first.`
    );
    return;
  }

  // Detect session type from title
  const sessionType = detectSessionType(title);

  // Create session
  const sessionId = await ctx.runMutation(
    internal.models.whatsappMeetingSessions.create,
    {
      groupId: args.groupId,
      organizationId: group.organizationId,
      teamId: group.teamId,
      status: "active",
      title: title || undefined,
      sessionType,
      participants: [{
        phoneNumber: args.authorPhone,
        profileName: args.authorName,
        coachId: await matchCoachByPhone(ctx, args.authorPhone, group.organizationId),
        messageCount: 1,
        audioCount: 0,
      }],
      startedAt: Date.now(),
      startedByPhone: args.authorPhone,
      startedByName: args.authorName,
      messageCount: 0,
      audioMessageCount: 0,
    }
  );

  // Send confirmation
  const titleText = title ? `: "${title}"` : "";
  const teamText = group.teamName ? ` for ${group.teamName}` : "";

  await sendGroupMessage(args.groupId,
    `📝 *Meeting started${titleText}*${teamText}\n\n` +
    `Speak naturally - I'll capture everything.\n` +
    `Voice notes and text are both recorded.\n\n` +
    `Say "playerarc end meeting" when you're done.`
  );
}

function detectSessionType(title?: string): SessionType {
  if (!title) return "general";

  const lower = title.toLowerCase();
  if (lower.includes("training") || lower.includes("session")) return "training_debrief";
  if (lower.includes("match") || lower.includes("game")) return "match_debrief";
  if (lower.includes("selection") || lower.includes("team sheet")) return "selection_meeting";
  if (lower.includes("review") || lower.includes("player")) return "player_review";

  return "general";
}
```

#### 2.3 Buffer Messages to Session

```typescript
async function bufferMessageToSession(
  ctx,
  session: MeetingSession,
  messageId: Id<"whatsappGroupMessages">,
  args: GroupMessageArgs
) {
  // Link message to session
  await ctx.runMutation(
    internal.models.whatsappGroupMessages.linkToSession,
    { messageId, sessionId: session._id }
  );

  // Update participant stats
  const isAudio = args.mediaContentType?.startsWith("audio/");
  await ctx.runMutation(
    internal.models.whatsappMeetingSessions.updateParticipant,
    {
      sessionId: session._id,
      phoneNumber: args.authorPhone,
      profileName: args.authorName,
      incrementMessages: 1,
      incrementAudio: isAudio ? 1 : 0,
    }
  );

  // If audio, start transcription immediately (parallel processing)
  if (isAudio) {
    await ctx.scheduler.runAfter(0,
      internal.actions.whatsappGroups.transcribeGroupAudio,
      { messageId }
    );
  }
}
```

#### 2.4 End Meeting Session

```typescript
async function endMeetingSession(ctx, group: WhatsappGroup, args: GroupMessageArgs) {
  const session = await ctx.runQuery(
    internal.models.whatsappMeetingSessions.getActive,
    { groupId: args.groupId }
  );

  if (!session) {
    await sendGroupMessage(args.groupId,
      `No active meeting to end. Say "playerarc start meeting" to begin one.`
    );
    return;
  }

  // Update session status
  await ctx.runMutation(
    internal.models.whatsappMeetingSessions.updateStatus,
    {
      sessionId: session._id,
      status: "processing",
      endedAt: Date.now(),
      endedByPhone: args.authorPhone,
      endedByName: args.authorName,
    }
  );

  // Get message count
  const messages = await ctx.runQuery(
    internal.models.whatsappGroupMessages.getBySession,
    { sessionId: session._id }
  );

  const audioCount = messages.filter(m => m.messageType === "audio").length;
  const textCount = messages.filter(m => m.messageType === "text").length;
  const participantCount = session.participants.length;

  // Calculate duration
  const durationMs = Date.now() - session.startedAt;
  const durationMins = Math.round(durationMs / 60000);

  // Send processing message
  await sendGroupMessage(args.groupId,
    `📋 *Meeting ended* (${durationMins} min)\n\n` +
    `• ${participantCount} coach${participantCount > 1 ? "es" : ""}\n` +
    `• ${textCount} text message${textCount !== 1 ? "s" : ""}\n` +
    `• ${audioCount} voice note${audioCount !== 1 ? "s" : ""}\n\n` +
    `Processing... I'll send a summary when ready.`
  );

  // Schedule aggregation and processing
  await ctx.scheduler.runAfter(0,
    internal.actions.whatsappGroups.processMeetingSession,
    { sessionId: session._id }
  );
}
```

### Phase 3: Meeting Processing Pipeline

**Goal:** Aggregate messages, combine transcriptions, extract multi-speaker insights.

#### 3.1 Meeting Session Processor

```typescript
export const processMeetingSession = internalAction({
  args: { sessionId: v.id("whatsappMeetingSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      internal.models.whatsappMeetingSessions.get,
      { sessionId: args.sessionId }
    );

    if (!session || session.status !== "processing") {
      return null;
    }

    try {
      // 1. Get all messages for this session
      const messages = await ctx.runQuery(
        internal.models.whatsappGroupMessages.getBySession,
        { sessionId: args.sessionId }
      );

      // 2. Wait for any pending audio transcriptions
      const pendingAudio = messages.filter(
        m => m.messageType === "audio" && m.transcriptionStatus !== "completed"
      );

      if (pendingAudio.length > 0) {
        // Retry after delay
        await ctx.scheduler.runAfter(10000,
          internal.actions.whatsappGroups.processMeetingSession,
          { sessionId: args.sessionId }
        );
        return null;
      }

      // 3. Build combined transcription with speaker attribution
      const combinedTranscription = buildCombinedTranscription(messages);

      // 4. Create voice note with meeting source
      const voiceNoteId = await ctx.runMutation(
        internal.models.voiceNotes.createMeetingNote,
        {
          orgId: session.organizationId,
          teamId: session.teamId,
          meetingSessionId: args.sessionId,
          groupId: session.groupId,
          transcription: combinedTranscription,
          speakers: session.participants.map(p => ({
            phoneNumber: p.phoneNumber,
            profileName: p.profileName,
            coachId: p.coachId,
            coachName: p.coachName,
          })),
          title: session.title,
          sessionType: session.sessionType,
        }
      );

      // 5. Update session with voice note link
      await ctx.runMutation(
        internal.models.whatsappMeetingSessions.update,
        {
          sessionId: args.sessionId,
          combinedTranscription,
          voiceNoteId,
        }
      );

      // 6. Trigger insight extraction (enhanced for meetings)
      await ctx.scheduler.runAfter(0,
        internal.actions.voiceNotes.buildMeetingInsights,
        { noteId: voiceNoteId, sessionId: args.sessionId }
      );

    } catch (error) {
      // Mark session as failed
      await ctx.runMutation(
        internal.models.whatsappMeetingSessions.updateStatus,
        {
          sessionId: args.sessionId,
          status: "failed",
          errorMessage: error.message,
        }
      );

      // Notify group
      const group = await ctx.runQuery(
        internal.models.whatsappGroups.getByGroupId,
        { groupId: session.groupId }
      );

      if (group) {
        await sendGroupMessage(session.groupId,
          `❌ Sorry, there was an error processing the meeting. ` +
          `Please try again or check the app for details.`
        );
      }
    }

    return null;
  }
});

function buildCombinedTranscription(messages: GroupMessage[]): string {
  // Sort by timestamp
  const sorted = [...messages].sort((a, b) => a.receivedAt - b.receivedAt);

  // Build transcript with speaker labels
  const lines: string[] = [];

  for (const msg of sorted) {
    const timestamp = new Date(msg.receivedAt).toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const speaker = msg.authorName || "Unknown";

    if (msg.messageType === "text" && msg.body) {
      lines.push(`[${timestamp}] ${speaker}: ${msg.body}`);
    } else if (msg.messageType === "audio" && msg.transcription) {
      lines.push(`[${timestamp}] ${speaker} (voice): ${msg.transcription}`);
    }
  }

  return lines.join("\n\n");
}
```

#### 3.2 Enhanced Meeting Insights Prompt

```typescript
const MEETING_INSIGHTS_SYSTEM_PROMPT = `
You are analyzing a transcribed coaching meeting from a sports team.
This is a multi-speaker conversation where coaches discuss players,
training observations, and team matters.

## Context
- This is from a WhatsApp group chat
- Multiple coaches are speaking (identified by name in square brackets)
- The transcript includes timestamps
- Both text messages and transcribed voice notes are included

## Your Task
Extract structured insights from this coaching discussion:

1. **Player Insights**: Individual observations about specific players
   - Match player names to the provided roster
   - Note which coach made the observation (speakerName)
   - Categories: injury, skill_rating, skill_progress, behavior, performance, attendance

2. **Team Insights**: Observations about the team as a whole
   - Team culture, dynamics, patterns
   - Link to specific team if mentioned

3. **Action Items (TODOs)**: Tasks coaches commit to
   - "I'll talk to his parents" → TODO for that coach
   - "We need to order new bibs" → TODO (may be unassigned)
   - Assign to the coach who volunteered or was nominated

4. **Meeting Summary**: Brief overview of what was discussed

## Important Notes
- Pay attention to speaker names - attribute insights to the correct coach
- When coaches disagree, capture both perspectives
- Skill ratings often come as natural language: "give him a 4" → rating: 4
- First-person statements ("I noticed", "I'll do") should be attributed to that speaker
- Look for consensus moments: "Agreed", "Yeah", "Right"

## Output Format
Return structured JSON with:
- summary: 2-3 sentence meeting summary
- insights: Array of insight objects with speakerPhone, speakerName fields
- actionItems: Explicit TODOs with assignee

## Player Roster
{roster_json}

## Coach Participants
{coaches_json}

## Team Context
{team_json}
`;
```

#### 3.3 Meeting Summary WhatsApp Reply

```typescript
async function sendMeetingSummary(
  ctx,
  session: MeetingSession,
  voiceNote: VoiceNote,
  results: ProcessingResults
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const meetingUrl = `${appUrl}/orgs/${session.organizationId}/coach/meetings/${session._id}`;

  // Build summary message
  const lines: string[] = [];

  // Header
  const title = session.title || "Coaching Discussion";
  lines.push(`📋 *Meeting Summary: ${title}*`);
  lines.push("");

  // Quick stats
  const durationMins = Math.round((session.endedAt! - session.startedAt) / 60000);
  lines.push(`⏱️ ${durationMins} min • ${session.participants.length} coaches`);
  lines.push("");

  // AI Summary
  if (voiceNote.summary) {
    lines.push(`💡 *Key Points*`);
    lines.push(voiceNote.summary);
    lines.push("");
  }

  // Players mentioned
  const playerInsights = voiceNote.insights.filter(i => i.playerIdentityId);
  if (playerInsights.length > 0) {
    lines.push(`👥 *Players Discussed* (${playerInsights.length})`);

    // Group by player
    const byPlayer = groupBy(playerInsights, i => i.playerIdentityId);
    for (const [playerId, insights] of Object.entries(byPlayer).slice(0, 5)) {
      const name = insights[0].playerName;
      const categories = [...new Set(insights.map(i => categoryEmoji(i.category)))];
      lines.push(`• ${name}: ${categories.join(" ")}`);
    }

    if (Object.keys(byPlayer).length > 5) {
      lines.push(`  ...and ${Object.keys(byPlayer).length - 5} more`);
    }
    lines.push("");
  }

  // Action items
  const todos = voiceNote.insights.filter(i => i.category === "todo");
  if (todos.length > 0) {
    lines.push(`✅ *Action Items* (${todos.length})`);
    for (const todo of todos.slice(0, 3)) {
      const assignee = todo.assigneeName ? ` → ${todo.assigneeName}` : "";
      lines.push(`• ${todo.title}${assignee}`);
    }
    if (todos.length > 3) {
      lines.push(`  ...and ${todos.length - 3} more`);
    }
    lines.push("");
  }

  // Auto-applied vs needs review
  const autoApplied = results.autoApplied.length;
  const needsReview = results.needsReview.length;

  if (autoApplied > 0 || needsReview > 0) {
    lines.push(`📊 *Insights*`);
    if (autoApplied > 0) {
      lines.push(`✓ ${autoApplied} auto-applied`);
    }
    if (needsReview > 0) {
      lines.push(`⚠️ ${needsReview} need review`);
    }
    lines.push("");
  }

  // Link to app
  lines.push(`View full details: ${meetingUrl}`);

  await sendGroupMessage(session.groupId, lines.join("\n"));
}

function categoryEmoji(category?: string): string {
  const emojis: Record<string, string> = {
    injury: "🏥",
    skill_rating: "⭐",
    skill_progress: "📈",
    behavior: "💭",
    performance: "🎯",
    attendance: "📋",
    team_culture: "🤝",
    todo: "✅",
  };
  return emojis[category || ""] || "💬";
}
```

### Phase 4: Passive & Triggered Modes (Optional)

**Goal:** Support alternative capture modes for different use cases.

#### 4.1 Triggered Mode

```typescript
async function handleTriggeredModeMessage(
  ctx,
  group: WhatsappGroup,
  messageId: Id<"whatsappGroupMessages">,
  args: GroupMessageArgs
) {
  // Check for @playerarc mention
  const body = args.body?.toLowerCase() || "";
  const isMention = body.includes("@playerarc") ||
                    body.includes("playerarc capture") ||
                    body.includes("playerarc save");

  if (!isMention) {
    // Store message but don't process
    return;
  }

  // Get recent messages (last 30 min or last 20 messages)
  const recentMessages = await ctx.runQuery(
    internal.models.whatsappGroupMessages.getRecent,
    {
      groupId: args.groupId,
      since: Date.now() - 30 * 60 * 1000,
      limit: 20,
    }
  );

  // Process as a "snapshot"
  await processMessageBatch(ctx, group, recentMessages, "triggered_capture");

  await sendGroupMessage(args.groupId,
    `📸 Captured last ${recentMessages.length} messages. Processing...`
  );
}
```

#### 4.2 Passive Mode (Time Windows)

```typescript
async function handlePassiveModeMessage(
  ctx,
  group: WhatsappGroup,
  messageId: Id<"whatsappGroupMessages">,
  args: GroupMessageArgs
) {
  // Check if we have a pending aggregation window
  const pendingWindow = await ctx.runQuery(
    internal.models.whatsappGroups.getPendingWindow,
    { groupId: args.groupId }
  );

  if (!pendingWindow) {
    // Start new window, schedule processing
    const windowMinutes = group.passiveWindowMinutes || 30;

    await ctx.runMutation(
      internal.models.whatsappGroups.startWindow,
      {
        groupId: args.groupId,
        startsAt: Date.now(),
        endsAt: Date.now() + windowMinutes * 60 * 1000,
      }
    );

    await ctx.scheduler.runAfter(
      windowMinutes * 60 * 1000,
      internal.actions.whatsappGroups.processWindow,
      { groupId: args.groupId }
    );
  }

  // Message is already stored, will be included in window
}
```

### Phase 5: Admin UI & Configuration

**Goal:** Allow coaches to manage group settings.

#### 5.1 Group Commands

```typescript
async function handleGroupCommand(
  ctx,
  group: WhatsappGroup,
  args: GroupMessageArgs,
  body: string
) {
  // Link team
  const linkMatch = body.match(COMMANDS.LINK_TEAM);
  if (linkMatch) {
    const teamName = linkMatch[1].trim();
    const team = await findTeamByName(ctx, group.organizationId, teamName);

    if (team) {
      await ctx.runMutation(
        internal.models.whatsappGroups.linkTeam,
        { groupId: group.groupId, teamId: team._id, teamName: team.name }
      );
      await sendGroupMessage(args.groupId,
        `✓ Linked to team: *${team.name}*`
      );
    } else {
      await sendGroupMessage(args.groupId,
        `Team "${teamName}" not found. Check spelling or try the full team name.`
      );
    }
    return;
  }

  // Pause
  if (COMMANDS.PAUSE.test(body)) {
    await ctx.runMutation(
      internal.models.whatsappGroups.setPaused,
      { groupId: group.groupId, isPaused: true }
    );
    await sendGroupMessage(args.groupId,
      `⏸️ Capture paused. Say "playerarc resume" to continue.`
    );
    return;
  }

  // Resume
  if (COMMANDS.RESUME.test(body)) {
    await ctx.runMutation(
      internal.models.whatsappGroups.setPaused,
      { groupId: group.groupId, isPaused: false }
    );
    await sendGroupMessage(args.groupId,
      `▶️ Capture resumed.`
    );
    return;
  }

  // Status
  if (COMMANDS.STATUS.test(body)) {
    const teamText = group.teamName ? `Team: ${group.teamName}` : "No team linked";
    const modeText = `Mode: ${group.captureMode}`;
    const statusText = group.isPaused ? "⏸️ Paused" : "✓ Active";

    await sendGroupMessage(args.groupId,
      `📊 *PlayerARC Status*\n\n` +
      `${statusText}\n` +
      `${modeText}\n` +
      `${teamText}\n` +
      `Org: ${group.organizationName}`
    );
    return;
  }

  // Help
  if (COMMANDS.HELP.test(body)) {
    await sendGroupMessage(args.groupId,
      `📖 *PlayerARC Commands*\n\n` +
      `*Meetings*\n` +
      `• "playerarc start meeting [title]"\n` +
      `• "playerarc end meeting"\n` +
      `• "playerarc cancel meeting"\n\n` +
      `*Settings*\n` +
      `• "playerarc link [team name]"\n` +
      `• "playerarc pause" / "resume"\n` +
      `• "playerarc status"\n\n` +
      `Voice notes and text during meetings are automatically captured.`
    );
    return;
  }
}
```

#### 5.2 Web UI - Coach Dashboard Addition

```
apps/web/src/app/orgs/[orgId]/coach/groups/
├── page.tsx                    # List of linked WhatsApp groups
├── groups-list.tsx             # Groups table with status
└── [groupId]/
    ├── page.tsx                # Group detail view
    ├── group-settings.tsx      # Configuration form
    └── meeting-history.tsx     # Past meetings list

apps/web/src/app/orgs/[orgId]/coach/meetings/
├── page.tsx                    # All meetings list
└── [meetingId]/
    ├── page.tsx                # Meeting detail view
    ├── meeting-transcript.tsx  # Full transcript with speakers
    └── meeting-insights.tsx    # Extracted insights
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/models/whatsappGroups.ts` | Group CRUD, member tracking |
| `packages/backend/convex/models/whatsappGroupMessages.ts` | Group message storage |
| `packages/backend/convex/models/whatsappMeetingSessions.ts` | Meeting session management |
| `packages/backend/convex/actions/whatsappGroups.ts` | Group processing, meeting pipeline |
| `apps/web/src/app/orgs/[orgId]/coach/groups/*` | Groups UI |
| `apps/web/src/app/orgs/[orgId]/coach/meetings/*` | Meetings UI |

### Modified Files

| File | Changes |
|------|---------|
| `packages/backend/convex/schema.ts` | Add 3 new tables, extend voiceNotes |
| `packages/backend/convex/http.ts` | Extract Author field, route group messages |
| `packages/backend/convex/actions/whatsapp.ts` | Add group message router |
| `packages/backend/convex/actions/voiceNotes.ts` | Add buildMeetingInsights action |
| `packages/backend/convex/models/voiceNotes.ts` | Add createMeetingNote mutation |

---

## Implementation Order

### Week 1: Foundation
- [ ] Schema changes (3 new tables)
- [ ] HTTP webhook updates (Author field extraction)
- [ ] Group message routing
- [ ] Basic group creation flow

### Week 2: Meeting Core
- [ ] Start/end meeting commands
- [ ] Message buffering to sessions
- [ ] Participant tracking
- [ ] Session lifecycle management

### Week 3: Processing Pipeline
- [ ] Audio transcription for group messages
- [ ] Combined transcription builder
- [ ] Meeting voice note creation
- [ ] Enhanced meeting insights prompt

### Week 4: Polish & UI
- [ ] WhatsApp summary messages
- [ ] Group management commands
- [ ] Coach dashboard UI
- [ ] Meeting history view

### Future: Extended Modes
- [ ] Triggered mode (@playerarc capture)
- [ ] Passive mode (time windows)
- [ ] Admin configuration UI

---

## Testing Plan

### Unit Tests
- [ ] Group ID detection (vs individual)
- [ ] Command parsing
- [ ] Transcription combination
- [ ] Speaker attribution

### Integration Tests
- [ ] Full meeting flow (start → messages → end → insights)
- [ ] Multi-coach session
- [ ] Audio + text mixed session
- [ ] Error recovery (failed transcription)

### E2E Tests
- [ ] Twilio sandbox group setup
- [ ] Meeting with voice notes
- [ ] WhatsApp reply verification

---

## Security & Privacy

### Consent
- Clear welcome message when bot joins group
- Explicit "start meeting" required before capture
- Pause/resume commands for control

### Data Isolation
- Groups linked to single organization
- Messages only visible to org coaches
- Insights follow existing RBAC

### Retention
- Meeting sessions follow org data retention policy
- Raw messages can be purged after processing
- Transcriptions stored in voice notes

---

## Open Questions

1. **Default capture mode:** Should new groups default to `meeting_only` or `triggered`?
   - Recommendation: `meeting_only` (safest, most intentional)

2. **Auto-apply in meetings:** Should meeting insights auto-apply based on trust level?
   - Recommendation: Yes, same rules as individual notes

3. **Meeting limits:** Max meeting duration? Max messages per meeting?
   - Recommendation: 2 hour max, 100 messages max (prevents runaway)

4. **Group ownership:** Can any coach in the group change settings?
   - Recommendation: First coach to set up = "owner", can add admins

5. **Cross-team meetings:** What if multiple teams' coaches are in one group?
   - Recommendation: Link to primary team, or leave unlinked (org-level)
