# ADR-VN2-032: Migration v1 Field Mapping and Idempotency

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-021

## Context and Problem Statement

The v1-to-v2 migration script must map v1 `voiceNotes` records to v2 `voiceNoteArtifacts`, `voiceNoteTranscripts`, and `voiceNoteClaims`. The field mapping is not straightforward because the v1 and v2 schemas differ significantly.

## v1 to v2 Field Mapping

### voiceNotes -> voiceNoteArtifacts

| v1 Field | v2 Field | Mapping |
|----------|----------|---------|
| _id | voiceNoteId | Direct link (v.id("voiceNotes")) |
| (generated) | artifactId | crypto.randomUUID() |
| source | sourceChannel | Direct if exists, else "app_recorded" default |
| coachId | senderUserId | Direct |
| orgId | orgContextCandidates | `[{ organizationId: orgId, confidence: 1.0 }]` |
| audioStorageId | rawMediaStorageId | Direct (optional) |
| insightsStatus | status | See status mapping below |
| (none) | metadata | `{ mimeType: "audio/ogg" }` if audioStorageId exists |
| _creationTime | createdAt | Use v1 creation time |

**Status Mapping (v1 insightsStatus -> v2 artifact status)**:
| v1 insightsStatus | v2 status |
|-------------------|-----------|
| completed | completed |
| failed | failed |
| pending | processing |
| processing | processing |
| awaiting_confirmation | processing |
| cancelled | failed |
| (missing/null) | completed (if transcription exists) or received |

### voiceNotes -> voiceNoteTranscripts

| v1 Field | v2 Field | Mapping |
|----------|----------|---------|
| transcription | fullText | Direct (string) |
| (none) | segments | `[{ text: transcription, startTime: 0, endTime: 0, confidence: 0.5 }]` |
| (none) | modelUsed | "whisper-1-migrated" (indicates migration origin) |
| (none) | language | "en" (default, actual language unknown) |
| (none) | duration | 0 (unknown for migrated notes) |
| (now) | createdAt | Use current timestamp (migration time) |

**Only create transcript if `voiceNote.transcription` is a non-empty string.**

### voiceNotes.insights[] -> voiceNoteClaims

| v1 Insight Field | v2 Claim Field | Mapping |
|-----------------|----------------|---------|
| id | claimId | Direct (or generate if missing) |
| (none) | artifactId | Link to created artifact._id |
| (combined) | sourceText | `insight.title + ": " + insight.description` |
| category | topic | See category mapping below |
| title | title | Direct |
| description | description | Direct |
| recommendedUpdate | recommendedAction | Direct |
| playerIdentityId | resolvedPlayerIdentityId | Direct (if exists) |
| playerName | resolvedPlayerName | Direct (if exists) |
| confidence | extractionConfidence | Direct (or 0.5 default if missing) |
| (from voiceNote) | organizationId | voiceNote.orgId |
| (from voiceNote) | coachUserId | voiceNote.coachId |
| status | status | "resolved" if playerIdentityId, else "extracted" |

**Category -> Topic Mapping**:
| v1 Category | v2 Topic |
|-------------|----------|
| skill | skill_rating |
| attendance | attendance |
| goal | development_milestone |
| performance | performance |
| injury | injury |
| medical | wellbeing |
| team_culture | team_culture |
| todo | todo |
| (other/missing) | performance (fallback) |

**Only create claims if `voiceNote.insights.length > 0`.**

## Idempotency Strategy

### Primary Check: voiceNoteArtifacts.by_voiceNoteId

```typescript
const existing = await ctx.runQuery(
  internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
  { voiceNoteId: voiceNote._id }
);
if (existing.length > 0) {
  // Already migrated -- skip
  return { skipped: true };
}
```

This uses the existing `by_voiceNoteId` index. If an artifact already exists for this voiceNote, the migration skips it entirely.

### No Partial Re-Run

If the migration creates an artifact but fails before creating the transcript, the next run will see the artifact and skip. This means the transcript is lost for that record. To handle this:

1. Create artifact LAST (after transcript and claims)
2. Or: check for transcript existence separately

**Decision**: Create artifact LAST. The order is:
1. Create claims (if insights exist)
2. Create transcript (if transcription exists)
3. Create artifact (with voiceNoteId link)
4. Link artifact to voiceNote

If step 3 fails, steps 1-2 create orphaned records with no artifact link. These are harmless (no index queries will find them without an artifactId). On re-run, the artifact check fails (no artifact) so the full process retries.

**Better approach**: Create artifact FIRST, then transcript and claims. If it fails mid-way, the artifact exists but is incomplete. On re-run, the idempotency check sees the artifact and skips. The orphaned artifact has status "received" or "processing" -- not "completed" -- so it can be identified as a partial migration.

**Final decision**: Create artifact first with status "processing". After all related records are created, update status to "completed". On re-run, if artifact exists with status "completed", skip. If artifact exists with status "processing", it's a partial migration -- delete and retry (or skip with a warning log).

```typescript
const existing = await ctx.runQuery(
  internal.models.voiceNoteArtifacts.getArtifactsByVoiceNote,
  { voiceNoteId: voiceNote._id }
);
if (existing.length > 0) {
  if (existing[0].status === "completed") {
    skipped++;
    continue; // Fully migrated
  }
  // Partial migration -- log warning and skip
  console.warn(`[migration] Partial artifact for voiceNote ${voiceNote._id}, status=${existing[0].status}. Skipping.`);
  skipped++;
  continue;
}
```

## Which v1 Records to Migrate

Only migrate voiceNotes where:
1. `insightsStatus === "completed"` (fully processed notes)
2. OR `transcription` is not empty (even if insights failed, the transcript is valuable)

Skip notes with:
- `insightsStatus === "cancelled"` (user cancelled)
- `insightsStatus === "pending"` and no transcription (nothing useful)

## Consequences

**Positive**: Clear field mapping. Robust idempotency. Handles partial failures gracefully. Preserves original v1 timestamps where possible.
**Negative**: Some data loss is inevitable -- v1 segments and duration are unavailable. The `modelUsed = "whisper-1-migrated"` marker clearly identifies migrated records. Category-to-topic mapping is imperfect but best-effort.
