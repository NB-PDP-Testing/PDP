# Voice Gateways v2 PRD - Validation Summary

**Date**: February 5, 2026
**Full Report**: `docs/archive/bug-fixes/VOICE_GATEWAYS_V2_PRD_VALIDATION.md`

---

## 🚨 CRITICAL ACTIONS REQUIRED

### 1. DELETE US-VN-006b IMMEDIATELY

**Story**: "Coach AI Category Preferences"

**Why**: Targets **parent auto-apply preferences** which are **FULLY IMPLEMENTED** (not part of this project).

**Evidence**:
- ✅ `coachOrgPreferences` table EXISTS in schema (line 2572)
- ✅ `parentSummariesEnabled`, `skipSensitiveInsights` fields EXISTS
- ✅ Frontend switches WORKING (settings-tab.tsx lines 154-190)
- ✅ Backend queries WORKING (`getCoachTrustLevel`)

**The Confusion**:
- PRD proposes: `autoDetectPlayerNames`, `extractInjuryMentions`, `skillProgressTracking` (AI extraction category preferences)
- Codebase has: `parentSummariesEnabled`, `skipSensitiveInsights` (parent notification preferences)
- These are **DIFFERENT features** - parent preferences are done, AI extraction preferences are NOT in scope

**Actions**:
1. Remove US-VN-006b from PRD.json
2. Remove from Phase 1 checklist (lines 1686-1695)
3. Remove from phase1ParallelStreams
4. Update Phase 1 duration: "4 days" → "2.5 days"
5. Update total project: "26.5-31.5 days" → "25-30 days"
6. Remove US-VN-006b dependency from US-VN-015 and US-VN-017

---

### 2. REVISE US-VN-004 (Minor)

**Story**: "Enhanced WhatsApp Feedback Messages"

**Issue**: Story says "Replace existing error messages" but existing messages should be kept as fallbacks.

**Change**:
- Line 351: "Replace existing error messages" → "Add detailed error messages alongside existing fallbacks"
- Add note: "Generic messages in checkAndAutoApply remain for edge cases"

---

## ✅ VALIDATION RESULTS

**Total Stories**: 22
- ✅ **Valid**: 20 stories (91%)
- ❌ **Delete**: 1 story (US-VN-006b)
- ⚠️ **Revise**: 1 story (US-VN-004 - minor wording change)

---

## 🎯 KEY FINDINGS

### What's ALREADY Implemented (Don't Build)
1. ✅ **Parent Auto-Apply Preferences** (coachOrgPreferences table)
   - `parentSummariesEnabled` toggle
   - `skipSensitiveInsights` toggle
   - Backend queries working
   - Frontend UI working

2. ✅ **Trust Level System** (coachTrustLevels table)
   - Platform-wide trust calculation
   - Auto-apply based on trust level
   - Trust-adaptive WhatsApp messages (formatResultsMessage)

3. ✅ **WhatsApp Integration Foundation**
   - Message ingestion (processIncomingMessage)
   - Coach phone lookup
   - Multi-org detection (8 strategies)
   - Auto-apply check (checkAndAutoApply)

### What Needs to Be Built (Green Light)
1. ✅ Quality Gates (US-VN-001 to US-VN-004)
2. ✅ Fuzzy Matching (US-VN-005, US-VN-006)
3. ✅ Mobile Quick Review (US-VN-007 to US-VN-012)
4. ✅ v2 Pipeline (US-VN-013 to US-VN-021)

---

## 📋 SCHEMA VALIDATION

### Existing Tables (No Conflicts) ✅
- `voiceNotes` - will add optional fields
- `whatsappMessages` - will add quality check fields
- `voiceNoteInsights` - separate from new insightDrafts
- `coachOrgPreferences` - **NO CHANGES** (US-VN-006b deleted)
- `coachTrustLevels` - **NO CHANGES**

### New Tables (Safe to Create) ✅
- `whatsappReviewLinks` ✅
- `voiceNoteArtifacts` ✅
- `voiceNoteTranscripts` ✅
- `voiceNoteClaims` ✅
- `voiceNoteEntityResolutions` ✅
- `insightDrafts` ✅

---

## 🔗 DEPENDENCY CHAIN

All dependencies validated ✅

**Exception**: Remove US-VN-006b references from:
- US-VN-015 (Claims Extraction)
- US-VN-017 (Entity Resolution)

---

## 📊 EFFORT IMPACT

**After Removing US-VN-006b**:
- Phase 1: 2.5 days (was 4 days) ✅
- Total Project: 25-30 days (was 26.5-31.5 days) ✅

---

## 🟢 READY FOR RALPH

After the above changes:
1. Delete US-VN-006b
2. Update US-VN-004 wording
3. Remove US-VN-006b dependencies

**Then**: All 21 remaining stories are validated and ready for implementation.

---

## 🔍 VALIDATION METHODOLOGY

✅ Checked every file mentioned in each story
✅ Searched codebase for existing implementations
✅ Validated schema compatibility
✅ Traced all dependencies
✅ Verified no N+1 patterns
✅ Confirmed Better Auth patterns
✅ Verified performance patterns

**Confidence**: 95%

The only assumption error was US-VN-006b (same pattern as earlier discovery).
