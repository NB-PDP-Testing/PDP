# Mobile Quick-Review for WhatsApp Voice Notes

**Feature**: Streamlined Coach Review Experience via Deep Links
**Status**: Planning
**Created**: January 25, 2026

---

## Overview

When coaches receive the "Analysis complete!" WhatsApp message, they currently get a generic link to the app. This feature provides **time-limited deep links** that open a **mobile-optimized quick-review page** for immediate action on insights from that specific voice note.

### Goals

1. **Reduce friction**: One tap from WhatsApp to actionable content
2. **Mobile-first**: Optimized for phone screens and touch interactions
3. **Voice-note scoped**: Show insights from the specific note, then surface other pending
4. **Trust-adaptive**: Message format evolves as coach trusts AI more
5. **Fuzzy player suggestions**: Help resolve unmatched players quickly

---

## Technical Architecture

### Phase 1: Backend Foundation

#### 1.1 New Table: `whatsappReviewLinks`

```typescript
// packages/backend/convex/schema.ts
whatsappReviewLinks: defineTable({
  // Unique short code for the URL (8 alphanumeric chars)
  code: v.string(),

  // What this link points to
  voiceNoteId: v.id("voiceNotes"),
  organizationId: v.string(),
  coachUserId: v.string(),

  // Timestamps
  createdAt: v.number(),
  expiresAt: v.number(),           // 48 hours from creation
  accessedAt: v.optional(v.number()), // When first accessed

  // Status tracking
  status: v.union(
    v.literal("active"),
    v.literal("expired"),
    v.literal("used")              // Accessed at least once
  ),

  // Context for the review page
  pendingInsightsCount: v.number(),
  unmatchedCount: v.number(),
})
  .index("by_code", ["code"])
  .index("by_voiceNoteId", ["voiceNoteId"])
  .index("by_expiresAt_and_status", ["expiresAt", "status"])
  .index("by_coachUserId", ["coachUserId"]),
```

#### 1.2 New Query: `findSimilarPlayers`

Fuzzy matching for unmatched player names using Levenshtein distance.

```typescript
// packages/backend/convex/models/orgPlayerEnrollments.ts

/**
 * Find players with names similar to the search term.
 * Uses Levenshtein distance for fuzzy matching.
 * Returns top 5 matches with similarity scores > 0.5
 */
export const findSimilarPlayers = query({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
    searchName: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.string(),
    lastName: v.string(),
    fullName: v.string(),
    teamName: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    similarity: v.number(),  // 0-1 score
  })),
  handler: async (ctx, args) => {
    // Get players from coach's teams
    const players = await ctx.runQuery(
      internal.models.orgPlayerEnrollments.getPlayersForCoachTeamsInternal,
      { organizationId: args.organizationId, coachUserId: args.coachUserId }
    );

    const searchLower = args.searchName.toLowerCase().trim();
    const limit = args.limit ?? 5;

    // Calculate similarity for each player
    const withScores = players.map(player => {
      const firstNameSim = levenshteinSimilarity(
        searchLower,
        player.firstName.toLowerCase()
      );
      const lastNameSim = levenshteinSimilarity(
        searchLower,
        player.lastName.toLowerCase()
      );
      const fullNameSim = levenshteinSimilarity(
        searchLower,
        `${player.firstName} ${player.lastName}`.toLowerCase()
      );

      // Best match wins
      const similarity = Math.max(firstNameSim, lastNameSim, fullNameSim);

      return {
        playerIdentityId: player.playerIdentityId,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        teamName: player.teamName,
        ageGroup: player.ageGroup,
        similarity,
      };
    });

    // Filter and sort by similarity
    return withScores
      .filter(p => p.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
});

// Levenshtein similarity helper (0 = no match, 1 = exact match)
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - (distance / maxLen);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
```

#### 1.3 Review Link Management

```typescript
// packages/backend/convex/models/whatsappReviewLinks.ts

/**
 * Generate a unique review link for a voice note
 */
export const generateReviewLink = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    organizationId: v.string(),
    coachUserId: v.string(),
    pendingInsightsCount: v.number(),
    unmatchedCount: v.number(),
  },
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 48 * 60 * 60 * 1000; // 48 hours

    // Generate unique 8-char code
    const code = generateUniqueCode();

    await ctx.db.insert("whatsappReviewLinks", {
      code,
      voiceNoteId: args.voiceNoteId,
      organizationId: args.organizationId,
      coachUserId: args.coachUserId,
      createdAt: now,
      expiresAt,
      status: "active",
      pendingInsightsCount: args.pendingInsightsCount,
      unmatchedCount: args.unmatchedCount,
    });

    return { code, expiresAt };
  },
});

/**
 * Get review link data (validates expiry)
 */
export const getReviewLinkData = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      voiceNoteId: v.id("voiceNotes"),
      organizationId: v.string(),
      coachUserId: v.string(),
      isExpired: v.boolean(),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_code", q => q.eq("code", args.code))
      .first();

    if (!link) return null;

    const isExpired = Date.now() > link.expiresAt;

    return {
      voiceNoteId: link.voiceNoteId,
      organizationId: link.organizationId,
      coachUserId: link.coachUserId,
      isExpired,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    };
  },
});

/**
 * Mark link as accessed
 */
export const markLinkAccessed = mutation({
  args: {
    code: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_code", q => q.eq("code", args.code))
      .first();

    if (link && link.status === "active") {
      await ctx.db.patch(link._id, {
        accessedAt: Date.now(),
        status: "used",
      });
    }

    return null;
  },
});

// Generate 8-char alphanumeric code
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

#### 1.4 Update WhatsApp Message Formatting

```typescript
// packages/backend/convex/actions/whatsapp.ts - formatResultsMessage()

function formatResultsMessage(
  results: ProcessingResults,
  trustLevel: number,
  reviewLinkCode?: string
): string {
  const lines: string[] = [];
  const siteUrl = process.env.SITE_URL;

  // Trust-adaptive header
  if (trustLevel >= 3 && results.needsReview.length === 0) {
    lines.push("✅ All applied!");
  } else {
    lines.push("Analysis complete!");
  }
  lines.push("");

  // Compact summary with emojis
  if (results.autoApplied.length > 0) {
    const names = results.autoApplied.slice(0, 3).map(i =>
      i.playerName || i.teamName || "Unknown"
    );
    const more = results.autoApplied.length > 3
      ? ` +${results.autoApplied.length - 3}`
      : "";
    lines.push(`✅ Auto-applied (${results.autoApplied.length}): ${names.join(", ")}${more}`);
  }

  if (results.needsReview.length > 0) {
    const items = results.needsReview.slice(0, 2).map(i =>
      `${i.playerName || "Unknown"} (${formatCategory(i.category)})`
    );
    const more = results.needsReview.length > 2
      ? ` +${results.needsReview.length - 2}`
      : "";
    lines.push(`⚠️ Needs review (${results.needsReview.length}): ${items.join(", ")}${more}`);
  }

  if (results.unmatched.length > 0) {
    const names = results.unmatched.slice(0, 2).map(i =>
      `'${i.mentionedName || "Unknown"}'`
    );
    const more = results.unmatched.length > 2
      ? ` +${results.unmatched.length - 2}`
      : "";
    lines.push(`❓ Unmatched (${results.unmatched.length}): ${names.join(", ")}${more}`);
  }

  lines.push("");

  // Deep link or fallback
  const totalPending = results.needsReview.length + results.unmatched.length;
  if (reviewLinkCode && siteUrl) {
    lines.push(`Quick review: ${siteUrl}/r/${reviewLinkCode}`);
    lines.push("(Link expires in 48h)");
  } else if (totalPending > 0 && siteUrl) {
    lines.push(`Review ${totalPending} pending: ${siteUrl}`);
  } else if (results.autoApplied.length > 0) {
    lines.push("All insights applied!");
  } else {
    lines.push("No actionable insights found.");
  }

  return lines.join("\n");
}
```

---

### Phase 2: Quick-Review Frontend

#### 2.1 New Route: `/r/[code]`

Redirect route that validates the link and redirects to the full review page.

```typescript
// apps/web/src/app/r/[code]/page.tsx

import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export default async function ReviewRedirectPage({
  params,
}: {
  params: { code: string };
}) {
  const linkData = await fetchQuery(api.models.whatsappReviewLinks.getReviewLinkData, {
    code: params.code,
  });

  if (!linkData) {
    redirect("/review-link-invalid");
  }

  if (linkData.isExpired) {
    redirect("/review-link-expired");
  }

  // Redirect to org-scoped review page
  redirect(`/orgs/${linkData.organizationId}/coach/review/${params.code}`);
}
```

#### 2.2 Quick-Review Page: `/orgs/[orgId]/coach/review/[code]`

```typescript
// apps/web/src/app/orgs/[orgId]/coach/review/[code]/page.tsx

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

// Components
import { QuickReviewHeader } from "./components/quick-review-header";
import { VoiceNoteContext } from "./components/voice-note-context";
import { NeedsReviewSection } from "./components/needs-review-section";
import { UnmatchedSection } from "./components/unmatched-section";
import { AutoAppliedSection } from "./components/auto-applied-section";
import { OtherPendingPrompt } from "./components/other-pending-prompt";
import { LinkExpiredView } from "./components/link-expired-view";

export default function QuickReviewPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const orgId = params.orgId as string;

  // Get link data
  const linkData = useQuery(api.models.whatsappReviewLinks.getReviewLinkData, { code });
  const markAccessed = useMutation(api.models.whatsappReviewLinks.markLinkAccessed);

  // Get voice note data
  const voiceNote = useQuery(
    api.models.voiceNotes.getVoiceNoteById,
    linkData?.voiceNoteId ? { noteId: linkData.voiceNoteId } : "skip"
  );

  // Get other pending insights count
  const allNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    linkData ? { orgId, coachId: linkData.coachUserId } : "skip"
  );

  // Mark link as accessed on first load
  useEffect(() => {
    if (linkData && !linkData.isExpired) {
      markAccessed({ code });
    }
  }, [linkData, code, markAccessed]);

  // Loading state
  if (linkData === undefined) {
    return <QuickReviewSkeleton />;
  }

  // Invalid link
  if (linkData === null) {
    return <LinkInvalidView />;
  }

  // Expired link
  if (linkData.isExpired) {
    return <LinkExpiredView orgId={orgId} />;
  }

  // Calculate other pending
  const otherPendingCount = allNotes
    ?.filter(n => n._id !== linkData.voiceNoteId)
    .reduce((acc, note) => {
      const pending = note.insights.filter(i =>
        i.status === "pending" && (i.playerIdentityId || !i.playerName)
      ).length;
      const unmatched = note.insights.filter(i =>
        i.status === "pending" && i.playerName && !i.playerIdentityId
      ).length;
      return acc + pending + unmatched;
    }, 0) ?? 0;

  // Categorize insights from this voice note
  const needsReview = voiceNote?.insights.filter(i =>
    i.status === "pending" && i.playerIdentityId
  ) ?? [];

  const unmatched = voiceNote?.insights.filter(i =>
    i.status === "pending" && i.playerName && !i.playerIdentityId
  ) ?? [];

  const autoApplied = voiceNote?.insights.filter(i =>
    i.status === "applied"
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <QuickReviewHeader
        onClose={() => router.push(`/orgs/${orgId}/coach/voice-notes`)}
      />

      <main className="container max-w-lg mx-auto p-4 space-y-6">
        {/* Voice note context (collapsible) */}
        <VoiceNoteContext
          voiceNote={voiceNote}
          defaultCollapsed={true}
        />

        {/* Needs review - priority 1 */}
        {needsReview.length > 0 && (
          <NeedsReviewSection
            insights={needsReview}
            voiceNoteId={linkData.voiceNoteId}
          />
        )}

        {/* Unmatched players - priority 2 */}
        {unmatched.length > 0 && (
          <UnmatchedSection
            insights={unmatched}
            voiceNoteId={linkData.voiceNoteId}
            organizationId={orgId}
            coachUserId={linkData.coachUserId}
          />
        )}

        {/* Auto-applied (collapsed by default) */}
        {autoApplied.length > 0 && (
          <AutoAppliedSection
            insights={autoApplied}
            defaultCollapsed={true}
          />
        )}

        {/* All done message */}
        {needsReview.length === 0 && unmatched.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-lg font-medium">All done!</p>
            <p className="text-muted-foreground">
              No pending items for this note.
            </p>
          </div>
        )}

        {/* Other pending items prompt */}
        {otherPendingCount > 0 && (
          <OtherPendingPrompt
            count={otherPendingCount}
            onViewAll={() => router.push(`/orgs/${orgId}/coach/voice-notes?tab=insights`)}
          />
        )}
      </main>
    </div>
  );
}
```

#### 2.3 Unmatched Player Card with Fuzzy Suggestions

```typescript
// apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/unmatched-player-card.tsx

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus } from "lucide-react";

interface UnmatchedPlayerCardProps {
  insight: {
    id: string;
    playerName: string;
    title: string;
    description: string;
    category?: string;
  };
  voiceNoteId: string;
  organizationId: string;
  coachUserId: string;
}

export function UnmatchedPlayerCard({
  insight,
  voiceNoteId,
  organizationId,
  coachUserId,
}: UnmatchedPlayerCardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Get fuzzy suggestions
  const suggestions = useQuery(
    api.models.orgPlayerEnrollments.findSimilarPlayers,
    {
      organizationId,
      coachUserId,
      searchName: insight.playerName || "",
      limit: 4,
    }
  );

  const assignPlayer = useMutation(api.models.voiceNotes.assignPlayerToInsight);

  const handleAssign = async () => {
    if (!selectedPlayerId) return;

    setIsAssigning(true);
    try {
      await assignPlayer({
        noteId: voiceNoteId as any,
        insightId: insight.id,
        playerIdentityId: selectedPlayerId as any,
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">❓</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-900">
            "{insight.playerName}" not found
          </p>
          <p className="text-sm text-amber-700 truncate">
            {insight.title}
          </p>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Did you mean?
          </p>
          <RadioGroup
            value={selectedPlayerId || ""}
            onValueChange={setSelectedPlayerId}
            className="space-y-2"
          >
            {suggestions.map((player) => (
              <div
                key={player.playerIdentityId}
                className="flex items-center space-x-3 p-2 rounded-md bg-white border"
              >
                <RadioGroupItem
                  value={player.playerIdentityId}
                  id={player.playerIdentityId}
                />
                <Label
                  htmlFor={player.playerIdentityId}
                  className="flex-1 cursor-pointer"
                >
                  <span className="font-medium">{player.fullName}</span>
                  {player.teamName && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({player.teamName})
                    </span>
                  )}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(player.similarity * 100)}%
                </span>
              </div>
            ))}

            {/* "Someone else" option */}
            <div
              className="flex items-center space-x-3 p-2 rounded-md bg-white border"
            >
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other" className="flex-1 cursor-pointer">
                <span className="text-muted-foreground">Someone else...</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* No suggestions */}
      {suggestions && suggestions.length === 0 && (
        <p className="text-sm text-amber-700 mb-4">
          No similar names found in your teams.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {selectedPlayerId && selectedPlayerId !== "other" && (
          <Button
            onClick={handleAssign}
            disabled={isAssigning}
            className="flex-1"
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Assign & Apply
          </Button>
        )}

        {(selectedPlayerId === "other" || !suggestions?.length) && (
          <Button
            variant="outline"
            onClick={() => setShowSearch(true)}
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Players
          </Button>
        )}
      </div>

      {/* Full player search dialog would go here */}
    </div>
  );
}
```

---

### Phase 3: Trust-Adaptive Messaging

Update the WhatsApp message format based on trust level and outcomes:

#### Trust Level 0-1 (New Coach)
```
Analysis complete!

⚠️ 4 insights need your review
❓ 1 unmatched player

Quick review: app.playerarc.io/r/Ab3xK9mQ
(Link expires in 48h)
```

#### Trust Level 2 (Established Coach)
```
Analysis complete!

✅ Auto-applied (2): John, Sarah
⚠️ Needs review (1): Jake (Injury)
❓ Unmatched (1): 'Michael'

Quick review: app.playerarc.io/r/Ab3xK9mQ
(Link expires in 48h)
```

#### Trust Level 3 (Trusted Coach, All Applied)
```
✅ All applied!

Auto-applied (3): John, Sarah, Emma
📤 Parent updates queued (2)

View details: app.playerarc.io/r/Ab3xK9mQ
```

---

### Phase 4: Link Expiry & Cleanup

#### 4.1 Expiry Handling in UI

```typescript
// apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/link-expired-view.tsx

export function LinkExpiredView({ orgId }: { orgId: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
        <p className="text-muted-foreground mb-6">
          This review link has expired. Links are valid for 48 hours.
        </p>
        <Button
          onClick={() => router.push(`/orgs/${orgId}/coach/voice-notes?tab=insights`)}
          className="w-full"
        >
          Open Voice Notes
        </Button>
      </div>
    </div>
  );
}
```

#### 4.2 Scheduled Cleanup Job

```typescript
// packages/backend/convex/crons.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired review links daily at 3am UTC
crons.daily(
  "cleanup-expired-review-links",
  { hourUTC: 3, minuteUTC: 0 },
  internal.models.whatsappReviewLinks.cleanupExpiredLinks
);

export default crons;
```

```typescript
// packages/backend/convex/models/whatsappReviewLinks.ts

export const cleanupExpiredLinks = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Find links expired more than 7 days ago
    const expiredLinks = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_expiresAt_and_status")
      .filter(q => q.lt(q.field("expiresAt"), sevenDaysAgo))
      .collect();

    // Delete them
    for (const link of expiredLinks) {
      await ctx.db.delete(link._id);
    }

    return { deleted: expiredLinks.length };
  },
});
```

---

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Add `whatsappReviewLinks` table to schema
- [ ] Implement `generateReviewLink` mutation
- [ ] Implement `getReviewLinkData` query
- [ ] Implement `markLinkAccessed` mutation
- [ ] Implement `findSimilarPlayers` query with Levenshtein
- [ ] Update `formatResultsMessage` to include deep links
- [ ] Generate review link in `checkAndAutoApply`

### Phase 2: Quick-Review Frontend
- [ ] Create `/r/[code]` redirect route
- [ ] Create `/orgs/[orgId]/coach/review/[code]` page
- [ ] Build `QuickReviewHeader` component
- [ ] Build `VoiceNoteContext` component (collapsible)
- [ ] Build `NeedsReviewSection` with action cards
- [ ] Build `UnmatchedSection` with fuzzy suggestions
- [ ] Build `AutoAppliedSection` (collapsed by default)
- [ ] Build `OtherPendingPrompt` component
- [ ] Build `LinkExpiredView` component
- [ ] Mobile-responsive styling throughout

### Phase 3: Trust-Adaptive Messaging
- [ ] Update message format for different trust levels
- [ ] Add emoji indicators
- [ ] Compact summaries with "+N more"

### Phase 4: Cleanup & Analytics
- [ ] Add cron job for link cleanup
- [ ] Track link access patterns
- [ ] Add analytics for review completion rates

---

## Testing Scenarios

### UAT Test Cases

| ID | Scenario | Expected |
|----|----------|----------|
| QR-001 | Valid link, single pending insight | Shows insight card with Apply/Dismiss buttons |
| QR-002 | Valid link, multiple unmatched | Shows fuzzy suggestions for each |
| QR-003 | Expired link | Shows "Link Expired" with redirect to voice notes |
| QR-004 | Invalid link code | Shows "Link Invalid" error |
| QR-005 | All insights already reviewed | Shows "All done!" message |
| QR-006 | Other pending items exist | Shows "3 other pending items" prompt |
| QR-007 | Fuzzy match with 90%+ similarity | Shows suggestion as top option |
| QR-008 | No fuzzy matches found | Shows "Search Players" button |
| QR-009 | Trust level 0, many pending | Message shows generic "4 insights need review" |
| QR-010 | Trust level 3, all applied | Message shows "✅ All applied!" |

---

## Files to Create/Modify

### New Files
- `packages/backend/convex/models/whatsappReviewLinks.ts`
- `apps/web/src/app/r/[code]/page.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/review/[code]/page.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/review/[code]/components/*.tsx`

### Modified Files
- `packages/backend/convex/schema.ts` - Add `whatsappReviewLinks` table
- `packages/backend/convex/actions/whatsapp.ts` - Update message formatting, generate links
- `packages/backend/convex/models/orgPlayerEnrollments.ts` - Add `findSimilarPlayers`
- `packages/backend/convex/crons.ts` - Add cleanup job (if exists, or create)

---

## Open Questions

1. **URL shortening**: Should we use a third-party URL shortener for even shorter links, or is `/r/Ab3xK9mQ` acceptable?

2. **Analytics**: Should we track which insights coaches most often edit vs apply directly?

3. **Offline support**: Should the quick-review page work offline with PWA caching?

4. **Batch actions**: Should we add "Apply All" button for insights that are ready?

---

*Created by Claude Code - January 25, 2026*
