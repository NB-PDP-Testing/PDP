/**
 * Unit Tests: WhatsApp Voice Notes with Multi-Org Detection
 *
 * Covers:
 * - Phone number normalization
 * - Multi-org detection strategies
 * - Age group extraction
 * - Sport extraction
 * - Org selection parsing
 * - Session timeout logic
 * - Trust-based auto-apply categorization
 */

import { describe, expect, it } from "vitest";

// ============================================================
// CONSTANTS
// ============================================================

const WHATSAPP_PREFIX_REGEX = /^whatsapp:/;

// ============================================================
// PHONE NUMBER NORMALIZATION
// ============================================================

/**
 * Normalize a phone number for comparison.
 * Removes all non-digit characters except leading +
 */
function normalizePhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

describe("Phone Number Normalization", () => {
  it("should preserve leading + sign", () => {
    expect(normalizePhoneNumber("+353851234567")).toBe("+353851234567");
  });

  it("should remove spaces from phone number", () => {
    expect(normalizePhoneNumber("+353 85 123 4567")).toBe("+353851234567");
  });

  it("should remove dashes from phone number", () => {
    expect(normalizePhoneNumber("+353-85-123-4567")).toBe("+353851234567");
  });

  it("should remove parentheses from phone number", () => {
    expect(normalizePhoneNumber("+353(85)1234567")).toBe("+353851234567");
  });

  it("should handle phone without + prefix", () => {
    expect(normalizePhoneNumber("353851234567")).toBe("353851234567");
  });

  it("should handle mixed formatting", () => {
    expect(normalizePhoneNumber("+353 (85) 123-4567")).toBe("+353851234567");
  });

  it("should strip whatsapp: prefix before normalizing", () => {
    const phone = "whatsapp:+353851234567".replace(WHATSAPP_PREFIX_REGEX, "");
    expect(normalizePhoneNumber(phone)).toBe("+353851234567");
  });
});

// ============================================================
// AGE GROUP EXTRACTION
// ============================================================

// Regex patterns (matching the implementation)
const AGE_GROUP_U_PATTERN = /\bu[-\s]?(\d{1,2})\b/gi;
const AGE_GROUP_UNDER_PATTERN = /\bunder[-\s]?(\d{1,2})\b/gi;
const AGE_GROUP_PLURAL_PATTERN = /\b(?:the\s+)?(\d{1,2})s\b/gi;
const AGE_GROUP_SENIOR_PATTERN = /\b(?:senior|seniors|adult|adults)\b/i;

function extractAgeGroupsFromMessage(message: string): string[] {
  const ageGroups: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Pattern 1: "u" followed by number
  const uMatches = lowerMessage.matchAll(AGE_GROUP_U_PATTERN);
  for (const match of uMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 2: "under" followed by number
  const underMatches = lowerMessage.matchAll(AGE_GROUP_UNDER_PATTERN);
  for (const match of underMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 3: Plural forms
  const pluralMatches = lowerMessage.matchAll(AGE_GROUP_PLURAL_PATTERN);
  for (const match of pluralMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 4: Word numbers
  const wordNumbers: Record<string, string> = {
    sixes: "u6",
    sevens: "u7",
    eights: "u8",
    nines: "u9",
    tens: "u10",
    elevens: "u11",
    twelves: "u12",
    thirteens: "u13",
    fourteens: "u14",
    fifteens: "u15",
    sixteens: "u16",
    seventeens: "u17",
    eighteens: "u18",
    nineteens: "u19",
    twenties: "u20",
  };
  for (const [word, code] of Object.entries(wordNumbers)) {
    if (lowerMessage.includes(word)) {
      ageGroups.push(code);
    }
  }

  // Pattern 5: Senior/Adult
  if (AGE_GROUP_SENIOR_PATTERN.test(lowerMessage)) {
    ageGroups.push("senior");
  }

  return [...new Set(ageGroups)];
}

describe("Age Group Extraction", () => {
  describe("U-pattern (u12, u-12, u 12)", () => {
    it("should extract u12 from 'u12 training'", () => {
      expect(extractAgeGroupsFromMessage("u12 training went well")).toContain(
        "u12"
      );
    });

    it("should extract u14 from 'U14 session'", () => {
      expect(extractAgeGroupsFromMessage("U14 session was tough")).toContain(
        "u14"
      );
    });

    it("should extract u-12 format", () => {
      expect(extractAgeGroupsFromMessage("the u-12 team")).toContain("u12");
    });

    it("should extract multiple age groups", () => {
      const result = extractAgeGroupsFromMessage("u12 and u14 combined");
      expect(result).toContain("u12");
      expect(result).toContain("u14");
    });
  });

  describe("Under-pattern (under 12, under-12)", () => {
    it("should extract under 12", () => {
      expect(extractAgeGroupsFromMessage("under 12 practice")).toContain("u12");
    });

    it("should extract under-14", () => {
      expect(extractAgeGroupsFromMessage("the under-14 squad")).toContain(
        "u14"
      );
    });

    it("should handle Under with capital", () => {
      expect(extractAgeGroupsFromMessage("Under 16 game")).toContain("u16");
    });
  });

  describe("Plural-pattern (the 12s, 14s)", () => {
    it("should extract the 12s", () => {
      expect(extractAgeGroupsFromMessage("the 12s did great")).toContain("u12");
    });

    it("should extract 14s without 'the'", () => {
      expect(extractAgeGroupsFromMessage("14s training")).toContain("u14");
    });
  });

  describe("Word numbers (twelves, fourteens)", () => {
    it("should extract twelves", () => {
      expect(extractAgeGroupsFromMessage("the twelves played well")).toContain(
        "u12"
      );
    });

    it("should extract fourteens", () => {
      expect(extractAgeGroupsFromMessage("fourteens had a match")).toContain(
        "u14"
      );
    });

    it("should extract sixteens", () => {
      expect(
        extractAgeGroupsFromMessage("good work from the sixteens")
      ).toContain("u16");
    });
  });

  describe("Senior/Adult", () => {
    it("should extract senior", () => {
      expect(extractAgeGroupsFromMessage("senior team training")).toContain(
        "senior"
      );
    });

    it("should extract seniors plural", () => {
      expect(extractAgeGroupsFromMessage("the seniors played")).toContain(
        "senior"
      );
    });

    it("should extract adult", () => {
      expect(extractAgeGroupsFromMessage("adult session")).toContain("senior");
    });

    it("should extract adults plural", () => {
      expect(extractAgeGroupsFromMessage("adults training")).toContain(
        "senior"
      );
    });
  });

  describe("No match cases", () => {
    it("should return empty for no age groups", () => {
      expect(extractAgeGroupsFromMessage("great practice today")).toHaveLength(
        0
      );
    });

    it("should not match random numbers", () => {
      expect(extractAgeGroupsFromMessage("we scored 12 goals")).not.toContain(
        "u12"
      );
    });
  });
});

// ============================================================
// SPORT EXTRACTION
// ============================================================

const SPORT_PATTERNS: Array<{ patterns: RegExp[]; code: string }> = [
  { patterns: [/\bsoccer\b/i, /\bfootball\b/i, /\bfooty\b/i], code: "soccer" },
  {
    patterns: [/\bgaa\b/i, /\bgaelic\b/i, /\bgaelic football\b/i],
    code: "gaa_football",
  },
  { patterns: [/\bhurling\b/i, /\bhurl\b/i, /\bsliotar\b/i], code: "hurling" },
  { patterns: [/\bcamogie\b/i], code: "camogie" },
  { patterns: [/\brugby\b/i], code: "rugby" },
  { patterns: [/\bbasketball\b/i, /\bhoops\b/i], code: "basketball" },
  { patterns: [/\bhockey\b/i], code: "hockey" },
  { patterns: [/\btennis\b/i], code: "tennis" },
  { patterns: [/\bswimming\b/i, /\bswim\b/i], code: "swimming" },
  { patterns: [/\bathletics\b/i, /\btrack\b/i], code: "athletics" },
];

function extractSportsFromMessage(message: string): string[] {
  const sports: string[] = [];

  for (const { patterns, code } of SPORT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        sports.push(code);
        break;
      }
    }
  }

  return [...new Set(sports)];
}

describe("Sport Extraction", () => {
  describe("Soccer patterns", () => {
    it("should match soccer", () => {
      expect(extractSportsFromMessage("soccer practice")).toContain("soccer");
    });

    it("should match football", () => {
      expect(extractSportsFromMessage("football training")).toContain("soccer");
    });

    it("should match footy", () => {
      expect(extractSportsFromMessage("footy session")).toContain("soccer");
    });
  });

  describe("GAA patterns", () => {
    it("should match gaa", () => {
      expect(extractSportsFromMessage("gaa training")).toContain(
        "gaa_football"
      );
    });

    it("should match gaelic", () => {
      expect(extractSportsFromMessage("gaelic practice")).toContain(
        "gaa_football"
      );
    });

    it("should match gaelic football", () => {
      expect(extractSportsFromMessage("gaelic football match")).toContain(
        "gaa_football"
      );
    });
  });

  describe("Hurling patterns", () => {
    it("should match hurling", () => {
      expect(extractSportsFromMessage("hurling skills")).toContain("hurling");
    });

    it("should match hurl", () => {
      expect(extractSportsFromMessage("hurl practice")).toContain("hurling");
    });

    it("should match sliotar", () => {
      expect(extractSportsFromMessage("working on sliotar control")).toContain(
        "hurling"
      );
    });
  });

  describe("Other sports", () => {
    it("should match camogie", () => {
      expect(extractSportsFromMessage("camogie training")).toContain("camogie");
    });

    it("should match rugby", () => {
      expect(extractSportsFromMessage("rugby practice")).toContain("rugby");
    });

    it("should match basketball/hoops", () => {
      expect(extractSportsFromMessage("basketball game")).toContain(
        "basketball"
      );
      expect(extractSportsFromMessage("shooting hoops")).toContain(
        "basketball"
      );
    });

    it("should match hockey", () => {
      expect(extractSportsFromMessage("hockey match")).toContain("hockey");
    });

    it("should match tennis", () => {
      expect(extractSportsFromMessage("tennis practice")).toContain("tennis");
    });

    it("should match swimming/swim", () => {
      expect(extractSportsFromMessage("swimming session")).toContain(
        "swimming"
      );
      expect(extractSportsFromMessage("swim practice")).toContain("swimming");
    });

    it("should match athletics/track", () => {
      expect(extractSportsFromMessage("athletics training")).toContain(
        "athletics"
      );
      expect(extractSportsFromMessage("track practice")).toContain("athletics");
    });
  });

  describe("Multiple sports", () => {
    it("should extract multiple sports", () => {
      const result = extractSportsFromMessage("soccer and rugby training");
      expect(result).toContain("soccer");
      expect(result).toContain("rugby");
    });
  });

  describe("No match cases", () => {
    it("should return empty for no sport keywords", () => {
      expect(extractSportsFromMessage("great practice today")).toHaveLength(0);
    });
  });
});

// ============================================================
// ORG SELECTION PARSING
// ============================================================

const NUMERIC_SELECTION_PATTERN = /^(\d+)$/;

function parseOrgSelection(
  messageBody: string,
  availableOrgs: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  const body = messageBody.trim().toLowerCase();

  // Try numeric selection
  const numericMatch = body.match(NUMERIC_SELECTION_PATTERN);
  if (numericMatch) {
    const index = Number.parseInt(numericMatch[1], 10) - 1;
    if (index >= 0 && index < availableOrgs.length) {
      return availableOrgs[index];
    }
  }

  // Try org name match (fuzzy)
  for (const org of availableOrgs) {
    const orgNameLower = org.name.toLowerCase();
    if (
      body === orgNameLower ||
      body.includes(orgNameLower) ||
      orgNameLower.includes(body)
    ) {
      return org;
    }
  }

  return null;
}

describe("Org Selection Parsing", () => {
  const testOrgs = [
    { id: "org1", name: "Grange FC" },
    { id: "org2", name: "St. Mary's GAA" },
    { id: "org3", name: "Dublin Athletics Club" },
  ];

  describe("Numeric selection", () => {
    it("should select first org with '1'", () => {
      const result = parseOrgSelection("1", testOrgs);
      expect(result?.id).toBe("org1");
      expect(result?.name).toBe("Grange FC");
    });

    it("should select second org with '2'", () => {
      const result = parseOrgSelection("2", testOrgs);
      expect(result?.id).toBe("org2");
    });

    it("should select third org with '3'", () => {
      const result = parseOrgSelection("3", testOrgs);
      expect(result?.id).toBe("org3");
    });

    it("should return null for out of range number", () => {
      expect(parseOrgSelection("5", testOrgs)).toBeNull();
    });

    it("should return null for zero", () => {
      expect(parseOrgSelection("0", testOrgs)).toBeNull();
    });
  });

  describe("Name matching", () => {
    it("should match exact name (case insensitive)", () => {
      const result = parseOrgSelection("grange fc", testOrgs);
      expect(result?.id).toBe("org1");
    });

    it("should match partial name", () => {
      const result = parseOrgSelection("grange", testOrgs);
      expect(result?.id).toBe("org1");
    });

    it("should match with different case", () => {
      const result = parseOrgSelection("GRANGE", testOrgs);
      expect(result?.id).toBe("org1");
    });

    it("should match St. Mary's", () => {
      const result = parseOrgSelection("st. mary's", testOrgs);
      expect(result?.id).toBe("org2");
    });

    it("should match partial 'mary'", () => {
      const result = parseOrgSelection("mary", testOrgs);
      expect(result?.id).toBe("org2");
    });

    it("should return null for non-matching name", () => {
      expect(parseOrgSelection("unknown club", testOrgs)).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle whitespace", () => {
      const result = parseOrgSelection("  1  ", testOrgs);
      expect(result?.id).toBe("org1");
    });

    it("should handle mixed case with whitespace", () => {
      const result = parseOrgSelection("  GRANGE FC  ", testOrgs);
      expect(result?.id).toBe("org1");
    });
  });
});

// ============================================================
// SESSION TIMEOUT
// ============================================================

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

function isSessionExpired(lastMessageAt: number): boolean {
  return Date.now() - lastMessageAt > SESSION_TIMEOUT_MS;
}

describe("Session Timeout", () => {
  it("should not be expired if less than 2 hours ago", () => {
    const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;
    expect(isSessionExpired(oneHourAgo)).toBe(false);
  });

  it("should not be expired if exactly 1.99 hours ago", () => {
    const almostTwoHours = Date.now() - 1.99 * 60 * 60 * 1000;
    expect(isSessionExpired(almostTwoHours)).toBe(false);
  });

  it("should be expired if more than 2 hours ago", () => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(isSessionExpired(threeHoursAgo)).toBe(true);
  });

  it("should be expired if exactly 2.01 hours ago", () => {
    const justOverTwoHours = Date.now() - 2.01 * 60 * 60 * 1000;
    expect(isSessionExpired(justOverTwoHours)).toBe(true);
  });

  it("should not be expired for current time", () => {
    expect(isSessionExpired(Date.now())).toBe(false);
  });
});

// ============================================================
// PENDING MESSAGE EXPIRY
// ============================================================

const PENDING_MESSAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function isPendingMessageExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

function createExpiryTime(): number {
  return Date.now() + PENDING_MESSAGE_EXPIRY_MS;
}

describe("Pending Message Expiry", () => {
  it("should not be expired immediately after creation", () => {
    const expiresAt = createExpiryTime();
    expect(isPendingMessageExpired(expiresAt)).toBe(false);
  });

  it("should not be expired after 12 hours", () => {
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // Expires in 12 hours
    expect(isPendingMessageExpired(expiresAt)).toBe(false);
  });

  it("should be expired after 24 hours", () => {
    const expiresAt = Date.now() - 1000; // Expired 1 second ago
    expect(isPendingMessageExpired(expiresAt)).toBe(true);
  });

  it("should create expiry 24 hours in future", () => {
    const now = Date.now();
    const expiresAt = createExpiryTime();
    const diff = expiresAt - now;
    // Should be within 1 second of 24 hours
    expect(diff).toBeGreaterThan(PENDING_MESSAGE_EXPIRY_MS - 1000);
    expect(diff).toBeLessThanOrEqual(PENDING_MESSAGE_EXPIRY_MS);
  });
});

// ============================================================
// TRUST-BASED AUTO-APPLY CATEGORIZATION
// ============================================================

const SENSITIVE_CATEGORIES = ["injury", "behavior"];
const SAFE_CATEGORIES = [
  "skill_progress",
  "skill_rating",
  "performance",
  "attendance",
  "team_culture",
  "todo",
];

type Insight = {
  id: string;
  category: string;
  playerIdentityId?: string;
  teamId?: string;
  assigneeUserId?: string;
  status: string;
};

type AutoApplyDecision =
  | "auto_apply"
  | "needs_review_sensitive"
  | "needs_review_low_trust"
  | "needs_review_todo_no_assignee"
  | "needs_review_unknown_category"
  | "unmatched_player"
  | "unmatched_team"
  | "skip_already_processed";

function categorizeInsight(
  insight: Insight,
  trustLevel: number
): AutoApplyDecision {
  // Skip already processed
  if (insight.status !== "pending") {
    return "skip_already_processed";
  }

  const category = insight.category || "other";
  const isTeamInsight = category === "team_culture";

  // Check for unmatched
  if (!(isTeamInsight || insight.playerIdentityId)) {
    return "unmatched_player";
  }
  if (isTeamInsight && !insight.teamId) {
    return "unmatched_team";
  }

  // Sensitive categories always need review
  if (SENSITIVE_CATEGORIES.includes(category)) {
    return "needs_review_sensitive";
  }

  // Low trust needs review
  if (trustLevel < 2) {
    return "needs_review_low_trust";
  }

  // Safe categories can auto-apply at trust 2+
  if (SAFE_CATEGORIES.includes(category)) {
    // Special handling for TODOs
    if (category === "todo" && !insight.assigneeUserId) {
      return "needs_review_todo_no_assignee";
    }
    return "auto_apply";
  }

  return "needs_review_unknown_category";
}

describe("Trust-Based Auto-Apply Categorization", () => {
  describe("Skip already processed", () => {
    it("should skip applied insights", () => {
      const insight: Insight = {
        id: "1",
        category: "skill_progress",
        playerIdentityId: "player1",
        status: "applied",
      };
      expect(categorizeInsight(insight, 3)).toBe("skip_already_processed");
    });

    it("should skip dismissed insights", () => {
      const insight: Insight = {
        id: "1",
        category: "skill_progress",
        playerIdentityId: "player1",
        status: "dismissed",
      };
      expect(categorizeInsight(insight, 3)).toBe("skip_already_processed");
    });
  });

  describe("Unmatched handling", () => {
    it("should return unmatched_player for player insight without playerIdentityId", () => {
      const insight: Insight = {
        id: "1",
        category: "skill_progress",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("unmatched_player");
    });

    it("should return unmatched_team for team_culture without teamId", () => {
      const insight: Insight = {
        id: "1",
        category: "team_culture",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("unmatched_team");
    });

    it("should not require playerIdentityId for team_culture", () => {
      const insight: Insight = {
        id: "1",
        category: "team_culture",
        teamId: "team1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("auto_apply");
    });
  });

  describe("Sensitive categories", () => {
    it("should always need review for injury (even trust 3)", () => {
      const insight: Insight = {
        id: "1",
        category: "injury",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("needs_review_sensitive");
    });

    it("should always need review for behavior (even trust 3)", () => {
      const insight: Insight = {
        id: "1",
        category: "behavior",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("needs_review_sensitive");
    });
  });

  describe("Low trust (level 0-1)", () => {
    it("should need review at trust 0", () => {
      const insight: Insight = {
        id: "1",
        category: "skill_progress",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 0)).toBe("needs_review_low_trust");
    });

    it("should need review at trust 1", () => {
      const insight: Insight = {
        id: "1",
        category: "skill_rating",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 1)).toBe("needs_review_low_trust");
    });
  });

  describe("Trust level 2+ auto-apply", () => {
    const safeCategories = [
      "skill_progress",
      "skill_rating",
      "performance",
      "attendance",
    ];

    for (const category of safeCategories) {
      it(`should auto-apply ${category} at trust 2`, () => {
        const insight: Insight = {
          id: "1",
          category,
          playerIdentityId: "player1",
          status: "pending",
        };
        expect(categorizeInsight(insight, 2)).toBe("auto_apply");
      });

      it(`should auto-apply ${category} at trust 3`, () => {
        const insight: Insight = {
          id: "1",
          category,
          playerIdentityId: "player1",
          status: "pending",
        };
        expect(categorizeInsight(insight, 3)).toBe("auto_apply");
      });
    }
  });

  describe("TODO special handling", () => {
    it("should need review if TODO has no assignee", () => {
      const insight: Insight = {
        id: "1",
        category: "todo",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe(
        "needs_review_todo_no_assignee"
      );
    });

    it("should auto-apply TODO with assignee", () => {
      const insight: Insight = {
        id: "1",
        category: "todo",
        playerIdentityId: "player1",
        assigneeUserId: "user1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe("auto_apply");
    });
  });

  describe("Unknown categories", () => {
    it("should need review for unknown category", () => {
      const insight: Insight = {
        id: "1",
        category: "unknown_category",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe(
        "needs_review_unknown_category"
      );
    });

    it("should need review for empty category", () => {
      const insight: Insight = {
        id: "1",
        category: "",
        playerIdentityId: "player1",
        status: "pending",
      };
      expect(categorizeInsight(insight, 3)).toBe(
        "needs_review_unknown_category"
      );
    });
  });
});

// ============================================================
// SPORT MATCHING
// ============================================================

function matchesSport(detected: string, assigned: string): boolean {
  const normalizedDetected = detected.toLowerCase();
  const normalizedAssigned = assigned.toLowerCase();

  // Direct match
  if (normalizedDetected === normalizedAssigned) {
    return true;
  }

  // Handle aliases
  const aliases: Record<string, string[]> = {
    soccer: ["football", "soccer"],
    gaa_football: ["gaa", "gaelic", "gaelic_football"],
    hurling: ["hurling", "hurl"],
  };

  for (const [canonical, variants] of Object.entries(aliases)) {
    if (
      (normalizedAssigned === canonical ||
        variants.includes(normalizedAssigned)) &&
      (normalizedDetected === canonical ||
        variants.includes(normalizedDetected))
    ) {
      return true;
    }
  }

  return false;
}

describe("Sport Matching", () => {
  describe("Direct matches", () => {
    it("should match same sport", () => {
      expect(matchesSport("soccer", "soccer")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(matchesSport("SOCCER", "soccer")).toBe(true);
    });
  });

  describe("Soccer aliases", () => {
    it("should match soccer to football", () => {
      expect(matchesSport("soccer", "football")).toBe(true);
    });

    it("should match football to soccer", () => {
      expect(matchesSport("football", "soccer")).toBe(true);
    });
  });

  describe("GAA aliases", () => {
    it("should match gaa_football to gaa", () => {
      expect(matchesSport("gaa_football", "gaa")).toBe(true);
    });

    it("should match gaelic to gaa_football", () => {
      expect(matchesSport("gaelic", "gaa_football")).toBe(true);
    });
  });

  describe("No match cases", () => {
    it("should not match different sports", () => {
      expect(matchesSport("soccer", "rugby")).toBe(false);
    });

    it("should not match hurling to gaa", () => {
      expect(matchesSport("hurling", "gaa")).toBe(false);
    });
  });
});

// ============================================================
// MESSAGE TYPE DETECTION
// ============================================================

type MessageType = "text" | "audio" | "image" | "video" | "document";

function detectMessageType(
  numMedia: number,
  mediaContentType?: string
): MessageType {
  if (numMedia > 0 && mediaContentType) {
    if (mediaContentType.startsWith("audio/")) {
      return "audio";
    }
    if (mediaContentType.startsWith("image/")) {
      return "image";
    }
    if (mediaContentType.startsWith("video/")) {
      return "video";
    }
    return "document";
  }
  return "text";
}

describe("Message Type Detection", () => {
  it("should detect text message", () => {
    expect(detectMessageType(0, undefined)).toBe("text");
  });

  it("should detect audio message", () => {
    expect(detectMessageType(1, "audio/ogg")).toBe("audio");
    expect(detectMessageType(1, "audio/mpeg")).toBe("audio");
  });

  it("should detect image message", () => {
    expect(detectMessageType(1, "image/jpeg")).toBe("image");
    expect(detectMessageType(1, "image/png")).toBe("image");
  });

  it("should detect video message", () => {
    expect(detectMessageType(1, "video/mp4")).toBe("video");
  });

  it("should detect document for other types", () => {
    expect(detectMessageType(1, "application/pdf")).toBe("document");
  });
});

// ============================================================
// CATEGORY FORMATTING
// ============================================================

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    skill_progress: "Skill",
    skill_rating: "Rating",
    performance: "Performance",
    attendance: "Attendance",
    team_culture: "Team",
    todo: "Task",
    injury: "Injury",
    behavior: "Behavior",
  };
  return categoryMap[category] || category;
}

describe("Category Formatting", () => {
  it("should format skill_progress as Skill", () => {
    expect(formatCategory("skill_progress")).toBe("Skill");
  });

  it("should format skill_rating as Rating", () => {
    expect(formatCategory("skill_rating")).toBe("Rating");
  });

  it("should format todo as Task", () => {
    expect(formatCategory("todo")).toBe("Task");
  });

  it("should format team_culture as Team", () => {
    expect(formatCategory("team_culture")).toBe("Team");
  });

  it("should return unknown category as-is", () => {
    expect(formatCategory("unknown")).toBe("unknown");
  });
});
