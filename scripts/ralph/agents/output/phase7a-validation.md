## Architecture Re-Validation - Phase 7A - 2026-02-08

### Validation Results

- [PASS] **Line numbers verified**: createTypedNote=554 (insert at 566, scheduler at 579), createRecordedNote=591 (insert at 603, scheduler at 616), buildInsights=311, createArtifact=62, linkToVoiceNote=103, updateArtifactStatus=132, createTranscript=25, extractClaims=427 -- ALL match current source code.
- [PASS] **Function signatures verified**: All 10 functions in `verifiedFunctionSignatures` match the actual source code (args, returns, types).
- [PASS] **Import availability**: `internal` imported at line 2 of `models/voiceNotes.ts` (`import { components, internal } from "../_generated/api";`). `internal` imported at line 7 of `actions/voiceNotes.ts`. No duplicate import needed.
- [PASS] **sourceChannel validator**: `voiceNoteArtifacts.ts` lines 16-21 includes `app_typed` and `app_recorded` literals. PRD uses `'app_typed' as const` and `'app_recorded' as const` -- valid.
- [PASS] **ctx.runQuery/ctx.runMutation in public mutation**: Verified both Convex docs and existing codebase patterns (`models/members.ts` addFunctionalRole at line 268 is a public `mutation` using both `ctx.runQuery` and `ctx.runMutation`). Pattern is valid.
- [PASS] **Timing safety for US-VN-022**: Artifact creation (`ctx.runMutation`) happens synchronously inside the mutation handler BEFORE `ctx.scheduler.runAfter(buildInsights)` at line 579/616. Scheduler fires AFTER the transaction commits. By the time `buildInsights` executes as a separate action, all artifact data is committed.
- [PASS] **Timing safety for US-VN-023**: `getArtifactsByVoiceNote` uses `by_voiceNoteId` index (line 195 of voiceNoteArtifacts.ts). The artifact was linked via `linkToVoiceNote` in the same parent mutation transaction. When `buildInsights` runs asynchronously, the index is available. No race condition.
- [PASS] **Typed note flow**: createArtifact -> linkToVoiceNote -> createTranscript -> updateArtifactStatus -> schedule extractClaims. Order is correct. `createTranscript` takes `artifactId: v.id("voiceNoteArtifacts")` (Convex _id from createArtifact return). `updateArtifactStatus` takes `artifactId: v.string()` (UUID string). PRD correctly uses `artifactConvexId` for createTranscript/extractClaims and `artifactIdStr` for linkToVoiceNote/updateArtifactStatus.
- [PASS] **Recorded note flow**: createArtifact -> linkToVoiceNote only. transcribeAudio at line 229 already queries `getArtifactsByVoiceNote` and handles transcript creation + extractClaims scheduling (lines 233-263). No additional work needed in createRecordedNote.
- [PASS] **buildInsights skip check location**: At the START of the handler (line 316+), after getting the note from db. The PRD correctly places the artifact-exists check right after the note retrieval. This is the correct location -- before any AI processing occurs.
- [PASS] **.filter() audit**: All 4 audit-scope files use only JavaScript array `.filter()` (post-`.collect()` or on fetched arrays), NOT Convex query `.filter()`:
  - `entityResolution.ts` line 134: `claims.filter(...)` -- JS array filter
  - `draftGeneration.ts` line 319: `drafts.filter(...)` -- JS array filter
  - `voiceNoteEntityResolutions.ts` lines 258, 266: JS array filter
  - `insightDrafts.ts` lines 164, 387: JS array filter
  - No Convex `.filter()` violations found. Ralph should confirm and move on.

### Blocking Concerns

- None found.

### Non-Blocking Observations

1. **Performance overhead of ctx.runMutation chain**: US-VN-022 adds 4-5 sequential `ctx.runMutation` calls inside `createTypedNote` when v2 is ON (shouldUseV2Pipeline, createArtifact, linkToVoiceNote, createTranscript, updateArtifactStatus). Convex docs note that each `ctx.runMutation` incurs argument validation and JS context isolation overhead. For a user-facing mutation, this is acceptable but adds latency. Consider refactoring to a single internalMutation in a future phase if latency is observed. NOT a blocker for Phase 7A.

2. **console.log in buildInsights skip**: The PRD instructs adding `console.log('[buildInsights] Skipping v1 extraction...')`. The project has a Stop hook that warns about `console.log` in changed files. Ralph may see this warning at session end. This is intentional -- backend action logging is standard practice in this codebase (`console.error` already used at lines 323, 329 of buildInsights). Ralph should ignore the console.log warning for this specific addition.

3. **No existing precedent for ctx.runQuery(internal....) in public mutations**: All existing `ctx.runQuery(internal....)` calls are in actions/internalActions. Phase 7A will be the first to call `internal.lib.featureFlags.shouldUseV2Pipeline` from a public `mutation`. This is valid per Convex docs but novel in this codebase. If Ralph encounters type errors, verify that `internal` codegen includes the full path `internal.lib.featureFlags.shouldUseV2Pipeline`.

4. **transcribeAudio still schedules buildInsights unconditionally (line 287)**: For recorded notes with v2 ON, both extractClaims (line 259) and buildInsights (line 287) will be scheduled. The US-VN-023 defense-in-depth check inside buildInsights catches this. Phase 7D will add the scheduling gate. NOT a concern for Phase 7A -- this is the documented two-phase approach from ADR-VN2-034.

5. **claimsExtraction.ts flagged for .filter()**: Auto quality check flagged `claimsExtraction.ts` for `.filter()` usage, but this file is NOT in the US-VN-023 audit scope. Ralph should check it anyway -- if it is JS array `.filter()`, ignore it. If Convex query `.filter()`, flag it but do not fix unless trivial.

### Conclusion

**READY** for Ralph implementation. All function signatures, line numbers, insertion points, ID types, and timing assumptions have been validated against current source code. The PRD is thorough and correct. No new ADRs are needed.
