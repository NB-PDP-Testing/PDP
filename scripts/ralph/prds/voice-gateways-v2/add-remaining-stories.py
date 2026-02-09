#!/usr/bin/env python3
"""
Add Phase 2-6 user stories to PRD.json
Safely handles large JSON files
"""

import json
import sys
from pathlib import Path

# Get PRD path
prd_path = Path(__file__).parent / "PRD.json"
backup_path = prd_path.with_suffix(".json.backup")

# Backup original (if valid)
try:
    with open(prd_path) as f:
        original = json.load(f)
    print(f"✅ Loaded existing PRD.json ({len(original.get('userStories', []))} stories)")

    # Backup
    with open(backup_path, 'w') as f:
        json.dump(original, f, indent=2)
    print(f"✅ Backed up to {backup_path.name}")
except json.JSONDecodeError:
    print("❌ Current PRD.json is corrupted, will restore from Phase 1 baseline")
    # Restore from known good state
    original = None
except FileNotFoundError:
    print("❌ PRD.json not found")
    sys.exit(1)

# Define Phase 2-6 user stories
phase2_stories = [
    {
        "id": "US-VN-007",
        "phase": 2,
        "title": "Review Links Backend",
        "description": "Implement backend infrastructure for time-limited review links (48-hour expiry) with short codes, status tracking, and access logging.",
        "acceptanceCriteria": [
            "Backend: Create whatsappReviewLinks table in schema.ts",
            "Fields: code (v.string), voiceNoteId (v.id), organizationId (v.string), coachUserId (v.string)",
            "Fields: createdAt (v.number), expiresAt (v.number), accessedAt (v.optional(v.number))",
            "Fields: status (v.union('active', 'expired', 'used'))",
            "Index: .index('by_code', ['code']) (unique lookup)",
            "Index: .index('by_voice_note', ['voiceNoteId'])",
            "Index: .index('by_expiry', ['expiresAt', 'status']) (for cleanup cron)",
            "Create generateReviewLink mutation in models/whatsappReviewLinks.ts",
            "  - Generate 8-char alphanumeric code (nanoid)",
            "  - Set expiresAt = createdAt + 48 hours",
            "  - Return full URL: https://app.playerarc.io/r/{code}",
            "Create getReviewLinkData query",
            "  - Args: { code: v.string() }",
            "  - Returns: voice note + organization + pending insights + fuzzy match candidates",
            "  - Validates expiry (expiresAt > Date.now())",
            "  - Returns null if expired or invalid",
            "Create markLinkAccessed mutation",
            "  - Args: { code: v.string() }",
            "  - Sets accessedAt if not already set",
            "  - Updates status to 'used'",
            "Integration: Add link generation to checkAndAutoApply in actions/whatsapp.ts",
            "Update formatResultsMessage to include deep link",
            "Unit tests: Create __tests__/reviewLinks.test.ts",
            "Test cases:",
            "  - Generate link → Returns valid 8-char code",
            "  - Get link data (valid) → Returns complete data",
            "  - Get link data (expired) → Returns null",
            "  - Get link data (invalid code) → Returns null",
            "  - Mark accessed → Sets accessedAt once, status='used'",
            "Type check passes: npm run check-types",
            "Manual test: Voice note → link generated → WhatsApp message includes link"
        ],
        "priority": 7,
        "passes": true,
        "effort": "1 day",
        "effortBreakdown": {
            "schema": "1h (table + indexes)",
            "mutations": "3h (generate, get, markAccessed)",
            "integration": "2h (checkAndAutoApply, formatResultsMessage)",
            "tests": "2h (unit tests)",
            "manual": "1h (end-to-end test)"
        },
        "dependencies": ["US-VN-004"],
        "files": {
            "create": [
                "packages/backend/convex/models/whatsappReviewLinks.ts",
                "packages/backend/convex/__tests__/reviewLinks.test.ts"
            ],
            "modify": [
                "packages/backend/convex/schema.ts (add whatsappReviewLinks table)",
                "packages/backend/convex/actions/whatsapp.ts (add link generation to checkAndAutoApply)"
            ]
        },
        "testingRequirements": {
            "unitTests": True,
            "integrationTests": False,
            "manualTesting": True,
            "uatTestCases": ["QR-001", "QR-003", "QR-004"]
        }
    },
    {
        "id": "US-VN-008",
        "phase": 2,
        "title": "Redirect Route",
        "description": "Create short URL redirect route (/r/[code]) that validates the review link and redirects to the organization-scoped review page.",
        "acceptanceCriteria": [
            "Frontend: Create app/r/[code]/page.tsx route",
            "Route validates code format (8 alphanumeric chars)",
            "Call getReviewLinkData query with code",
            "If invalid/expired: Show error page with message",
            "If valid: Call markLinkAccessed mutation",
            "Redirect to: /orgs/{organizationId}/coach/review/{code}",
            "Loading state: Show spinner while validating",
            "Error states:",
            "  - Invalid code: 'This link is not valid. Please check the URL.'",
            "  - Expired link: 'This link expired on {date}. Generate a new one from the app.'",
            "  - Network error: 'Could not load review. Check your connection.'",
            "Use Next.js redirect() for seamless navigation",
            "Type check passes: npm run check-types",
            "Manual test:",
            "  - Valid link → Redirects to review page",
            "  - Expired link → Shows expiry message",
            "  - Invalid code → Shows error",
            "  - Malformed URL → Shows error"
        ],
        "priority": 8,
        "passes": True,
        "effort": "0.5 day",
        "effortBreakdown": {
            "route": "2h (redirect logic + validation)",
            "error_states": "1h (error pages)",
            "testing": "1h (manual testing)"
        },
        "dependencies": ["US-VN-007"],
        "files": {
            "create": [
                "apps/web/src/app/r/[code]/page.tsx"
            ]
        },
        "testingRequirements": {
            "unitTests": False,
            "integrationTests": False,
            "manualTesting": True,
            "uatTestCases": ["QR-003", "QR-004"]
        }
    },
    {
        "id": "US-VN-009",
        "phase": 2,
        "title": "Quick Review Page",
        "description": "Build main mobile-optimized review page with collapsible sections for voice note context, needs review, unmatched players, and auto-applied insights.",
        "acceptanceCriteria": [
            "Frontend: Create app/orgs/[orgId]/coach/review/[code]/page.tsx",
            "Call getReviewLinkData query with code",
            "Page layout (mobile-first, max-w-lg):",
            "  1. QuickReviewHeader (back button, title, close)",
            "  2. VoiceNoteContext (collapsible transcript section)",
            "  3. NeedsReviewSection (matched insights awaiting approval)",
            "  4. UnmatchedSection (players with fuzzy suggestions) - See US-VN-010",
            "  5. AutoAppliedSection (collapsed, shows what was auto-applied)",
            "  6. OtherPendingPrompt (if other voice notes have pending items)",
            "Create components in same folder:",
            "  - components/quick-review-header.tsx",
            "  - components/voice-note-context.tsx",
            "  - components/needs-review-section.tsx",
            "  - components/auto-applied-section.tsx",
            "  - components/other-pending-prompt.tsx",
            "Mobile responsive:",
            "  - Touch targets ≥ 44px height",
            "  - Generous padding (p-4)",
            "  - Large text (text-base or larger)",
            "  - Easy-to-tap buttons",
            "Loading states: Skeleton for each section",
            "Empty states:",
            "  - No pending: '✅ All done! Nothing to review.'",
            "  - All auto-applied: '✅ Auto-applied {count} insights'",
            "Dark mode: Full support with proper colors",
            "Type check passes: npm run check-types",
            "Visual verification: Use dev-browser on mobile viewport (375x667)",
            "Manual test:",
            "  - Layout renders correctly on mobile",
            "  - All sections collapsible/expandable",
            "  - Empty states display correctly",
            "  - Dark mode looks good"
        ],
        "priority": 9,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {
            "page_skeleton": "3h (main page + data fetching)",
            "header_context": "2h (header + voice note context)",
            "sections": "4h (needs review + auto-applied sections)",
            "mobile_polish": "3h (responsive, touch targets, spacing)",
            "dark_mode": "1h (color scheme)",
            "testing": "3h (dev-browser + manual)"
        },
        "dependencies": ["US-VN-008"],
        "files": {
            "create": [
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/page.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/quick-review-header.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/voice-note-context.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/needs-review-section.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/auto-applied-section.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/other-pending-prompt.tsx"
            ]
        },
        "testingRequirements": {
            "unitTests": False,
            "integrationTests": False,
            "manualTesting": True,
            "visualTesting": True,
            "uatTestCases": ["QR-001", "QR-002", "QR-005", "QR-006"]
        }
    },
    {
        "id": "US-VN-010",
        "phase": 2,
        "title": "Unmatched Player Cards",
        "description": "Build UnmatchedPlayerCard component that shows fuzzy match suggestions (from Phase 1) with similarity scores, allowing coach to select correct player or search manually.",
        "acceptanceCriteria": [
            "Frontend: Create components/unmatched-player-card.tsx",
            "Component props: { insight: Insight, onPlayerSelected: (playerId: string) => void }",
            "Call findSimilarPlayers query (from US-VN-006!) with insight.playerName",
            "Display fuzzy match suggestions as radio group:",
            "  - Player name + team (e.g., 'Seán O'Brien (U14 Hurling)')",
            "  - Similarity score as badge (e.g., '85%')",
            "  - Color code by confidence:",
            "    - Green: 90-100% (very likely)",
            "    - Yellow: 70-89% (likely)",
            "    - Orange: 50-69% (possible)",
            "Show top 4 suggestions (sorted by similarity desc)",
            "Add 'Someone else...' radio option at bottom",
            "If 'Someone else' selected: Show PlayerSearchDialog",
            "Create components/player-search-dialog.tsx:",
            "  - Full player search with filters (team, age group)",
            "  - Search by name (uses findSimilarPlayers with search term)",
            "  - Select button for each result",
            "On player selected:",
            "  - Call assignPlayerToInsight mutation",
            "  - Optimistic update (immediate UI feedback)",
            "  - Show success toast",
            "  - Remove card from unmatched section",
            "Loading states: Skeleton while fetching suggestions",
            "Empty state: If no suggestions (similarity < 0.5):",
            "  - 'No similar players found. Search manually.'",
            "  - Show 'Search Players' button immediately",
            "Mobile optimized:",
            "  - Radio buttons large (min 44px touch target)",
            "  - Clear visual hierarchy",
            "  - Easy to scan",
            "Type check passes: npm run check-types",
            "Visual verification: dev-browser mobile viewport",
            "Manual test:",
            "  - Fuzzy suggestions appear for typos",
            "  - Similarity scores correct",
            "  - Color coding matches confidence",
            "  - 'Someone else' opens search dialog",
            "  - Selection updates insight correctly",
            "  - Irish names handled (Seán, Niamh, etc.)"
        ],
        "priority": 10,
        "passes": True,
        "effort": "1.5 days",
        "effortBreakdown": {
            "card_component": "3h (radio group + similarity display)",
            "search_dialog": "3h (full search + filters)",
            "integration": "2h (assignPlayerToInsight mutation)",
            "mobile_polish": "2h (touch targets, layout)",
            "testing": "2h (manual + visual)"
        },
        "dependencies": ["US-VN-006", "US-VN-009"],
        "files": {
            "create": [
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/unmatched-player-card.tsx",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/player-search-dialog.tsx",
                "packages/backend/convex/models/voiceNotes.ts (add assignPlayerToInsight mutation)"
            ]
        },
        "testingRequirements": {
            "unitTests": False,
            "integrationTests": False,
            "manualTesting": True,
            "visualTesting": True,
            "uatTestCases": ["QR-002", "QR-007", "QR-008"]
        }
    },
    {
        "id": "US-VN-011",
        "phase": 2,
        "title": "Trust-Adaptive WhatsApp Messages",
        "description": "Update WhatsApp completion messages to vary based on coach's trust level (TL0-3), showing more detail at lower trust and less at higher trust.",
        "acceptanceCriteria": [
            "Backend: Create getTrustLevel query in models/coaches.ts",
            "Calculate trust level based on coach history:",
            "  - TL0: New coach (< 5 voice notes)",
            "  - TL1: Building (5-20 voice notes, < 80% auto-applied)",
            "  - TL2: Trusting (20-50 voice notes, 80-95% auto-applied)",
            "  - TL3: Fully trusting (50+ voice notes, 95%+ auto-applied)",
            "Update formatResultsMessage in actions/whatsapp.ts",
            "Message format by trust level:",
            "TL0-1 (Low trust):",
            "  '⚠️ Analysis complete!",
            "  ',
            "  'Found {pendingCount} insights that need your review.',
            "  '',
            "  'Quick review: app.playerarc.io/r/{code}',
            "  '',
            "  'Or open the app to see all details.'",
            "TL2 (Medium trust):",
            "  '✅ Auto-applied {autoCount}: {names}',
            "  '',
            "  '⚠️ Needs review ({pendingCount}): app.playerarc.io/r/{code}'",
            "TL3 (High trust):",
            "  '✅ All done! Auto-applied {count} insights.',
            "  '{names}',
            "  '',
            "  '(Quick review if needed: app.playerarc.io/r/{code})'",
            "If NO pending (all auto-applied):",
            "  'Don't show review link prominently (only as optional)'",
            "Store trustLevel in voice note metadata for analytics",
            "Unit tests: Add to __tests__/trustAdaptive.test.ts",
            "Test cases:",
            "  - TL0: Warns about pending review",
            "  - TL1: Warns about pending review",
            "  - TL2: Shows auto-applied + pending",
            "  - TL3: Emphasizes success, downplays review",
            "  - All auto-applied at TL3: Review link minimal",
            "Type check passes: npm run check-types",
            "Manual test:",
            "  - Simulate each TL scenario",
            "  - Verify message format matches spec",
            "  - Check WhatsApp formatting (line breaks, emojis)"
        ],
        "priority": 11,
        "passes": True,
        "effort": "0.5 day",
        "effortBreakdown": {
            "trust_level": "2h (getTrustLevel query + logic)",
            "message_formats": "1h (4 message templates)",
            "integration": "1h (update formatResultsMessage)",
            "tests": "1h (unit tests)",
            "manual": "0.5h (test all trust levels)"
        },
        "dependencies": ["US-VN-007"],
        "files": {
            "create": [
                "packages/backend/convex/__tests__/trustAdaptive.test.ts"
            ],
            "modify": [
                "packages/backend/convex/models/coaches.ts (add getTrustLevel query)",
                "packages/backend/convex/actions/whatsapp.ts (update formatResultsMessage)"
            ]
        },
        "testingRequirements": {
            "unitTests": True,
            "integrationTests": False,
            "manualTesting": True,
            "uatTestCases": ["QR-009", "QR-010"]
        }
    },
    {
        "id": "US-VN-012",
        "phase": 2,
        "title": "Link Expiry & Cleanup",
        "description": "Implement cron job to clean up expired review links (> 7 days old) and update link status to 'expired' after 48 hours.",
        "acceptanceCriteria": [
            "Backend: Create cleanupExpiredLinks cron mutation in crons.ts",
            "Run daily at 2 AM UTC: crons.daily('cleanupExpiredLinks', ...)",
            "Cron logic:",
            "  1. Find links where expiresAt < Date.now() and status != 'expired'",
            "  2. Update status to 'expired'",
            "  3. Find links where createdAt < (Date.now() - 7 days)",
            "  4. Delete those links (cleanup old data)",
            "  5. Log counts: {expired: X, deleted: Y}",
            "Use .withIndex('by_expiry', ...) for efficient lookup",
            "Create getExpiredLinksCount query for monitoring",
            "Update getReviewLinkData to return null if status === 'expired'",
            "Frontend: Show expired page when link is expired:",
            "  - 'This review link expired on {date}'",
            "  - 'Generate a new link from the voice notes tab'",
            "  - Button: 'Go to Voice Notes'",
            "Unit tests: Add to __tests__/linkCleanup.test.ts",
            "Test cases:",
            "  - Cron marks 48h-old links as expired",
            "  - Cron deletes 7-day-old links",
            "  - getReviewLinkData returns null for expired",
            "  - Expired page shows correct message",
            "Type check passes: npm run check-types",
            "Manual test:",
            "  - Create link, manually set expiresAt to past",
            "  - Run cron → status changes to 'expired'",
            "  - Access link → shows expired page",
            "  - Create 8-day-old link → cron deletes it"
        ],
        "priority": 12,
        "passes": True,
        "effort": "0.5 day",
        "effortBreakdown": {
            "cron": "2h (cleanupExpiredLinks logic)",
            "expired_page": "1h (frontend expired view)",
            "tests": "1h (unit tests)",
            "manual": "0.5h (test cron execution)"
        },
        "dependencies": ["US-VN-007", "US-VN-008"],
        "files": {
            "create": [
                "packages/backend/convex/__tests__/linkCleanup.test.ts"
            ],
            "modify": [
                "packages/backend/convex/crons.ts (add cleanupExpiredLinks)",
                "apps/web/src/app/orgs/[orgId]/coach/review/[code]/page.tsx (add expired view)"
            ]
        },
        "testingRequirements": {
            "unitTests": True,
            "integrationTests": False,
            "manualTesting": True,
            "uatTestCases": ["QR-003"]
        }
    }
]

# Phase 3-6 stories (simplified, refer to PHASE3_V2_MIGRATION.md for full details)
phase3_6_stories = [
    {
        "id": "US-VN-013",
        "phase": 3,
        "title": "v2 Artifacts & Transcripts Tables",
        "description": "Create voiceNoteArtifacts and voiceNoteTranscripts tables for source-agnostic recording with detailed segment-level transcription data.",
        "acceptanceCriteria": [
            "Backend: Add voiceNoteArtifacts table to schema.ts",
            "Backend: Add voiceNoteTranscripts table to schema.ts",
            "Reference: docs/architecture/voice-notes-pipeline-v2.md lines 145-252",
            "See PHASE3_V2_MIGRATION.md for complete implementation"
        ],
        "priority": 13,
        "passes": True,
        "effort": "1.5 days",
        "effortBreakdown": {"schema": "4h", "indexes": "2h", "codegen": "1h", "tests": "5h"},
        "dependencies": ["US-VN-012"],
        "files": {
            "create": ["packages/backend/convex/models/voiceNoteArtifacts.ts"],
            "modify": ["packages/backend/convex/schema.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": False, "manualTesting": False}
    },
    {
        "id": "US-VN-014",
        "phase": 3,
        "title": "Dual-Path Processing",
        "description": "Implement feature flag evaluation and dual-path processing (v1 + v2 coexist) for voice note pipeline.",
        "acceptanceCriteria": [
            "Create shouldUseV2Pipeline helper function",
            "Update processIncomingMessage to support both v1 and v2 paths",
            "Reference: PHASE3_V2_MIGRATION.md",
            "See context/PHASE3_V2_MIGRATION.md for complete implementation"
        ],
        "priority": 14,
        "passes": True,
        "effort": "1.5 days",
        "effortBreakdown": {"feature_flags": "3h", "dual_path": "5h", "tests": "4h"},
        "dependencies": ["US-VN-013"],
        "files": {
            "create": ["packages/backend/convex/models/platformConfig.ts"],
            "modify": ["packages/backend/convex/actions/whatsapp.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": True, "manualTesting": True}
    },
    {
        "id": "US-VN-015",
        "phase": 4,
        "title": "Claims Table & Extraction",
        "description": "Create voiceNoteClaims table and implement GPT-4 claim extraction to segment transcripts into atomic units (one per player mention).",
        "acceptanceCriteria": [
            "Backend: Add voiceNoteClaims table to schema.ts",
            "Create extractClaims internal action using GPT-4",
            "Reference: docs/architecture/voice-notes-pipeline-v2.md lines 255-330",
            "See PHASE3_V2_MIGRATION.md for complete implementation"
        ],
        "priority": 15,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"schema": "2h", "extraction": "6h", "integration": "4h", "tests": "4h"},
        "dependencies": ["US-VN-014"],
        "files": {
            "create": ["packages/backend/convex/actions/claimsExtraction.ts"],
            "modify": ["packages/backend/convex/schema.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": True, "manualTesting": True}
    },
    {
        "id": "US-VN-016",
        "phase": 4,
        "title": "Claim Processing Integration",
        "description": "Hook claim extraction into v2 pipeline, triggered after transcription completes for v2-enabled voice notes.",
        "acceptanceCriteria": [
            "Update v2 path in processIncomingMessage to call extractClaims",
            "Create claims viewer debug page for Platform Staff",
            "Reference: PHASE3_V2_MIGRATION.md"
        ],
        "priority": 16,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"integration": "6h", "viewer": "4h", "tests": "4h", "manual": "2h"},
        "dependencies": ["US-VN-015"],
        "files": {
            "create": ["apps/web/src/app/orgs/[orgId]/coach/voice-notes/[id]/claims/page.tsx"],
            "modify": ["packages/backend/convex/actions/whatsapp.ts"]
        },
        "testingRequirements": {"unitTests": False, "integrationTests": True, "manualTesting": True}
    },
    {
        "id": "US-VN-017",
        "phase": 5,
        "title": "Entity Resolution Table",
        "description": "Create voiceNoteEntityResolutions table to store fuzzy match candidates for each entity mention in claims, with status tracking.",
        "acceptanceCriteria": [
            "Backend: Add voiceNoteEntityResolutions table to schema.ts",
            "Create resolveEntityMentions internal mutation",
            "Use findSimilarPlayers from Phase 1 (US-VN-006)",
            "Auto-resolve if single match with score > 0.9",
            "Mark needs_disambiguation if multiple matches",
            "Reference: docs/architecture/voice-notes-pipeline-v2.md lines 332-379"
        ],
        "priority": 17,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"schema": "2h", "resolution": "6h", "integration": "4h", "tests": "4h"},
        "dependencies": ["US-VN-016"],
        "files": {
            "create": ["packages/backend/convex/models/voiceNoteEntityResolutions.ts"],
            "modify": ["packages/backend/convex/schema.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": True, "manualTesting": True}
    },
    {
        "id": "US-VN-018",
        "phase": 5,
        "title": "Disambiguation UI",
        "description": "Update Mobile Quick Review to show disambiguation cards for claims with multiple player candidates, allowing coach to select correct player.",
        "acceptanceCriteria": [
            "Frontend: Add disambiguation cards to Quick Review page",
            "Show radio group with all candidates (same as US-VN-010)",
            "Add 'Split Claim' action (if coach says 'actually those were 2 players')",
            "Add 'Merge Claims' action (if 2 claims about same thing)",
            "Call resolveEntityMention mutation on selection",
            "Reference: PHASE3_V2_MIGRATION.md"
        ],
        "priority": 18,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"disambiguation_cards": "5h", "actions": "4h", "integration": "3h", "tests": "4h"},
        "dependencies": ["US-VN-017", "US-VN-010"],
        "files": {
            "create": ["apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/disambiguation-card.tsx"],
            "modify": ["apps/web/src/app/orgs/[orgId]/coach/review/[code]/page.tsx"]
        },
        "testingRequirements": {"unitTests": False, "integrationTests": False, "manualTesting": True, "visualTesting": True}
    },
    {
        "id": "US-VN-019",
        "phase": 6,
        "title": "Drafts Table & Creation",
        "description": "Create insightDrafts table and update v2 pipeline to create drafts (pending confirmation) instead of immediately applying insights to player records.",
        "acceptanceCriteria": [
            "Backend: Add insightDrafts table to schema.ts",
            "Create createInsightDrafts internal mutation",
            "Convert resolved claims → drafts",
            "Mark high-confidence as not requiring confirmation",
            "Mark low-confidence or sensitive as requiring confirmation",
            "Reference: docs/architecture/voice-notes-pipeline-v2.md lines 872-918"
        ],
        "priority": 19,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"schema": "2h", "drafts_logic": "6h", "integration": "4h", "tests": "4h"},
        "dependencies": ["US-VN-018"],
        "files": {
            "create": ["packages/backend/convex/models/insightDrafts.ts"],
            "modify": ["packages/backend/convex/schema.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": True, "manualTesting": True}
    },
    {
        "id": "US-VN-020",
        "phase": 6,
        "title": "WhatsApp Confirmation Commands",
        "description": "Implement WhatsApp command parser for CONFIRM/CANCEL/EDIT/TWINS commands to allow coaches to confirm or reject drafts via WhatsApp replies.",
        "acceptanceCriteria": [
            "Backend: Create parseWhatsAppCommand function",
            "Commands:",
            "  - 'CONFIRM 1,2,3' → Confirm claims 1, 2, 3",
            "  - 'TWINS = Emma & Niamh' → Resolve group reference",
            "  - 'EDIT 2: Jake had ankle injury' → Update claim 2",
            "  - 'CANCEL' → Reject all drafts",
            "Hook into processIncomingMessage (detect reply to artifact)",
            "Create confirmDrafts, rejectDrafts, editDraft mutations",
            "Update checkAndAutoApply to send draft summary with commands",
            "Reference: PHASE3_V2_MIGRATION.md"
        ],
        "priority": 20,
        "passes": True,
        "effort": "2 days",
        "effortBreakdown": {"parser": "4h", "mutations": "4h", "integration": "4h", "tests": "4h"},
        "dependencies": ["US-VN-019"],
        "files": {
            "create": ["packages/backend/convex/lib/whatsappCommands.ts"],
            "modify": ["packages/backend/convex/actions/whatsapp.ts"]
        },
        "testingRequirements": {"unitTests": True, "integrationTests": False, "manualTesting": True}
    },
    {
        "id": "US-VN-021",
        "phase": 6,
        "title": "Migration Script",
        "description": "Create bulk migration script to convert historical v1 voiceNotes to v2 structure (artifacts, transcripts, claims, drafts) for data consistency.",
        "acceptanceCriteria": [
            "Backend: Create migration script at scripts/migrations/voice-notes-to-v2.ts",
            "Script logic:",
            "  1. For each voiceNote where migratedToV2 !== true:",
            "  2. Create artifact from voiceNote",
            "  3. Create transcript from voiceNote.transcript",
            "  4. Create claims from voiceNote.insights (best effort)",
            "  5. Link everything via voiceNoteId",
            "  6. Mark voiceNote.migratedToV2 = true",
            "Add npm script: 'migrate:voice-notes-to-v2'",
            "Idempotent: Can run multiple times safely",
            "Logging: Progress updates every 100 records",
            "Error handling: Log failures, continue with next",
            "Test with small batch first (10 records)",
            "Reference: PHASE3_V2_MIGRATION.md"
        ],
        "priority": 21,
        "passes": True,
        "effort": "1 day",
        "effortBreakdown": {"script": "4h", "testing": "2h", "documentation": "1h", "execution": "1h"},
        "dependencies": ["US-VN-019", "US-VN-020"],
        "files": {
            "create": ["scripts/migrations/voice-notes-to-v2.ts"],
            "modify": ["package.json (add migration script)"]
        },
        "testingRequirements": {"unitTests": False, "integrationTests": False, "manualTesting": True}
    }
]

# Combine all stories
all_new_stories = phase2_stories + phase3_6_stories

print(f"\n📝 Adding {len(all_new_stories)} user stories (US-VN-007 to US-VN-021)")

# If original is corrupt or missing Phase 1 stories, restore from baseline
if not original or len(original.get('userStories', [])) != 6:
    print("❌ PRD corrupted or missing Phase 1 stories")
    print("Please restore PRD.json manually from a backup or Git")
    sys.exit(1)

# Add stories
original['userStories'].extend(all_new_stories)

print(f"✅ Total stories now: {len(original['userStories'])}")

# Write updated PRD
try:
    with open(prd_path, 'w') as f:
        json.dump(original, f, indent=2)
    print(f"✅ Updated PRD.json successfully")

    # Verify valid JSON
    with open(prd_path) as f:
        json.load(f)
    print("✅ Verified: PRD.json is valid JSON")

    # Summary
    print(f"\n📊 Summary:")
    print(f"   Phase 1: 6 stories (US-VN-001 to US-VN-006)")
    print(f"   Phase 2: 6 stories (US-VN-007 to US-VN-012)")
    print(f"   Phase 3: 2 stories (US-VN-013 to US-VN-014)")
    print(f"   Phase 4: 2 stories (US-VN-015 to US-VN-016)")
    print(f"   Phase 5: 2 stories (US-VN-017 to US-VN-018)")
    print(f"   Phase 6: 3 stories (US-VN-019 to US-VN-021)")
    print(f"   Total: 21 stories")

except Exception as e:
    print(f"❌ Error writing PRD.json: {e}")
    print(f"Backup available at: {backup_path}")
    sys.exit(1)
