# Phase 0: Onboarding Sync - Profile Completion for Guardian Matching

**Timeline**: Week 1-2 (Before Phase 1 Import Framework)
**Status**: Ready for Implementation
**Dependencies**: None
**Blocks**: Phase 1 (Import Framework) - Should be completed first

---

## Executive Summary

This PRD addresses a critical gap between the **Import Orchestrator** (admin imports members) and the **Onboarding Orchestrator** (users self-register). Currently, self-registered users provide only email and name, making it impossible to match them to imported records when email addresses differ.

**The Problem**: A parent imported with their work email (`mary@company.com`) cannot be matched when they sign up with their personal email (`mary@gmail.com`) because we have no alternative matching signals.

**The Solution**: Add a "Profile Completion" onboarding step that collects phone and postcode BEFORE the guardian claiming step, enabling multi-signal matching identical to the import system.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Solution Design](#3-solution-design)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Integration with Import Framework](#7-integration-with-import-framework)
8. [Testing Requirements](#8-testing-requirements)
9. [Ralph Integration](#9-ralph-integration)
10. [Definition of Done](#10-definition-of-done)

---

## 1. Problem Statement

### Current State

**Self-Registration collects:**
- Email (required)
- Password (required)
- Full Name (required)

**Import provides:**
- Email, Phone, Address, Town, Postcode, Country
- First Name, Last Name (separate fields)
- Date of Birth (for players)

### The Matching Gap

| Signal | Import → Import | Self-Reg → Import |
|--------|-----------------|-------------------|
| Email exact match | ✅ 50 pts | ✅ 50 pts |
| Surname + Postcode | ✅ 45 pts | ❌ No postcode |
| Phone match | ✅ 30 pts | ❌ No phone |
| Surname + Town | ✅ 35 pts | ❌ No town |
| Postcode only | ✅ 20 pts | ❌ No postcode |

**Result**: Self-registered users can only match via email. If email differs, they cannot find their children.

### Real-World Scenario

```
IMPORT (by club admin):
├── Guardian: Mary Smith
├── Email: mary.smith@company.com (work email on club file)
├── Phone: 087-123-4567
├── Postcode: D02XY45
└── Child: Emma Smith (linked with 85 points confidence)

SELF-REGISTRATION (by parent):
├── Email: mary.personal@gmail.com (personal email)
├── Name: Mary Smith
├── Phone: ❌ Not collected
└── Postcode: ❌ Not collected

MATCHING ATTEMPT:
├── Email match: ❌ Different emails (0 points)
├── Phone match: ❌ No phone to compare
├── Postcode match: ❌ No postcode to compare
└── RESULT: No match found. Mary cannot claim Emma.
```

### Business Impact

- **Parent frustration**: "I signed up but can't see my child"
- **Support burden**: Manual intervention required to link accounts
- **Data quality**: Duplicate guardian identities created
- **Trust erosion**: Parents lose confidence in the platform

---

## 2. Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **Improve Match Rate** | Increase guardian matching success from ~60% to 90%+ |
| **Reduce Support** | Eliminate manual account linking requests |
| **Data Quality** | Ensure self-registered users have matching-ready profiles |
| **Seamless UX** | Non-intrusive data collection that explains the "why" |

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Guardian match rate (email differs) | ~0% | >80% | Analytics |
| Manual linking support tickets | ~20/week | <5/week | Support system |
| Profile completion rate | N/A | >70% | Analytics |
| Time to first child acknowledgement | Unknown | <5 min | Analytics |

---

## 3. Solution Design

### 3.1 New Onboarding Task: Profile Completion

Insert a new onboarding task **before** the Guardian Claiming step:

**Updated Onboarding Task Priority Order:**

| Priority | Task | Status | Purpose |
|----------|------|--------|---------|
| 0 | GDPR Consent | Existing | Legal requirement |
| 1 | Accept Invitations | Existing | Pending org invites |
| **1.5** | **Profile Completion** | **NEW** | Collect matching signals |
| 2 | Guardian Identity Claiming | Existing | Claim imported identity |
| 3 | Child Acknowledgement | Existing | Acknowledge linked children |
| 4 | Player Graduation | Existing | 18+ player claiming |

### 3.2 Profile Completion Step UI

```
┌─────────────────────────────────────────────────────────────────┐
│  HELP US CONNECT YOU TO YOUR CHILDREN                           │
│                                                                  │
│  Your club may have registered you with different contact       │
│  details. Providing this information helps us find your         │
│  children's profiles automatically.                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Phone Number                                            │   │
│  │  [+353] [87 123 4567                    ]               │   │
│  │  📱 The mobile number your club has on file              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Postcode / Eircode                                      │   │
│  │  [D02 XY45                              ]               │   │
│  │  📍 Helps match you to your household                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alternative Email (optional)                            │   │
│  │  [mary.smith@company.com                ]               │   │
│  │  ✉️  If your club uses a different email for you         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  💡 All fields are optional, but providing them significantly   │
│     improves our ability to find your children's profiles.      │
│                                                                  │
│                              [Skip for Now]  [Save & Continue]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Enhanced Matching Flow

**Before (Current):**
```
Sign Up → Check email match → Show claiming dialog (if match) → Done
                           → No match found (if no match) → Dead end
```

**After (Proposed):**
```
Sign Up → Profile Completion Step → Enhanced multi-signal matching
                                  → Email match (50 pts)
                                  → Phone match (30 pts)
                                  → Postcode match (20 pts)
                                  → Alt email match (50 pts)
                                  → Show claiming dialog (if any match)
```

### 3.4 "Can't Find Children" Fallback

If no matches found even after profile completion, show a helpful fallback:

```
┌─────────────────────────────────────────────────────────────────┐
│  WE COULDN'T FIND YOUR CHILDREN YET                             │
│                                                                  │
│  We searched using:                                              │
│  • Email: mary.personal@gmail.com                                │
│  • Phone: 087-123-4567                                           │
│  • Postcode: D02XY45                                             │
│                                                                  │
│  This might happen if:                                           │
│  • Your club hasn't imported their member data yet               │
│  • Your contact details at the club are different                │
│  • You're new to the club                                        │
│                                                                  │
│  WHAT YOU CAN DO:                                                │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ 📧 Contact Club   │  │ 🔄 Try Different  │                   │
│  │                   │  │    Details        │                   │
│  │ Ask them to check │  │ Enter alternative │                   │
│  │ your details      │  │ email or phone    │                   │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                  │
│  [Continue Without Linking]  [Try Different Details]             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Skip Behavior

- User can skip Profile Completion step
- If skipped, proceed with email-only matching (current behavior)
- Track skip count (like Child Acknowledgement)
- After 3 skips, require action or explicit "I have no children to link"

---

## 4. Database Schema Changes

### 4.1 Option A: Extend User Table (Recommended)

Add optional fields to the existing Better Auth `user` table:

```typescript
// packages/backend/convex/betterAuth/schema.ts

// Add to user table
{
  ...existingUserFields,

  // NEW: Profile completion fields
  phone: v.optional(v.string()),
  altEmail: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),

  // NEW: Tracking fields
  profileCompletionStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("skipped")
  )),
  profileCompletedAt: v.optional(v.number()),
  profileSkipCount: v.optional(v.number()),
}
```

**New Indexes:**
```typescript
.index("by_phone", ["phone"])
.index("by_altEmail", ["altEmail"])
.index("by_postcode", ["postcode"])
```

### 4.2 Option B: Separate UserProfile Table

If extending the user table is problematic:

```typescript
// packages/backend/convex/schema.ts

userProfiles: defineTable({
  userId: v.string(),

  // Contact fields
  phone: v.optional(v.string()),
  altEmail: v.optional(v.string()),

  // Address fields
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),

  // Tracking
  completionStatus: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("skipped")
  ),
  completedAt: v.optional(v.number()),
  skipCount: v.number(),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_phone", ["phone"])
  .index("by_altEmail", ["altEmail"])
  .index("by_postcode", ["postcode"])
```

### 4.3 Recommendation

**Use Option A (extend user table)** because:
- Simpler queries (no joins)
- Better Auth user record is already the source of truth
- Fields are directly related to the user
- Consistent with existing `firstName`, `lastName` extensions

---

## 5. Backend Implementation

### 5.1 Files to Create

#### `/packages/backend/convex/models/userProfiles.ts` (~200 lines)

User profile completion mutations and queries.

```typescript
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Update user profile with matching-relevant fields
 */
export const updateProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    altEmail: v.optional(v.string()),
    postcode: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    profileCompletedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("user")
      .withIndex("by_email", q => q.eq("email", identity.email))
      .first();

    if (!user) throw new Error("User not found");

    // Normalize phone number
    const normalizedPhone = args.phone
      ? normalizePhoneNumber(args.phone)
      : undefined;

    // Normalize postcode
    const normalizedPostcode = args.postcode
      ? args.postcode.toUpperCase().replace(/\s+/g, '')
      : undefined;

    await ctx.db.patch(user._id, {
      phone: normalizedPhone,
      altEmail: args.altEmail?.toLowerCase(),
      postcode: normalizedPostcode,
      address: args.address,
      town: args.town,
      country: args.country,
      profileCompletionStatus: "completed",
      profileCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      profileCompletedAt: Date.now(),
    };
  },
});

/**
 * Skip profile completion (with tracking)
 */
export const skipProfileCompletion = mutation({
  args: {},
  returns: v.object({
    skipCount: v.number(),
    canSkipAgain: v.boolean(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("user")
      .withIndex("by_email", q => q.eq("email", identity.email))
      .first();

    if (!user) throw new Error("User not found");

    const newSkipCount = (user.profileSkipCount || 0) + 1;

    await ctx.db.patch(user._id, {
      profileSkipCount: newSkipCount,
      profileCompletionStatus: "skipped",
      updatedAt: Date.now(),
    });

    return {
      skipCount: newSkipCount,
      canSkipAgain: newSkipCount < 3,
    };
  },
});

/**
 * Get user profile status
 */
export const getProfileStatus = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.string(),
      phone: v.optional(v.string()),
      altEmail: v.optional(v.string()),
      postcode: v.optional(v.string()),
      skipCount: v.number(),
      canSkip: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("user")
      .withIndex("by_email", q => q.eq("email", identity.email))
      .first();

    if (!user) return null;

    return {
      status: user.profileCompletionStatus || "pending",
      phone: user.phone,
      altEmail: user.altEmail,
      postcode: user.postcode,
      skipCount: user.profileSkipCount || 0,
      canSkip: (user.profileSkipCount || 0) < 3,
    };
  },
});
```

#### `/packages/backend/convex/lib/matching/guardianMatcher.ts` (~300 lines)

Unified guardian matching logic used by both import and onboarding.

```typescript
import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Multi-signal guardian matching scoring
 *
 * IMPORTANT: These weights are shared between import and onboarding.
 * Any changes here affect both systems. Coordinate with import team.
 */
export const MATCHING_WEIGHTS = {
  EMAIL_EXACT: 50,
  SURNAME_POSTCODE: 45,
  SURNAME_TOWN: 35,
  PHONE: 30,
  POSTCODE_ONLY: 20,
  TOWN_ONLY: 10,
  HOUSE_NUMBER: 5,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 60,      // Auto-link
  MEDIUM: 40,    // Suggest, require confirmation
  LOW: 20,       // Show as possible
} as const;

export type MatchResult = {
  guardianIdentityId: Id<"guardianIdentities">;
  score: number;
  confidence: "high" | "medium" | "low";
  matchReasons: string[];
  guardian: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  linkedChildren: Array<{
    playerIdentityId: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }>;
};

/**
 * Find matching guardian identities for a self-registered user
 */
export async function findGuardianMatches(
  ctx: QueryCtx,
  params: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    altEmail?: string;
    postcode?: string;
    town?: string;
    address?: string;
  }
): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];

  // Strategy 1: Email exact match (primary email)
  const emailMatches = await findByEmail(ctx, params.email);

  // Strategy 2: Alt email match
  if (params.altEmail) {
    const altEmailMatches = await findByEmail(ctx, params.altEmail);
    emailMatches.push(...altEmailMatches);
  }

  // Strategy 3: Phone match
  if (params.phone) {
    const phoneMatches = await findByPhone(ctx, params.phone);
    emailMatches.push(...phoneMatches);
  }

  // Strategy 4: Surname + Postcode
  if (params.postcode) {
    const postcodeMatches = await findBySurnameAndPostcode(
      ctx,
      params.lastName,
      params.postcode
    );
    emailMatches.push(...postcodeMatches);
  }

  // Deduplicate and score
  const uniqueGuardians = deduplicateGuardians(emailMatches);

  for (const guardian of uniqueGuardians) {
    const score = calculateMatchScore(guardian, params);
    const confidence = getConfidenceLevel(score);

    if (score >= CONFIDENCE_THRESHOLDS.LOW) {
      const linkedChildren = await getLinkedChildren(ctx, guardian._id);

      matches.push({
        guardianIdentityId: guardian._id,
        score,
        confidence,
        matchReasons: getMatchReasons(guardian, params),
        guardian: {
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
        },
        linkedChildren,
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Calculate match score using multi-signal scoring
 */
function calculateMatchScore(
  guardian: GuardianIdentity,
  params: MatchParams
): number {
  let score = 0;

  // Email match (primary or alt)
  if (guardian.email) {
    if (guardian.email.toLowerCase() === params.email.toLowerCase()) {
      score += MATCHING_WEIGHTS.EMAIL_EXACT;
    } else if (params.altEmail &&
               guardian.email.toLowerCase() === params.altEmail.toLowerCase()) {
      score += MATCHING_WEIGHTS.EMAIL_EXACT;
    }
  }

  // Phone match (normalized)
  if (guardian.phone && params.phone) {
    const guardianPhone = normalizePhone(guardian.phone);
    const userPhone = normalizePhone(params.phone);
    if (guardianPhone === userPhone) {
      score += MATCHING_WEIGHTS.PHONE;
    }
  }

  // Surname + Postcode
  if (guardian.postcode && params.postcode) {
    const surnameMatch = guardian.lastName.toLowerCase() ===
                         params.lastName.toLowerCase();
    const postcodeMatch = normalizePostcode(guardian.postcode) ===
                          normalizePostcode(params.postcode);

    if (surnameMatch && postcodeMatch) {
      score += MATCHING_WEIGHTS.SURNAME_POSTCODE;
    } else if (postcodeMatch) {
      score += MATCHING_WEIGHTS.POSTCODE_ONLY;
    }
  }

  // Surname + Town
  if (guardian.town && params.town) {
    const surnameMatch = guardian.lastName.toLowerCase() ===
                         params.lastName.toLowerCase();
    const townMatch = guardian.town.toLowerCase() ===
                      params.town.toLowerCase();

    if (surnameMatch && townMatch) {
      score += MATCHING_WEIGHTS.SURNAME_TOWN;
    } else if (townMatch) {
      score += MATCHING_WEIGHTS.TOWN_ONLY;
    }
  }

  return score;
}

function getConfidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

// ... additional helper functions
```

### 5.2 Files to Modify

#### `/packages/backend/convex/models/onboarding.ts`

Add Profile Completion task at priority 1.5.

**Changes:**

```typescript
// Add new task type
type OnboardingTaskType =
  | "gdpr_consent"
  | "accept_invitations"
  | "profile_completion"    // NEW
  | "guardian_claiming"
  | "child_acknowledgement"
  | "player_graduation";

// Add to getOnboardingTasks() handler (around line 50)

// After Priority 1 (Accept Invitations), before Priority 2 (Guardian Claiming):

// Priority 1.5: Profile Completion
const profileStatus = await ctx.db
  .query("user")
  .withIndex("by_email", q => q.eq("email", user.email))
  .first();

const needsProfileCompletion =
  !profileStatus?.profileCompletionStatus ||
  profileStatus.profileCompletionStatus === "pending";

const canSkipProfile = (profileStatus?.profileSkipCount || 0) < 3;

if (needsProfileCompletion) {
  tasks.push({
    type: "profile_completion",
    priority: 1.5,
    data: {
      currentPhone: profileStatus?.phone,
      currentPostcode: profileStatus?.postcode,
      skipCount: profileStatus?.profileSkipCount || 0,
      canSkip: canSkipProfile,
      reason: "Helps us connect you to your children's profiles",
    },
  });
}
```

#### `/packages/backend/convex/models/guardianIdentities.ts`

Update `checkForClaimableIdentity` to use multi-signal matching.

**Changes:**

```typescript
// Replace existing checkForClaimableIdentity (around line 1662)

export const checkForClaimableIdentity = query({
  args: {
    email: v.string(),
    name: v.string(),
    // NEW: Additional matching signals
    phone: v.optional(v.string()),
    altEmail: v.optional(v.string()),
    postcode: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      hasClaimableIdentity: v.literal(true),
      matches: v.array(v.object({
        guardianIdentityId: v.id("guardianIdentities"),
        confidence: v.number(),
        confidenceLevel: v.string(),
        matchReasons: v.array(v.string()),
        guardian: v.object({
          firstName: v.string(),
          lastName: v.string(),
          email: v.optional(v.string()),
        }),
        linkedChildren: v.array(v.object({
          playerIdentityId: v.id("playerIdentities"),
          firstName: v.string(),
          lastName: v.string(),
        })),
      })),
    }),
    v.object({
      hasClaimableIdentity: v.literal(false),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Parse name into first/last
    const { firstName, lastName } = parseFullName(args.name);

    // Use unified matching logic
    const matches = await findGuardianMatches(ctx, {
      email: args.email,
      firstName,
      lastName,
      phone: args.phone,
      altEmail: args.altEmail,
      postcode: args.postcode,
    });

    // Filter to unclaimed guardians only
    const unclaimedMatches = matches.filter(m =>
      !m.guardian.userId && m.linkedChildren.length > 0
    );

    if (unclaimedMatches.length === 0) {
      return {
        hasClaimableIdentity: false,
        reason: "No matching guardian profiles found with linked children",
      };
    }

    return {
      hasClaimableIdentity: true,
      matches: unclaimedMatches.map(m => ({
        guardianIdentityId: m.guardianIdentityId,
        confidence: m.score,
        confidenceLevel: m.confidence,
        matchReasons: m.matchReasons,
        guardian: m.guardian,
        linkedChildren: m.linkedChildren,
      })),
    };
  },
});
```

---

## 6. Frontend Implementation

### 6.1 Files to Create

#### `/apps/web/src/components/onboarding/ProfileCompletionStep.tsx` (~350 lines)

Profile completion form component.

```typescript
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, MapPin, Mail, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileCompletionStepProps {
  onComplete: () => void;
  onSkip: () => void;
  canSkip: boolean;
  skipCount: number;
}

export function ProfileCompletionStep({
  onComplete,
  onSkip,
  canSkip,
  skipCount,
}: ProfileCompletionStepProps) {
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [altEmail, setAltEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateProfile = useMutation(api.userProfiles.updateProfile);
  const skipProfile = useMutation(api.userProfiles.skipProfileCompletion);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProfile({
        phone: phone || undefined,
        postcode: postcode || undefined,
        altEmail: altEmail || undefined,
      });

      toast.success("Profile updated! Searching for your children...");
      onComplete();
    } catch (error) {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      const result = await skipProfile({});

      if (!result.canSkipAgain) {
        toast.info("You can complete your profile anytime from Settings.");
      }

      onSkip();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Help Us Connect You to Your Children
        </CardTitle>
        <CardDescription>
          Your club may have registered you with different contact details.
          Providing this information helps us find your children's profiles
          automatically.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+353 87 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              The mobile number your club has on file
            </p>
          </div>

          {/* Postcode */}
          <div className="space-y-2">
            <Label htmlFor="postcode" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Postcode / Eircode
            </Label>
            <Input
              id="postcode"
              placeholder="D02 XY45"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            />
            <p className="text-sm text-muted-foreground">
              Helps match you to your household
            </p>
          </div>

          {/* Alternative Email */}
          <div className="space-y-2">
            <Label htmlFor="altEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Alternative Email (optional)
            </Label>
            <Input
              id="altEmail"
              type="email"
              placeholder="other.email@example.com"
              value={altEmail}
              onChange={(e) => setAltEmail(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              If your club uses a different email for you
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Why do we ask for this?</strong>
              <br />
              Clubs often register families with different contact details than
              parents use personally. This helps us connect you even if your
              emails don't match exactly.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          {canSkip ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip for Now
              {skipCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({3 - skipCount} left)
                </span>
              )}
            </Button>
          ) : (
            <div />
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

#### `/apps/web/src/components/onboarding/NoChildrenFoundStep.tsx` (~250 lines)

Fallback when no matches found.

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, Phone, RotateCcw, Building2 } from "lucide-react";

interface NoChildrenFoundStepProps {
  searchedWith: {
    email: string;
    phone?: string;
    postcode?: string;
  };
  onRetryWithNewDetails: (details: {
    altEmail?: string;
    phone?: string;
    postcode?: string;
  }) => void;
  onContinueWithoutLinking: () => void;
  onContactClub: () => void;
}

export function NoChildrenFoundStep({
  searchedWith,
  onRetryWithNewDetails,
  onContinueWithoutLinking,
  onContactClub,
}: NoChildrenFoundStepProps) {
  const [showRetryForm, setShowRetryForm] = useState(false);
  const [altEmail, setAltEmail] = useState("");
  const [phone, setPhone] = useState(searchedWith.phone || "");
  const [postcode, setPostcode] = useState(searchedWith.postcode || "");

  const handleRetry = () => {
    onRetryWithNewDetails({
      altEmail: altEmail || undefined,
      phone: phone || undefined,
      postcode: postcode || undefined,
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-5 w-5" />
          We Couldn't Find Your Children Yet
        </CardTitle>
        <CardDescription>
          We searched using your contact details but didn't find any linked
          children's profiles.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* What We Searched */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">We searched using:</p>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {searchedWith.email}
            </li>
            {searchedWith.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {searchedWith.phone}
              </li>
            )}
            {searchedWith.postcode && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {searchedWith.postcode}
              </li>
            )}
          </ul>
        </div>

        {/* Possible Reasons */}
        <div>
          <p className="text-sm font-medium mb-2">This might happen if:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Your club hasn't imported their member data yet</li>
            <li>Your contact details at the club are different</li>
            <li>You're new to the club</li>
          </ul>
        </div>

        {/* Retry Form */}
        {showRetryForm ? (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Try different details:</p>

            <div className="space-y-2">
              <Label htmlFor="altEmail">Alternative Email</Label>
              <Input
                id="altEmail"
                type="email"
                placeholder="work.email@company.com"
                value={altEmail}
                onChange={(e) => setAltEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+353 87 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                placeholder="D02 XY45"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              />
            </div>

            <Button onClick={handleRetry} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Search Again
            </Button>
          </div>
        ) : (
          /* Action Buttons */
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setShowRetryForm(true)}
              className="flex flex-col h-auto py-4"
            >
              <RotateCcw className="h-6 w-6 mb-2" />
              <span className="text-sm">Try Different Details</span>
            </Button>

            <Button
              variant="outline"
              onClick={onContactClub}
              className="flex flex-col h-auto py-4"
            >
              <Building2 className="h-6 w-6 mb-2" />
              <span className="text-sm">Contact Club</span>
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          variant="ghost"
          onClick={onContinueWithoutLinking}
          className="w-full"
        >
          Continue Without Linking
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 6.2 Files to Modify

#### `/apps/web/src/components/onboarding/OnboardingWizard.tsx`

Add Profile Completion step to the wizard.

**Changes:**
- Import `ProfileCompletionStep` component
- Add case for `"profile_completion"` task type
- Handle completion → re-run matching → show claiming dialog

#### `/apps/web/src/components/sign-up-form.tsx`

Update post-signup flow to include profile completion.

**Changes:**
- After signup, check if profile completion is needed
- If needed, redirect to onboarding (which now includes profile step)
- Pass initial email/name to matching

---

## 7. Integration with Import Framework

### 7.1 Shared Matching Logic

The `guardianMatcher.ts` module will be used by:

1. **Import Orchestrator** (`playerImport.ts`)
   - During Phase 2: Guardian matching within batch
   - Uses full signal set (email, phone, address, postcode)

2. **Onboarding Orchestrator** (`guardianIdentities.ts`)
   - During `checkForClaimableIdentity` query
   - Uses signals collected from profile completion

### 7.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     IMPORT ORCHESTRATOR                          │
│                                                                  │
│  CSV Upload → Parse → Guardian Matching → Create Records         │
│                           │                                      │
│                           │ Uses guardianMatcher.ts              │
│                           │ (email, phone, postcode, address)    │
│                           ▼                                      │
│                    Guardian Identity                             │
│                    ├── email: mary@company.com                   │
│                    ├── phone: 087-123-4567                       │
│                    ├── postcode: D02XY45                         │
│                    └── userId: null (unclaimed)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Guardian waits to be claimed
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ONBOARDING ORCHESTRATOR                        │
│                                                                  │
│  Sign Up → Profile Completion → Guardian Matching → Claim        │
│                   │                   │                          │
│                   │                   │ Uses guardianMatcher.ts  │
│                   ▼                   │ (same scoring logic)     │
│            User provides:             ▼                          │
│            ├── email: mary@gmail.com  Matches on:                │
│            ├── phone: 087-123-4567 ──→ Phone: +30 pts            │
│            └── postcode: D02XY45 ────→ Postcode: +20 pts         │
│                                                                  │
│                              TOTAL: 50 pts = MEDIUM confidence   │
│                              → Show claiming dialog              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Matching Weights (Shared)

Both systems use identical weights from `MATCHING_WEIGHTS`:

| Signal | Points | Used By |
|--------|--------|---------|
| Email exact | 50 | Import ✅, Onboarding ✅ |
| Surname + Postcode | 45 | Import ✅, Onboarding ✅ |
| Surname + Town | 35 | Import ✅, Onboarding ✅ |
| Phone | 30 | Import ✅, Onboarding ✅ |
| Postcode only | 20 | Import ✅, Onboarding ✅ |
| Town only | 10 | Import ✅, Onboarding ✅ |
| House number | 5 | Import ✅, Onboarding ⚠️ (if address collected) |

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Backend:**
- `guardianMatcher.ts`: All scoring scenarios
- `userProfiles.ts`: Profile update, skip tracking
- `onboarding.ts`: Task priority ordering

**Frontend:**
- `ProfileCompletionStep`: Form validation, submission
- `NoChildrenFoundStep`: Retry flow, continue flow

### 8.2 Integration Tests

1. **Happy Path: Email Match**
   - Import guardian with email A
   - User signs up with email A
   - Should match immediately (50 pts)

2. **Happy Path: Phone Match**
   - Import guardian with email A, phone X
   - User signs up with email B
   - User completes profile with phone X
   - Should match via phone (30 pts)

3. **Happy Path: Postcode Match**
   - Import guardian with email A, postcode Y
   - User signs up with email B
   - User completes profile with postcode Y + same surname
   - Should match via surname + postcode (45 pts)

4. **Edge Case: No Match**
   - Import guardian with email A, phone X, postcode Y
   - User signs up with email B
   - User completes profile with phone Z, postcode W
   - Should show "No children found" flow

5. **Edge Case: Skip Limit**
   - User skips profile completion 3 times
   - 4th time should not allow skip

6. **Edge Case: Multiple Matches**
   - Import two guardians with same postcode, different phones
   - User matches both
   - Should show both in claiming dialog with confidence scores

### 8.3 Manual UAT

1. Import 10 families with varied contact details
2. Create test users with:
   - Same email as import → immediate match
   - Different email, same phone → match after profile completion
   - Different email, same postcode → match after profile completion
   - No matching signals → "No children found" flow
3. Verify skip behavior (3 skip limit)
4. Verify "Contact Club" flow

---

## 9. Ralph Integration

### 9.1 Parallel Work Streams

#### Stream 1: Backend Core (3-4 days)

**Agent 1: Schema & Migrations**
- Add fields to user table
- Create indexes
- Migration script

**Agent 2: Unified Matching Logic**
- Create `guardianMatcher.ts`
- Extract logic from `playerImport.ts`
- Unit tests

**Agent 3: User Profile Mutations**
- Create `userProfiles.ts`
- Update profile mutation
- Skip tracking mutation
- Unit tests

#### Stream 2: Backend Integration (2-3 days)

**Agent 4: Onboarding Task**
- Add profile completion task to `onboarding.ts`
- Priority 1.5 insertion
- Task data structure

**Agent 5: Enhanced Claiming**
- Update `checkForClaimableIdentity`
- Multi-signal matching
- Integration tests

#### Stream 3: Frontend (3-4 days)

**Agent 6: Profile Completion Component**
- Create `ProfileCompletionStep.tsx`
- Form validation
- Phone/postcode normalization

**Agent 7: No Children Found Component**
- Create `NoChildrenFoundStep.tsx`
- Retry flow
- Contact club flow

**Agent 8: Wizard Integration**
- Update `OnboardingWizard.tsx`
- Add profile completion step
- Handle step transitions

#### Stream 4: Testing (2-3 days)

**Agent 9: Unit Tests**
- Backend unit tests
- Frontend component tests

**Agent 10: Integration Tests**
- End-to-end flows
- Edge cases

### 9.2 Agent Coordination

```
Week 1:
├── Days 1-2: Stream 1 (Backend Core)
│   ├── Agent 1: Schema
│   ├── Agent 2: Matching logic
│   └── Agent 3: Profile mutations
│
├── Days 3-4: Stream 2 (Backend Integration) + Stream 3 Start
│   ├── Agent 4: Onboarding task
│   ├── Agent 5: Enhanced claiming
│   └── Agent 6: Profile component (start)
│
└── Days 5: Stream 3 Continue
    ├── Agent 6: Profile component (complete)
    ├── Agent 7: No children found component
    └── Agent 8: Wizard integration

Week 2:
├── Days 1-2: Stream 3 Complete + Stream 4
│   ├── Agent 8: Wizard integration (complete)
│   ├── Agent 9: Unit tests
│   └── Agent 10: Integration tests
│
└── Days 3: Final integration & UAT prep
```

---

## 10. Definition of Done

### Code Complete
- [ ] User table extended with profile fields
- [ ] `guardianMatcher.ts` created with shared matching logic
- [ ] `userProfiles.ts` created with mutations
- [ ] Profile Completion onboarding task added
- [ ] `checkForClaimableIdentity` enhanced with multi-signal matching
- [ ] `ProfileCompletionStep.tsx` component created
- [ ] `NoChildrenFoundStep.tsx` component created
- [ ] Onboarding wizard updated

### Testing Complete
- [ ] Unit tests for matching logic
- [ ] Unit tests for profile mutations
- [ ] Component tests for new UI
- [ ] Integration tests for all flows
- [ ] Manual UAT scenarios passed

### Documentation Complete
- [ ] Code comments
- [ ] Updated CLAUDE.md (if needed)
- [ ] API documentation

### Review & Deploy
- [ ] Code review approved
- [ ] No TypeScript errors
- [ ] No lint errors (`npx ultracite fix`)
- [ ] Deployed to development
- [ ] UAT sign-off

---

## Appendix A: Phone Number Normalization

```typescript
/**
 * Normalize phone number for comparison
 * Handles Irish (+353) and UK (+44) formats
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // Handle Irish mobile starting with 08
  if (digits.startsWith('08') && digits.length === 10) {
    digits = '353' + digits.substring(1);
  }

  // Handle UK mobile starting with 07
  if (digits.startsWith('07') && digits.length === 11) {
    digits = '44' + digits.substring(1);
  }

  // Remove leading zeros after country code
  if (digits.startsWith('353')) {
    digits = '353' + digits.substring(3).replace(/^0+/, '');
  }

  return digits;
}
```

## Appendix B: Postcode Normalization

```typescript
/**
 * Normalize postcode for comparison
 * Handles Irish Eircodes and UK postcodes
 */
export function normalizePostcode(postcode: string): string {
  // Remove all whitespace and convert to uppercase
  return postcode.replace(/\s+/g, '').toUpperCase();
}
```

---

**Next**: After Phase 0 is complete, proceed to [Phase 1: Foundation & Multi-Sport Support](./phase-1-foundation.md)
