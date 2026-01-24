# WhatsApp Voice Notes - Comprehensive Test Plan

**Feature**: WhatsApp Voice Notes with Multi-Org Detection
**Version**: 1.0 (Post Issue #315 Fix)
**Last Updated**: January 24, 2026

---

## Overview

This document provides comprehensive UAT test scenarios for the WhatsApp voice notes integration, covering:
1. Phone number matching
2. Multi-org detection (6 strategies)
3. Session memory (2-hour window)
4. Pending message queue (24-hour expiry)
5. Trust-based auto-apply logic
6. WhatsApp response messages
7. Error handling

---

## Test Data Requirements

### Required Setup

| Entity | Details |
|--------|---------|
| **Single-org coach** | Coach belonging to 1 organization only |
| **Multi-org coach** | Coach belonging to 2+ organizations |
| **Organizations** | Grange FC (soccer), St. Mary's GAA (hurling) |
| **Teams** | U12 Boys, U14 Girls, Senior Men |
| **Players** | 5+ players per team (various names) |
| **Trust levels** | Level 0, Level 2, Level 3 coaches |

### Phone Numbers

```
+353851234567 - Single-org coach (Grange FC)
+353859876543 - Multi-org coach (Grange FC + St. Mary's GAA)
+353850000000 - Unregistered number
```

---

## Test Scenarios

### Category 1: Phone Number Matching

#### TC-WA-001: Valid Phone - Single Org Coach
**Precondition**: Coach with phone +353851234567 belongs to Grange FC only
**Input**: WhatsApp message from +353851234567
**Expected**:
- Coach matched successfully
- Organization resolved via "single_org" strategy
- Message processed immediately
- Response: "Note received. Processing..."

#### TC-WA-002: Valid Phone - Multi Org Coach
**Precondition**: Coach with phone +353859876543 belongs to 2 orgs
**Input**: WhatsApp message "Good session today" from +353859876543
**Expected**:
- Coach matched successfully
- Ambiguity detected (no context clues)
- Pending message created
- Response: "Hi [Name]! You're a coach at multiple clubs..."

#### TC-WA-003: Unregistered Phone Number
**Precondition**: No user with phone +353850000000
**Input**: WhatsApp message from +353850000000
**Expected**:
- Status: "unmatched"
- Response: "Your phone number isn't linked to a coach account in PlayerArc..."

#### TC-WA-004: Phone Number Normalization
**Precondition**: Coach registered with phone "+353 85 123 4567" (with spaces)
**Input**: WhatsApp message from "whatsapp:+353851234567" (no spaces)
**Expected**:
- Phone numbers match after normalization
- Coach found successfully

---

### Category 2: Multi-Org Detection Strategies

#### TC-WA-010: Single Org Resolution
**Precondition**: Coach belongs to only Grange FC
**Input**: Any message
**Expected**:
- resolvedVia: "single_org"
- No clarification needed

#### TC-WA-011: Explicit Mention - Prefix Pattern
**Precondition**: Multi-org coach (Grange FC + St. Mary's)
**Input**: "Grange: Great practice today with the boys"
**Expected**:
- resolvedVia: "explicit_mention"
- Organization: Grange FC
- No clarification needed

#### TC-WA-012: Explicit Mention - @ Pattern
**Precondition**: Multi-org coach
**Input**: "@St. Mary's Training was excellent today"
**Expected**:
- resolvedVia: "explicit_mention"
- Organization: St. Mary's GAA

#### TC-WA-013: Explicit Mention - "for" Pattern
**Precondition**: Multi-org coach
**Input**: "This note is for Grange - John did well"
**Expected**:
- resolvedVia: "explicit_mention"
- Organization: Grange FC

#### TC-WA-014: Team Name Match
**Precondition**: Multi-org coach with teams "U12 Boys" (Grange) and "U16 Hurlers" (St. Mary's)
**Input**: "U12 Boys played brilliantly today"
**Expected**:
- resolvedVia: "team_match"
- Organization: Grange FC (where U12 Boys exists)

#### TC-WA-015: Age Group Match - U Pattern
**Precondition**: Multi-org coach with U12 assignment at Grange only
**Input**: "u12 training went well"
**Expected**:
- resolvedVia: "age_group_match"
- Organization: Grange FC

#### TC-WA-016: Age Group Match - Under Pattern
**Precondition**: Multi-org coach with under-14 assignment at St. Mary's only
**Input**: "Under 14 session was tough"
**Expected**:
- resolvedVia: "age_group_match"
- Organization: St. Mary's GAA

#### TC-WA-017: Age Group Match - Plural Pattern
**Precondition**: Multi-org coach with U12 at Grange only
**Input**: "The twelves did great work today"
**Expected**:
- resolvedVia: "age_group_match"
- Organization: Grange FC

#### TC-WA-018: Sport Match - Soccer Keywords
**Precondition**: Multi-org coach with soccer at Grange, hurling at St. Mary's
**Input**: "Soccer practice focused on passing drills"
**Expected**:
- resolvedVia: "sport_match"
- Organization: Grange FC

#### TC-WA-019: Sport Match - GAA Keywords
**Precondition**: Multi-org coach
**Input**: "GAA training went well, hurling skills improving"
**Expected**:
- resolvedVia: "sport_match"
- Organization: St. Mary's GAA

#### TC-WA-020: Player Name Match
**Precondition**: Multi-org coach; player "Aoife Murphy" only at Grange FC
**Input**: "Aoife did brilliant work on her left foot today"
**Expected**:
- resolvedVia: "player_match"
- Organization: Grange FC

#### TC-WA-021: Coach Name Match
**Precondition**: Multi-org coach; assistant coach "Sarah" only at St. Mary's
**Input**: "Covered for coach Sarah today, good session"
**Expected**:
- resolvedVia: "coach_match"
- Organization: St. Mary's GAA

#### TC-WA-022: Session Memory Fallback
**Precondition**: Multi-org coach; previous message was to Grange FC < 2 hours ago
**Input**: Message without context clues
**Expected**:
- resolvedVia: "session_memory"
- Organization: Grange FC (from previous message)

#### TC-WA-023: Session Memory Expired
**Precondition**: Multi-org coach; previous message was > 2 hours ago
**Input**: Message without context clues
**Expected**:
- Session memory not used (expired)
- Clarification requested

---

### Category 3: Team ID vs Team Name Resolution (Issue #315 Fix)

#### TC-WA-030: Coach Assignment with Team Names
**Precondition**: coachAssignment.teams = ["U12 Boys", "U14 Girls"]
**Input**: Any message from this coach
**Expected**:
- Teams resolved by matching names against org's team table
- No "Invalid ID length" error

#### TC-WA-031: Coach Assignment with Team IDs
**Precondition**: coachAssignment.teams = ["jh76gys...", "k17fkej..."]
**Input**: Any message from this coach
**Expected**:
- Teams resolved by matching IDs against org's team table
- Works correctly

#### TC-WA-032: Coach Assignment with Mixed Format
**Precondition**: coachAssignment.teams = ["U12 Boys", "k17fkej..."]
**Input**: Any message from this coach
**Expected**:
- Both name and ID resolved correctly
- No errors

---

### Category 4: Org Selection Response

#### TC-WA-040: Valid Numeric Selection
**Precondition**: Pending message with orgs [Grange FC, St. Mary's GAA]
**Input**: "1"
**Expected**:
- Org selected: Grange FC
- Session updated
- Pending message resolved
- Response: "Got it! Recording for Grange FC. Processing your note..."

#### TC-WA-041: Valid Name Selection
**Precondition**: Pending message
**Input**: "grange"
**Expected**:
- Org selected: Grange FC (fuzzy match)
- Pending message resolved

#### TC-WA-042: Invalid Numeric Selection
**Precondition**: Pending message with 2 orgs
**Input**: "5"
**Expected**:
- Selection not understood
- Response: "Sorry, I didn't understand. Please reply with the number (1, 2, etc.)..."

#### TC-WA-043: Invalid Text Selection
**Precondition**: Pending message
**Input**: "xyz club"
**Expected**:
- No org matched
- Re-prompt for selection

---

### Category 5: Session Memory

#### TC-WA-050: Session Created on First Message
**Precondition**: No existing session for phone
**Input**: First message from multi-org coach (with explicit org mention)
**Expected**:
- New session created
- Session stores: phoneNumber, coachId, orgId, orgName, resolvedVia, lastMessageAt

#### TC-WA-051: Session Updated on Subsequent Message
**Precondition**: Existing session for phone
**Input**: Second message with different org context
**Expected**:
- Session updated with new org
- lastMessageAt updated

#### TC-WA-052: Session Expires After 2 Hours
**Precondition**: Session exists, lastMessageAt = 2.5 hours ago
**Input**: Message without context clues
**Expected**:
- Session not used (isExpired = true)
- Clarification requested

---

### Category 6: Pending Message Queue

#### TC-WA-060: Pending Message Created
**Precondition**: Multi-org coach, no context clues
**Input**: Voice note
**Expected**:
- Audio downloaded and stored (mediaStorageId set)
- Pending message created with status "awaiting_selection"
- expiresAt = now + 24 hours

#### TC-WA-061: Pending Message Resolved
**Precondition**: Pending message exists
**Input**: Valid org selection
**Expected**:
- Pending message status → "resolved"
- Voice note created with selected org
- Auto-apply scheduled

#### TC-WA-062: Pending Message Expired
**Precondition**: Pending message created > 24 hours ago
**Input**: Any selection response
**Expected**:
- Pending message status → "expired"
- Returns null (no pending message)
- New message processed as fresh

---

### Category 7: Message Type Processing

#### TC-WA-070: Text Message
**Precondition**: Single-org coach
**Input**: Text message "John showed great improvement"
**Expected**:
- messageType: "text"
- Voice note created via createTypedNote
- source: "whatsapp_text"
- Auto-apply scheduled after 15 seconds

#### TC-WA-071: Audio Message (Voice Note)
**Precondition**: Single-org coach
**Input**: Audio message (audio/ogg)
**Expected**:
- messageType: "audio"
- Audio downloaded from Twilio
- Stored in Convex storage
- Voice note created via createRecordedNote
- source: "whatsapp_audio"
- Auto-apply scheduled after 30 seconds

#### TC-WA-072: Unsupported Message Type
**Precondition**: Single-org coach
**Input**: Image message
**Expected**:
- messageType: "image"
- Status: "failed"
- Response: "Sorry, I can only process text messages and voice notes..."

---

### Category 8: Trust-Based Auto-Apply

#### TC-WA-080: Trust Level 0 - No Auto-Apply
**Precondition**: Coach with trust level 0
**Input**: Voice note with skill_progress insight
**Expected**:
- Insight NOT auto-applied
- needsReview includes insight with reason: "low_trust"
- Response shows "Needs review (N)"

#### TC-WA-081: Trust Level 2 - Safe Categories Auto-Apply
**Precondition**: Coach with trust level 2
**Input**: Voice note with skill_progress insight
**Expected**:
- Insight auto-applied
- Response shows "Auto-applied (N)"

#### TC-WA-082: Trust Level 2 - Sensitive Categories Never Auto-Apply
**Precondition**: Coach with trust level 2
**Input**: Voice note with injury insight
**Expected**:
- Insight NOT auto-applied
- needsReview includes insight with reason: "sensitive"

#### TC-WA-083: Trust Level 3 - Parent Summary Queued
**Precondition**: Coach with trust level 3
**Input**: Voice note with player skill insight
**Expected**:
- Insight auto-applied
- parentSummaryQueued: true
- Response shows " -> Parent" indicator

#### TC-WA-084: Unmatched Player Insight
**Precondition**: Any trust level
**Input**: Voice note mentioning player not in roster
**Expected**:
- Insight added to unmatched array
- Response shows "Unmatched (N): '[name]' not in roster"

#### TC-WA-085: TODO Without Assignee
**Precondition**: Trust level 2+
**Input**: Voice note generating TODO insight without assignee
**Expected**:
- Insight NOT auto-applied
- needsReview with reason: "todo_needs_assignment"

---

### Category 9: WhatsApp Response Messages

#### TC-WA-090: Acknowledgment - Text (Single Org)
**Expected**: "Note received. Processing..."

#### TC-WA-091: Acknowledgment - Text (Multi Org)
**Expected**: "Note received for [Org Name]. Processing..."

#### TC-WA-092: Acknowledgment - Audio (Single Org)
**Expected**: "Voice note received. Transcribing..."

#### TC-WA-093: Acknowledgment - Audio (Multi Org)
**Expected**: "Voice note received for [Org Name]. Transcribing..."

#### TC-WA-094: Insights Failed
**Expected**: "Your note was saved but AI analysis failed. View it at: [SITE_URL]"

#### TC-WA-095: Still Processing
**Expected**: "Your note is still being processed. Check back at: [SITE_URL]"

#### TC-WA-096: Results Summary - Mixed
**Expected**:
```
Analysis complete!

Auto-applied (2):
- John: Skill
- Sarah: Rating

Needs review (1):
- Jake: Injury

Unmatched (1):
- 'Michael' not in roster

Review 2 pending in the app: [SITE_URL]
```

#### TC-WA-097: Results Summary - All Applied
**Expected**:
```
Analysis complete!

Auto-applied (3):
- John: Skill
- Sarah: Rating
- Emma: Attendance

All insights applied!
```

---

### Category 10: Error Handling

#### TC-WA-100: Twilio Credentials Missing
**Precondition**: TWILIO_ACCOUNT_SID not set
**Expected**:
- Error logged
- Graceful failure

#### TC-WA-101: Audio Download Failed
**Precondition**: Invalid media URL
**Expected**:
- Error thrown
- Status: "failed"
- Response: "Sorry, there was an error processing your message..."

#### TC-WA-102: Voice Note Creation Failed
**Precondition**: Database error during voice note creation
**Expected**:
- Error logged
- Status: "failed"
- Response: "Sorry, there was an error processing your note..."

#### TC-WA-103: Insights Never Complete (Max Retries)
**Precondition**: Insights stuck in "processing" state
**Expected**:
- After 5 retries (50 seconds total)
- Response: "Your note is still being processed. Check back at: [SITE_URL]"

---

## URL Validation

All URLs use `SITE_URL` environment variable only (no hardcoded fallback).

| Scenario | Expected Message (with SITE_URL set) | Expected Message (SITE_URL not set) |
|----------|--------------------------------------|-------------------------------------|
| Insights failed | "View it at: {SITE_URL}" | "Check the app for details." |
| Still processing | "Check back at: {SITE_URL}" | "Check back in the app." |
| Pending review | "Review N pending in the app: {SITE_URL}" | "Review N pending in the app." |

---

## Test Execution Notes

### Prerequisites

1. Dev/staging Convex deployment
2. Twilio sandbox configured
3. Test phone numbers registered in sandbox
4. Test data seeded (orgs, teams, players, coaches)

### Test Order

1. Phone matching tests (TC-WA-001 to TC-WA-004)
2. Single-org flow (TC-WA-070, TC-WA-071)
3. Multi-org detection (TC-WA-010 to TC-WA-023)
4. Issue #315 regression (TC-WA-030 to TC-WA-032)
5. Pending message flow (TC-WA-060 to TC-WA-062)
6. Trust-based auto-apply (TC-WA-080 to TC-WA-085)
7. Response messages (TC-WA-090 to TC-WA-097)
8. Error handling (TC-WA-100 to TC-WA-103)

### Clean-up Between Tests

- Clear whatsappSessions table
- Clear whatsappPendingMessages table
- Reset trust levels to baseline

---

## Sign-Off

| Category | Total Tests | Pass | Fail | Blocked |
|----------|-------------|------|------|---------|
| Phone Matching | 4 | | | |
| Multi-Org Detection | 14 | | | |
| Team ID/Name Fix | 3 | | | |
| Org Selection | 4 | | | |
| Session Memory | 3 | | | |
| Pending Messages | 3 | | | |
| Message Types | 3 | | | |
| Trust Auto-Apply | 6 | | | |
| Response Messages | 8 | | | |
| Error Handling | 4 | | | |
| **TOTAL** | **52** | | | |

**Tested By**: _______________
**Date**: _______________
**Result**: _______________

---

*Generated by Claude Code - January 24, 2026*
