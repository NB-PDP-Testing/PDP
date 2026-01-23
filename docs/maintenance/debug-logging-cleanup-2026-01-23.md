# Debug Logging Cleanup - Voice Notes Integration
**Date:** 2026-01-23
**Status:** 🚧 Cleanup Required

## Summary

Found **extensive debug logging** across voice notes and parent summaries code added in the last 48 hours. This logging was essential during development but should be cleaned up before production.

### Statistics
- **Backend:** 51+ console.log, 20+ console.error, 15+ console.warn
- **Frontend:** 12+ console.log/error statements
- **Total:** 98+ logging statements to review

---

## Backend Files - Cleanup Recommended

### 🔴 HIGH PRIORITY: packages/backend/convex/actions/voiceNotes.ts
**35 console.log statements** - Most are debug logging

#### Debug Logs to Remove (Lines 325-387)
```typescript
// TODO Coaches roster building - EXTENSIVE DEBUG LOGGING
console.log("[TODO Coaches] ========== BUILDING COACHES ROSTER ==========");
console.log(`[TODO Coaches] note.coachId = "${note.coachId}"`);
console.log(`[TODO Coaches] note.coachId type = ${typeof note.coachId}`);
console.log("[TODO Coaches] Looking up recording coach user...");
console.log("[TODO Coaches] ✅ Found recording coach:", recordingCoachUser);
console.log("[TODO Coaches] ❌ Recording coach user NOT found");
console.log("[TODO Coaches] note.coachId is null/undefined!");
console.log("[TODO Coaches] ========== ROSTER BUILD COMPLETE ==========");
console.log(`[TODO Coaches] Final roster size: ${coachesRoster.length}`);
console.log("[TODO Coaches] Roster:", JSON.stringify(coachesRoster));
```

**Recommendation:** Remove all `[TODO Coaches]` debug logs (lines 325-387)

#### Debug Logs to Remove (Lines 436-455)
```typescript
// Player matching debug logs
console.log("[Player Matching] Building player roster...");
console.log(`[Player Matching] Found ${teamPlayerIdentities.length} players`);
console.log(`[Player Matching] Built roster with ${playerRoster.length} players`);
```

**Recommendation:** Remove all `[Player Matching]` debug logs

#### Debug Logs to Remove (Lines 609-760)
```typescript
// AI insight processing debug logs
console.log("[AI Insights] AI returned insights:", aiInsights.length);
console.log(`[AI Insights] Processing insight ${index + 1}/${aiInsights.length}`);
console.log(`[AI Insights] TODO insight with assigneeId: ${todo.assigneeId}`);
console.log(`[AI Insights] Looking up assignee in coaches roster...`);
console.log(`[AI Insights] Found assignee: ${assignedCoach.name}`);
console.log(`[AI Insights] Assignee not found in roster`);
console.log(`[AI Insights] Player "${todo.playerName}" matched to ID: ${matchedPlayer._id}`);
```

**Recommendation:** Remove all `[AI Insights]` debug logs

#### Debug Logs to Remove (Lines 805-898)
```typescript
// Apply insights debug logs
console.log(`[Apply Insight] Applying insight: ${insight.title}`);
console.log(`[Apply Insight] Category: ${insight.category}`);
console.log("[Apply Insight] Creating injury record...");
console.log("[Apply Insight] Creating development goal...");
console.log("[Apply Insight] Updating skill rating...");
console.log("[Apply Insight] Adding to player notes...");
console.log("[Apply Insight] Creating task for TODO...");
```

**Recommendation:** Remove all `[Apply Insight]` debug logs

#### Debug Logs to Remove (Lines 967-988)
```typescript
// AI name correction debug logs
console.log("[AI Name Correction] AI suggested correction:", correctionResult);
console.log("[AI Name Correction] Updating insight with corrected name");
```

**Recommendation:** Remove all `[AI Name Correction]` debug logs

#### Keep These (Production Errors)
```typescript
console.error("Voice note not found:", args.noteId);
console.error("Voice note has no audio:", args.noteId);
console.error("Transcription failed:", error);
console.error("Failed to build insights:", error);
console.warn("⚠️ Voice note has no audio storage ID");
```

**Recommendation:** ✅ Keep all console.error and console.warn

---

### 🔴 HIGH PRIORITY: packages/backend/convex/actions/whatsapp.ts
**16 console.log statements** - WhatsApp processing logs

#### Debug Logs to Remove
```typescript
console.log("[WhatsApp] Processing incoming message:", args.messageSid);
console.log("[WhatsApp] Message stored:", messageId);
console.log("[WhatsApp] No coach found for phone:", phoneNumber);
console.log("[WhatsApp] Matched coach:", coach.userName);
console.log("[WhatsApp] Downloading audio from Twilio...");
console.log("[WhatsApp] Audio downloaded, size:", audioBuffer.byteLength);
console.log("[WhatsApp] Audio uploaded to storage:", storageId);
console.log("[WhatsApp] Voice note created:", noteId);
console.log("[WhatsApp] Creating typed note from text message");
console.log("[WhatsApp] Typed note created:", noteId);
console.log("[WhatsApp] Checking insights status, retry:", retryCount);
console.log("[WhatsApp] Insights not ready, scheduling retry...");
console.log("[WhatsApp] Insights ready, count:", voiceNote.insights.length);
console.log("[WhatsApp] Coach trust level:", trustLevel.currentLevel);
console.log("[WhatsApp] Message sent to:", to);
```

**Recommendation:** Remove all `[WhatsApp]` info logs, keep only errors

#### Keep These (Production Errors)
```typescript
console.error("[WhatsApp] Processing failed:", errorMessage);
console.error("[WhatsApp] Voice note not found:", args.voiceNoteId);
console.error("[WhatsApp] Twilio credentials not configured");
console.error("[WhatsApp] Failed to send message:", error);
console.error("[WhatsApp] Error sending message:", error);
console.error("[WhatsApp] Failed to apply insight:", insight.id, error);
```

**Recommendation:** ✅ Keep all console.error

---

### 🟡 MEDIUM PRIORITY: packages/backend/convex/actions/coachParentSummaries.ts
**8 console.log statements with emojis**

#### Debug Logs to Remove
```typescript
console.log("🔄 Processing voice note insight for parent summary", {...});
console.log("📊 Classification result:", classification);
console.log("✍️ Generated summary:", {...});
console.log("✅ Parent summary created successfully");
console.log("📧 Generating parent summary for:", {...});
console.log("📄 PDF document created:", {...});
```

**Recommendation:** Remove emoji logs, they're debug-only

#### Keep These (Production Errors/Warnings)
```typescript
console.error("❌ Player not found:", args.playerIdentityId);
console.error("❌ Player has no enrollment:", args.playerIdentityId);
console.error("❌ Sport not found:", passport.sportCode);
console.error("❌ Error processing voice note insight:", error);
console.warn("Failed to load font weight", error);
console.warn("Font loading failed, using system fonts:", error);
console.warn("Failed to fetch PlayerARC logo:", error);
console.warn("Failed to fetch organization logo:", error);
```

**Recommendation:** ✅ Keep errors/warnings (but remove emojis from errors)

---

### 🟡 MEDIUM PRIORITY: packages/backend/convex/models/voiceNotes.ts
**5 console.log statements**

#### Debug Logs to Remove
```typescript
console.log("🔥 BACKEND createTypedNote: coachId =", args.coachId);
console.log("🔥 BACKEND createTypedNote: orgId =", args.orgId);
console.log(`✅ AI corrected player name: "${insight.playerName}"`);
console.log(`  Title: "${insight.title}" -> "${correctedTitle}"`);
console.log("  Description also corrected");
console.log("  RecommendedUpdate also corrected");
console.log(`📝 Creating task for TODO insight: "${insight.title}"`);
console.log(`✅ Task created with ID: ${taskId}`);
```

**Recommendation:** Remove all debug logs with emojis

---

### 🟢 LOW PRIORITY: packages/backend/convex/models/coachParentSummaries.ts
**3 console.log statements**

#### Debug Logs to Remove
```typescript
console.log("📧 Generating parent summary for insight:", {...});
console.log("📄 PDF generated:", {...});
```

**Recommendation:** Remove emoji logs

#### Keep These (Production Errors)
```typescript
console.error("Error fetching summaries", error);
console.error("Error marking summary as viewed", error);
console.error("Error acknowledging summary", error);
```

**Recommendation:** ✅ Keep console.error

---

### 🟢 LOW PRIORITY: packages/backend/convex/betterAuth/userFunctions.ts
**6 console.log statements**

#### Debug Logs to Remove
```typescript
console.log(`[betterAuth.getUserByStringId] Looking up user with ID: ${args.userId}`);
console.log(`[betterAuth.getUserByStringId] ✅ FOUND user: ${user.email}`);
console.log(`[betterAuth.getUserByStringId] Sample user IDs: ${...}`);
console.log("[updateUserProfile] Updated user:", args.userId, updates);
```

**Recommendation:** Remove debug logs

#### Keep These (Production Errors)
```typescript
console.error("[updateUserProfile] User not found:", args.userId);
console.error("[updateUserProfile] Error:", error);
console.error(`[betterAuth.getUserByStringId] ❌ User not found for ID: ${args.userId}`);
console.error(`[betterAuth.getUserByStringId] ERROR: ${error.message}`);
```

**Recommendation:** ✅ Keep console.error (but remove emojis)

---

## Frontend Files - Cleanup Recommended

### 🟡 MEDIUM PRIORITY: apps/web/src/app/orgs/[orgId]/parents/page.tsx
**3 console.log statements**

#### Debug Logs to Remove
```typescript
console.log("Claimable identities check:", {
  hasChildren,
  hasClaimableIdentities,
  claimableIdentitiesCount,
  userId: session?.user?.id,
});

console.log(
  "Rendering parent page, showRegistration:",
  showRegistration,
  "hasClaimableIdentities:",
  hasClaimableIdentities
);
```

**Recommendation:** Remove debug logs

#### Keep These (Production Errors)
```typescript
console.error("Failed to decline guardian connection:", error);
console.error("Failed to mark summary as viewed:", error);
console.error("Failed to acknowledge summary:", error);
```

**Recommendation:** ✅ Keep console.error

---

### 🟢 LOW PRIORITY: apps/web/.../insights-tab.tsx
**9 console.error statements**

#### Keep All (These are error handlers)
```typescript
console.error("Failed to assign player:", error);
console.error("Failed to assign team:", error);
console.error("Failed to assign coach:", error);
console.error("Failed to classify insight:", error);
console.error("Failed to apply insight:", error);
console.error("Failed to dismiss insight:", error);
console.error("Failed to bulk apply insights:", error);
console.error("Failed to update insight:", error);
```

**Recommendation:** ✅ Keep all - these are proper error handling

---

## Cleanup Strategy

### Phase 1: Remove Debug Logging (Immediate)
**Files:**
1. `packages/backend/convex/actions/voiceNotes.ts` - Remove 35 debug logs
2. `packages/backend/convex/actions/whatsapp.ts` - Remove 16 debug logs
3. `packages/backend/convex/actions/coachParentSummaries.ts` - Remove emoji logs
4. `packages/backend/convex/models/voiceNotes.ts` - Remove debug logs
5. `apps/web/src/app/orgs/[orgId]/parents/page.tsx` - Remove 3 debug logs

**Impact:** Cleaner logs, better performance, production-ready code

### Phase 2: Clean Up Error Messages (Optional)
**Files:**
- Remove emojis from console.error statements (❌, ✅, 🔥, etc.)
- More professional error messages for production
- Keep descriptive error context

### Phase 3: Consider Structured Logging (Future)
**Recommendation:**
- Implement proper logging library (e.g., Pino, Winston)
- Log levels: error, warn, info, debug
- Environment-based logging (verbose in dev, errors-only in prod)
- Structured JSON logs for better monitoring

---

## Summary of Recommended Removals

| File | console.log | console.error | console.warn | Action |
|------|-------------|---------------|--------------|--------|
| voiceNotes.ts (action) | 35 | 6 (keep) | 3 (keep) | Remove 35 logs |
| whatsapp.ts | 16 | 6 (keep) | 0 | Remove 16 logs |
| coachParentSummaries.ts | 8 | 4 (keep) | 4 (keep) | Remove 8 logs |
| voiceNotes.ts (model) | 5 | 0 | 0 | Remove 5 logs |
| userFunctions.ts | 4 | 4 (keep) | 0 | Remove 4 logs |
| parents/page.tsx | 3 | 3 (keep) | 0 | Remove 3 logs |
| coachParentSummaries.ts (model) | 2 | 3 (keep) | 0 | Remove 2 logs |
| **TOTAL** | **73 to remove** | **26 to keep** | **7 to keep** | |

---

## Automated Cleanup Script

Create a cleanup script to remove all debug logging:

```bash
#!/bin/bash
# cleanup-debug-logs.sh

# Remove TODO Coaches debug logs
sed -i '' '/console\.log.*\[TODO Coaches\]/d' packages/backend/convex/actions/voiceNotes.ts

# Remove Player Matching debug logs
sed -i '' '/console\.log.*\[Player Matching\]/d' packages/backend/convex/actions/voiceNotes.ts

# Remove AI Insights debug logs
sed -i '' '/console\.log.*\[AI Insights\]/d' packages/backend/convex/actions/voiceNotes.ts

# Remove Apply Insight debug logs
sed -i '' '/console\.log.*\[Apply Insight\]/d' packages/backend/convex/actions/voiceNotes.ts

# Remove WhatsApp info logs (keep errors)
sed -i '' '/console\.log.*\[WhatsApp\]/d' packages/backend/convex/actions/whatsapp.ts

# Remove emoji debug logs
sed -i '' '/console\.log.*[🔥🔄📊✅❌✍️📧📄]/d' packages/backend/convex/

# Remove frontend debug logs
sed -i '' '/console\.log.*Claimable identities/d' apps/web/src/app/orgs/\[orgId\]/parents/page.tsx
sed -i '' '/console\.log.*Rendering parent page/d' apps/web/src/app/orgs/\[orgId\]/parents/page.tsx
```

---

## Next Steps

1. ✅ Review this document
2. [ ] Run manual cleanup or use automated script
3. [ ] Test that error logging still works correctly
4. [ ] Commit cleanup: "chore: Remove debug logging from voice notes integration"
5. [ ] Consider implementing structured logging for future features
