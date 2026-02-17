import type { GenericDatabaseReader } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { calculateAge } from "../../models/playerIdentities";

// ============================================================
// Types
// ============================================================

export type Db = GenericDatabaseReader<DataModel>;

export type PlayerInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  ageGroup: string;
  season: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
};

export type SimSummary = {
  playersToCreate: number;
  playersToUpdate: number;
  guardiansToCreate: number;
  guardiansToLink: number;
  enrollmentsToCreate: number;
  passportsToCreate: number;
  benchmarksToApply: number;
};

export type PlayerPreview = {
  name: string;
  dateOfBirth: string;
  age: number;
  ageGroup: string;
  gender: string;
  action: "create" | "update";
  guardianName?: string;
  guardianAction?: "create" | "link";
};

export type PlayerAnalysis = {
  age: number;
  action: "create" | "update";
  newEnrollment: boolean;
  newPassport: boolean;
  guardian: { name: string; action: "create" | "link" } | null;
  warning: string | null;
};

// ============================================================
// Helper Functions
// ============================================================

export function parsePlayerAge(
  player: PlayerInput
): { age: number } | { error: string } {
  try {
    const age = calculateAge(player.dateOfBirth);
    if (Number.isNaN(age) || age < 0 || age > 120) {
      return {
        error: `${player.firstName} ${player.lastName}: Invalid date of birth "${player.dateOfBirth}"`,
      };
    }
    return { age };
  } catch {
    return {
      error: `${player.firstName} ${player.lastName}: Cannot parse date of birth "${player.dateOfBirth}"`,
    };
  }
}

export async function analyzeGuardian(
  db: Db,
  player: PlayerInput
): Promise<{ name: string; action: "create" | "link" } | null> {
  const hasInfo =
    player.parentFirstName &&
    player.parentLastName &&
    (player.parentEmail || player.parentPhone);

  if (!hasInfo) {
    return null;
  }

  const name = `${player.parentFirstName} ${player.parentLastName}`;
  const emailLower = player.parentEmail?.toLowerCase().trim();

  if (emailLower) {
    const existing = await db
      .query("guardianIdentities")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (existing) {
      return { name, action: "link" };
    }
  }

  return { name, action: "create" };
}

export async function analyzeExistingPlayer(
  db: Db,
  existingPlayerId: string,
  organizationId: string,
  sportCode: string | undefined
): Promise<{ newEnrollment: boolean; newPassport: boolean }> {
  const enrollment = await db
    .query("orgPlayerEnrollments")
    .withIndex("by_player_and_org", (q) =>
      q
        .eq("playerIdentityId", existingPlayerId as never)
        .eq("organizationId", organizationId)
    )
    .first();

  let newPassport = false;
  if (sportCode) {
    const passport = await db
      .query("sportPassports")
      .withIndex("by_player_and_sport", (q) =>
        q
          .eq("playerIdentityId", existingPlayerId as never)
          .eq("sportCode", sportCode)
      )
      .first();
    newPassport = !passport;
  }

  return { newEnrollment: !enrollment, newPassport };
}

export function checkDuplicateInBatch(
  player: PlayerInput,
  seenNames: Map<string, number>
): string | null {
  const nameKey = `${player.firstName.trim().toLowerCase()}|${player.lastName.trim().toLowerCase()}|${player.dateOfBirth}`;
  const prevCount = seenNames.get(nameKey) ?? 0;
  seenNames.set(nameKey, prevCount + 1);
  if (prevCount > 0) {
    return `${player.firstName} ${player.lastName} (DOB: ${player.dateOfBirth}) appears ${prevCount + 1} times in the import`;
  }
  return null;
}

export function validatePlayerFields(player: PlayerInput): string | null {
  if (!(player.firstName.trim() && player.lastName.trim())) {
    return `Row with empty name: "${player.firstName} ${player.lastName}"`;
  }
  if (!player.dateOfBirth.trim()) {
    return `${player.firstName} ${player.lastName}: Missing date of birth`;
  }
  return null;
}

export async function analyzePlayer(
  db: Db,
  player: PlayerInput,
  organizationId: string,
  sportCode: string | undefined
): Promise<PlayerAnalysis | { error: string }> {
  const ageResult = parsePlayerAge(player);
  if ("error" in ageResult) {
    return ageResult;
  }
  const { age } = ageResult;

  const existingPlayer = await db
    .query("playerIdentities")
    .withIndex("by_name_dob", (q) =>
      q
        .eq("firstName", player.firstName.trim())
        .eq("lastName", player.lastName.trim())
        .eq("dateOfBirth", player.dateOfBirth)
    )
    .first();

  let newEnrollment: boolean;
  let newPassport: boolean;
  const action: "create" | "update" = existingPlayer ? "update" : "create";

  if (existingPlayer) {
    const ep = await analyzeExistingPlayer(
      db,
      existingPlayer._id,
      organizationId,
      sportCode
    );
    newEnrollment = ep.newEnrollment;
    newPassport = ep.newPassport;
  } else {
    newEnrollment = true;
    newPassport = !!sportCode;
  }

  const guardian = await analyzeGuardian(db, player);

  const warning =
    age >= 18 && player.ageGroup.toLowerCase().startsWith("u")
      ? `${player.firstName} ${player.lastName}: Adult (age ${age}) assigned to youth age group "${player.ageGroup}"`
      : null;

  return { age, action, newEnrollment, newPassport, guardian, warning };
}

export function accumulateResult(
  summary: SimSummary,
  result: PlayerAnalysis,
  applyBenchmarks: boolean
) {
  if (result.action === "update") {
    summary.playersToUpdate += 1;
  } else {
    summary.playersToCreate += 1;
  }
  if (result.newEnrollment) {
    summary.enrollmentsToCreate += 1;
  }
  if (result.newPassport) {
    summary.passportsToCreate += 1;
  }
  if (result.guardian) {
    if (result.guardian.action === "link") {
      summary.guardiansToLink += 1;
    } else {
      summary.guardiansToCreate += 1;
    }
  }
  if (applyBenchmarks) {
    summary.benchmarksToApply += 1;
  }
}
