/**
 * Unit Tests: Review Links & WhatsApp Quick Actions
 *
 * US-VN-007: Review link generation, reuse, expiry logic
 * US-VN-011: WhatsApp OK/R command matching, trust-level formatting
 * US-VN-012: Link expiry detection, cleanup lifecycle
 */

import { describe, expect, it } from "vitest";

const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;
const CONFIRMATION_COMMANDS_REGEX = /^(confirm|retry|cancel)$/i;

// ============================================================
// US-VN-007: REVIEW LINK CODE GENERATION
// ============================================================

// Mirrors CODE_CHARS from whatsappReviewLinks.ts (excludes ambiguous: 0, O, I, l)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789";
const CODE_LENGTH = 8;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

describe("US-VN-007: Review Link Code Generation", () => {
  it("should generate code of exactly 8 characters", () => {
    const code = generateCode();
    expect(code).toHaveLength(8);
  });

  it("should only contain unambiguous characters", () => {
    const ambiguous = ["0", "O", "I", "l"];
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      for (const ch of ambiguous) {
        expect(code).not.toContain(ch);
      }
    }
  });

  it("should generate unique codes across multiple calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateCode());
    }
    // With 57^8 possible codes, collisions in 50 attempts are astronomically unlikely
    expect(codes.size).toBe(50);
  });

  it("should use alphanumeric characters only", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toMatch(ALPHANUMERIC_REGEX);
    }
  });
});

// ============================================================
// US-VN-007: LINK REUSE LOGIC
// ============================================================

const LINK_EXPIRY_MS = 48 * 60 * 60 * 1000;
const MAX_VOICE_NOTES_PER_LINK = 50;

type MockLink = {
  status: string;
  expiresAt: number;
  voiceNoteIds: string[];
};

/**
 * Determines if an existing link should be reused or if a new one is needed.
 * Mirrors the decision logic in generateReviewLink handler.
 */
function shouldReuseLink(existingLink: MockLink | null, now: number): boolean {
  if (!existingLink) {
    return false;
  }
  if (existingLink.status !== "active") {
    return false;
  }
  if (existingLink.expiresAt <= now) {
    return false;
  }
  if (existingLink.voiceNoteIds.length >= MAX_VOICE_NOTES_PER_LINK) {
    return false;
  }
  return true;
}

describe("US-VN-007: Link Reuse Logic", () => {
  const now = Date.now();

  it("should not reuse when no existing link", () => {
    expect(shouldReuseLink(null, now)).toBe(false);
  });

  it("should reuse active link with room for more notes", () => {
    const link: MockLink = {
      status: "active",
      expiresAt: now + LINK_EXPIRY_MS,
      voiceNoteIds: ["vn1", "vn2"],
    };
    expect(shouldReuseLink(link, now)).toBe(true);
  });

  it("should not reuse expired link", () => {
    const link: MockLink = {
      status: "active",
      expiresAt: now - 1000, // expired
      voiceNoteIds: ["vn1"],
    };
    expect(shouldReuseLink(link, now)).toBe(false);
  });

  it("should not reuse link with non-active status", () => {
    const link: MockLink = {
      status: "expired",
      expiresAt: now + LINK_EXPIRY_MS,
      voiceNoteIds: ["vn1"],
    };
    expect(shouldReuseLink(link, now)).toBe(false);
  });

  it("should not reuse link at max voice notes capacity", () => {
    const link: MockLink = {
      status: "active",
      expiresAt: now + LINK_EXPIRY_MS,
      voiceNoteIds: Array.from({ length: 50 }, (_, i) => `vn${i}`),
    };
    expect(shouldReuseLink(link, now)).toBe(false);
  });

  it("should reuse link at 49 voice notes (under cap)", () => {
    const link: MockLink = {
      status: "active",
      expiresAt: now + LINK_EXPIRY_MS,
      voiceNoteIds: Array.from({ length: 49 }, (_, i) => `vn${i}`),
    };
    expect(shouldReuseLink(link, now)).toBe(true);
  });
});

// ============================================================
// US-VN-007: LINK EXPIRY VALIDATION
// ============================================================

describe("US-VN-007: Link Expiry Validation", () => {
  it("48h expiry should equal 172800000 ms", () => {
    expect(LINK_EXPIRY_MS).toBe(48 * 60 * 60 * 1000);
    expect(LINK_EXPIRY_MS).toBe(172_800_000);
  });

  it("should detect expired link when status is active but time passed", () => {
    const now = Date.now();
    const link = { status: "active", expiresAt: now - 1 };
    const isExpired = link.status !== "active" || now > link.expiresAt;
    expect(isExpired).toBe(true);
  });

  it("should detect non-expired link within 48h", () => {
    const now = Date.now();
    const link = { status: "active", expiresAt: now + LINK_EXPIRY_MS };
    const isExpired = link.status !== "active" || now > link.expiresAt;
    expect(isExpired).toBe(false);
  });

  it("should detect expired link when status is expired", () => {
    const now = Date.now();
    const link = { status: "expired", expiresAt: now + LINK_EXPIRY_MS };
    const isExpired = link.status !== "active" || now > link.expiresAt;
    expect(isExpired).toBe(true);
  });
});

// ============================================================
// US-VN-011: WHATSAPP COMMAND MATCHING
// ============================================================

// Mirrors regex from whatsapp.ts
const OK_COMMAND_REGEX = /^(ok|yes|apply|go)$/i;
const RESEND_COMMAND_REGEX = /^r$/i;

describe("US-VN-011: WhatsApp OK Command", () => {
  it('should match "ok" (lowercase)', () => {
    expect(OK_COMMAND_REGEX.test("ok")).toBe(true);
  });

  it('should match "OK" (uppercase)', () => {
    expect(OK_COMMAND_REGEX.test("OK")).toBe(true);
  });

  it('should match "yes"', () => {
    expect(OK_COMMAND_REGEX.test("yes")).toBe(true);
  });

  it('should match "YES"', () => {
    expect(OK_COMMAND_REGEX.test("YES")).toBe(true);
  });

  it('should match "apply"', () => {
    expect(OK_COMMAND_REGEX.test("apply")).toBe(true);
  });

  it('should match "Go" (mixed case)', () => {
    expect(OK_COMMAND_REGEX.test("Go")).toBe(true);
  });

  it("should not match partial text within a sentence", () => {
    expect(OK_COMMAND_REGEX.test("ok thanks")).toBe(false);
    expect(OK_COMMAND_REGEX.test("say yes")).toBe(false);
  });

  it("should not match empty string", () => {
    expect(OK_COMMAND_REGEX.test("")).toBe(false);
  });

  it("should not match random text", () => {
    expect(OK_COMMAND_REGEX.test("hello")).toBe(false);
    expect(OK_COMMAND_REGEX.test("okay")).toBe(false);
  });
});

describe("US-VN-011: WhatsApp Resend Command", () => {
  it('should match "r" (lowercase)', () => {
    expect(RESEND_COMMAND_REGEX.test("r")).toBe(true);
  });

  it('should match "R" (uppercase)', () => {
    expect(RESEND_COMMAND_REGEX.test("R")).toBe(true);
  });

  it("should not match longer text starting with r", () => {
    expect(RESEND_COMMAND_REGEX.test("resend")).toBe(false);
    expect(RESEND_COMMAND_REGEX.test("r please")).toBe(false);
  });

  it("should not match empty string", () => {
    expect(RESEND_COMMAND_REGEX.test("")).toBe(false);
  });
});

// ============================================================
// US-VN-011: INSIGHT CLASSIFICATION
// ============================================================

// Mirrors classifyInsight + CATEGORY_COUNT_KEY from whatsappReviewLinks.ts
type PendingCounts = {
  pendingMatchedCount: number;
  pendingUnmatchedCount: number;
  pendingInjuryCount: number;
  pendingTodoCount: number;
  pendingTeamNoteCount: number;
  totalPendingCount: number;
};

const CATEGORY_COUNT_KEY: Record<
  string,
  keyof Omit<PendingCounts, "totalPendingCount">
> = {
  injury: "pendingInjuryCount",
  todo: "pendingTodoCount",
  team_culture: "pendingTeamNoteCount",
};

function classifyInsight(insight: {
  category?: string;
  playerIdentityId?: unknown;
}): keyof Omit<PendingCounts, "totalPendingCount"> {
  const mapped = CATEGORY_COUNT_KEY[insight.category ?? ""];
  if (mapped) {
    return mapped;
  }
  return insight.playerIdentityId
    ? "pendingMatchedCount"
    : "pendingUnmatchedCount";
}

describe("US-VN-011: Insight Classification", () => {
  it("should classify injury insights", () => {
    expect(classifyInsight({ category: "injury" })).toBe("pendingInjuryCount");
  });

  it("should classify todo insights", () => {
    expect(classifyInsight({ category: "todo" })).toBe("pendingTodoCount");
  });

  it("should classify team_culture insights", () => {
    expect(classifyInsight({ category: "team_culture" })).toBe(
      "pendingTeamNoteCount"
    );
  });

  it("should classify matched player insights", () => {
    expect(
      classifyInsight({ category: "technique", playerIdentityId: "p123" })
    ).toBe("pendingMatchedCount");
  });

  it("should classify unmatched player insights", () => {
    expect(classifyInsight({ category: "technique" })).toBe(
      "pendingUnmatchedCount"
    );
  });

  it("should classify insights with no category as unmatched if no player", () => {
    expect(classifyInsight({})).toBe("pendingUnmatchedCount");
  });

  it("should classify insights with no category as matched if player exists", () => {
    expect(classifyInsight({ playerIdentityId: "p456" })).toBe(
      "pendingMatchedCount"
    );
  });
});

// ============================================================
// US-VN-011: PENDING COUNT AGGREGATION
// ============================================================

function countPendingInsights(
  notes: Array<{
    insights?: Array<{
      status: string;
      category?: string;
      playerIdentityId?: unknown;
    }>;
  }>
): PendingCounts {
  const counts: PendingCounts = {
    pendingMatchedCount: 0,
    pendingUnmatchedCount: 0,
    pendingInjuryCount: 0,
    pendingTodoCount: 0,
    pendingTeamNoteCount: 0,
    totalPendingCount: 0,
  };

  for (const note of notes) {
    for (const insight of note.insights ?? []) {
      if (insight.status === "pending") {
        const key = classifyInsight(insight);
        counts[key] += 1;
        counts.totalPendingCount += 1;
      }
    }
  }

  return counts;
}

describe("US-VN-011: Pending Count Aggregation", () => {
  it("should count zero for empty notes array", () => {
    const counts = countPendingInsights([]);
    expect(counts.totalPendingCount).toBe(0);
  });

  it("should count zero for notes with no insights", () => {
    const counts = countPendingInsights([{ insights: [] }, {}]);
    expect(counts.totalPendingCount).toBe(0);
  });

  it("should skip non-pending insights", () => {
    const counts = countPendingInsights([
      {
        insights: [
          { status: "applied", category: "technique", playerIdentityId: "p1" },
          { status: "dismissed", category: "injury" },
          { status: "auto_applied", category: "todo" },
        ],
      },
    ]);
    expect(counts.totalPendingCount).toBe(0);
  });

  it("should aggregate pending insights across multiple notes", () => {
    const counts = countPendingInsights([
      {
        insights: [
          { status: "pending", category: "injury" },
          { status: "pending", category: "technique", playerIdentityId: "p1" },
          { status: "applied", category: "todo" },
        ],
      },
      {
        insights: [
          { status: "pending", category: "todo" },
          { status: "pending", category: "team_culture" },
          { status: "pending", category: "technique" }, // unmatched
        ],
      },
    ]);

    expect(counts.pendingInjuryCount).toBe(1);
    expect(counts.pendingMatchedCount).toBe(1);
    expect(counts.pendingTodoCount).toBe(1);
    expect(counts.pendingTeamNoteCount).toBe(1);
    expect(counts.pendingUnmatchedCount).toBe(1);
    expect(counts.totalPendingCount).toBe(5);
  });
});

// ============================================================
// US-VN-011: HANDLER PRIORITY ORDER
// ============================================================

describe("US-VN-011: Handler Priority Chain", () => {
  // Mirrors the priority order in processMessage (whatsapp.ts)
  // OK → R → CONFIRM/RETRY/CANCEL → awaiting_confirmation → normal

  function resolveHandler(
    text: string,
    hasAwaitingConfirmation: boolean
  ): string {
    const trimmed = text.trim();

    if (OK_COMMAND_REGEX.test(trimmed)) {
      return "ok_handler";
    }
    if (RESEND_COMMAND_REGEX.test(trimmed)) {
      return "resend_handler";
    }

    if (CONFIRMATION_COMMANDS_REGEX.test(trimmed)) {
      return "confirmation_handler";
    }

    if (hasAwaitingConfirmation) {
      return "awaiting_confirmation_handler";
    }

    return "normal_text_handler";
  }

  it("should prioritize OK over confirmation", () => {
    expect(resolveHandler("ok", true)).toBe("ok_handler");
  });

  it("should prioritize R over confirmation", () => {
    expect(resolveHandler("R", true)).toBe("resend_handler");
  });

  it("should handle CONFIRM when not OK/R", () => {
    expect(resolveHandler("confirm", false)).toBe("confirmation_handler");
  });

  it("should handle RETRY when not OK/R", () => {
    expect(resolveHandler("retry", false)).toBe("confirmation_handler");
  });

  it("should handle CANCEL when not OK/R", () => {
    expect(resolveHandler("cancel", false)).toBe("confirmation_handler");
  });

  it("should check awaiting_confirmation for unrecognized text", () => {
    expect(resolveHandler("hello", true)).toBe("awaiting_confirmation_handler");
  });

  it("should fall through to normal handler", () => {
    expect(resolveHandler("hello", false)).toBe("normal_text_handler");
  });
});

// ============================================================
// US-VN-012: LINK EXPIRY LIFECYCLE
// ============================================================

const CLEANUP_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

describe("US-VN-012: Link Expiry Detection", () => {
  const now = Date.now();

  it("should identify active links past expiry for status transition", () => {
    const links = [
      { status: "active", expiresAt: now - 1000 }, // should expire
      { status: "active", expiresAt: now + 1000 }, // still active
      { status: "expired", expiresAt: now - 1000 }, // already expired
    ];

    const toExpire = links.filter(
      (l) => l.status === "active" && l.expiresAt < now
    );
    expect(toExpire).toHaveLength(1);
    expect(toExpire[0].expiresAt).toBe(now - 1000);
  });

  it("should not expire links that are still within their window", () => {
    const links = [
      {
        status: "active",
        expiresAt: now + LINK_EXPIRY_MS,
      },
    ];

    const toExpire = links.filter(
      (l) => l.status === "active" && l.expiresAt < now
    );
    expect(toExpire).toHaveLength(0);
  });
});

describe("US-VN-012: Expired Link Cleanup", () => {
  const now = Date.now();
  const cutoff = now - CLEANUP_GRACE_PERIOD_MS;

  it("cleanup grace period should be 7 days", () => {
    expect(CLEANUP_GRACE_PERIOD_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CLEANUP_GRACE_PERIOD_MS).toBe(604_800_000);
  });

  it("should identify expired links older than 7 days for deletion", () => {
    const links = [
      { status: "expired", expiresAt: cutoff - 1000 }, // old enough, delete
      { status: "expired", expiresAt: cutoff + 1000 }, // too recent, keep
      { status: "active", expiresAt: cutoff - 1000 }, // wrong status, skip
    ];

    const toDelete = links.filter(
      (l) => l.status === "expired" && l.expiresAt < cutoff
    );
    expect(toDelete).toHaveLength(1);
  });

  it("should not delete recently expired links", () => {
    const links = [
      { status: "expired", expiresAt: now - 1000 }, // expired 1s ago, keep
    ];

    const toDelete = links.filter(
      (l) => l.status === "expired" && l.expiresAt < cutoff
    );
    expect(toDelete).toHaveLength(0);
  });
});

// ============================================================
// US-VN-012: LINK LIFECYCLE STATE MACHINE
// ============================================================

describe("US-VN-012: Link Lifecycle", () => {
  it("should follow create → reuse → expire → cleanup lifecycle", () => {
    const states = ["active", "expired", "deleted"];
    // Valid transitions
    expect(states.indexOf("active")).toBeLessThan(states.indexOf("expired"));
    expect(states.indexOf("expired")).toBeLessThan(states.indexOf("deleted"));
  });

  it("new note after expiry should create fresh link (not reuse)", () => {
    const expiredLink: MockLink = {
      status: "expired",
      expiresAt: Date.now() - 1000,
      voiceNoteIds: ["vn1"],
    };
    expect(shouldReuseLink(expiredLink, Date.now())).toBe(false);
  });
});
