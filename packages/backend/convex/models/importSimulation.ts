import type { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import type { DataModel } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { calculateAge } from "./playerIdentities";

// ============================================================
// IMPORT SIMULATION (DRY-RUN PREVIEW)
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const playerValidator = v.object({
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: genderValidator,
  ageGroup: v.string(),
  season: v.string(),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  parentFirstName: v.optional(v.string()),
  parentLastName: v.optional(v.string()),
  parentEmail: v.optional(v.string()),
  parentPhone: v.optional(v.string()),
});

type PlayerInput = {
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

type SimSummary = {
  playersToCreate: number;
  playersToUpdate: number;
  guardiansToCreate: number;
  guardiansToLink: number;
  enrollmentsToCreate: number;
  passportsToCreate: number;
  benchmarksToApply: number;
};

type PlayerPreview = {
  name: string;
  dateOfBirth: string;
  age: number;
  ageGroup: string;
  gender: string;
  action: "create" | "update";
  guardianName?: string;
  guardianAction?: "create" | "link";
};

type Db = GenericDatabaseReader<DataModel>;

function parsePlayerAge(
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

async function analyzeGuardian(
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

async function analyzeExistingPlayer(
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

function checkDuplicateInBatch(
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

function validatePlayerFields(player: PlayerInput): string | null {
  if (!(player.firstName.trim() && player.lastName.trim())) {
    return `Row with empty name: "${player.firstName} ${player.lastName}"`;
  }
  if (!player.dateOfBirth.trim()) {
    return `${player.firstName} ${player.lastName}: Missing date of birth`;
  }
  return null;
}

type PlayerAnalysis = {
  age: number;
  action: "create" | "update";
  newEnrollment: boolean;
  newPassport: boolean;
  guardian: { name: string; action: "create" | "link" } | null;
  warning: string | null;
};

async function analyzePlayer(
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

function accumulateResult(
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

export const simulate = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    players: v.array(playerValidator),
    applyBenchmarks: v.optional(v.boolean()),
    benchmarkStrategy: v.optional(v.string()),
  },
  returns: v.object({
    summary: v.object({
      playersToCreate: v.number(),
      playersToUpdate: v.number(),
      guardiansToCreate: v.number(),
      guardiansToLink: v.number(),
      enrollmentsToCreate: v.number(),
      passportsToCreate: v.number(),
      benchmarksToApply: v.number(),
    }),
    playerPreviews: v.array(
      v.object({
        name: v.string(),
        dateOfBirth: v.string(),
        age: v.number(),
        ageGroup: v.string(),
        gender: v.string(),
        action: v.union(v.literal("create"), v.literal("update")),
        guardianName: v.optional(v.string()),
        guardianAction: v.optional(
          v.union(v.literal("create"), v.literal("link"))
        ),
      })
    ),
    warnings: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const summary: SimSummary = {
      playersToCreate: 0,
      playersToUpdate: 0,
      guardiansToCreate: 0,
      guardiansToLink: 0,
      enrollmentsToCreate: 0,
      passportsToCreate: 0,
      benchmarksToApply: 0,
    };

    const playerPreviews: PlayerPreview[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const seenNames = new Map<string, number>();

    for (const player of args.players) {
      const fieldError = validatePlayerFields(player);
      if (fieldError) {
        errors.push(fieldError);
        continue;
      }

      const dupWarning = checkDuplicateInBatch(player, seenNames);
      if (dupWarning) {
        warnings.push(dupWarning);
      }

      const result = await analyzePlayer(
        ctx.db,
        player,
        args.organizationId,
        args.sportCode
      );

      if ("error" in result) {
        errors.push(result.error);
        continue;
      }

      accumulateResult(
        summary,
        result,
        !!(args.applyBenchmarks && args.sportCode)
      );
      if (result.warning) {
        warnings.push(result.warning);
      }

      if (playerPreviews.length < 5) {
        playerPreviews.push({
          name: `${player.firstName} ${player.lastName}`,
          dateOfBirth: player.dateOfBirth,
          age: result.age,
          ageGroup: player.ageGroup,
          gender: player.gender,
          action: result.action,
          guardianName: result.guardian?.name,
          guardianAction: result.guardian?.action,
        });
      }
    }

    return { summary, playerPreviews, warnings, errors };
  },
});
