/**
 * Field Mapper - Smart field mapping engine for the import framework.
 *
 * Provides 5 matching strategies (exact, alias, historical, fuzzy, content analysis)
 * to automatically map source CSV columns to target import fields.
 *
 * No npm dependencies (Convex runtime restriction).
 */

// ============================================================
// Types
// ============================================================

export type MappingSuggestion = {
  sourceColumn: string;
  targetField: string;
  confidence: number; // 0-100
  strategy: "exact" | "alias" | "historical" | "fuzzy" | "content_analysis";
};

export type FieldDefinition = {
  name: string; // Target field name (e.g., "firstName")
  label: string; // Display label (e.g., "First Name")
  required: boolean;
};

// ============================================================
// Normalization
// ============================================================

const NON_ALNUM_REGEX = /[^a-z0-9]/g;

/**
 * Normalize a column name for comparison: lowercase, trim, remove special chars.
 */
export function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(NON_ALNUM_REGEX, "");
}

// ============================================================
// Field Alias Database
// ============================================================

/**
 * Comprehensive alias database mapping target fields to known source column names.
 * Covers 20+ fields including multi-guardian address fields from Phase 1 PRD.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  // Player identity
  firstName: [
    "forename",
    "first name",
    "fname",
    "given name",
    "christian name",
    "first",
    "player first name",
    "player forename",
  ],
  lastName: [
    "surname",
    "last name",
    "lname",
    "family name",
    "last",
    "player surname",
    "player last name",
  ],
  dateOfBirth: [
    "dob",
    "birth date",
    "birthdate",
    "date of birth",
    "birthday",
    "d.o.b.",
    "d.o.b",
    "born",
    "birth_date",
  ],
  gender: ["sex", "m/f", "male/female", "player gender"],
  email: ["e-mail", "email address", "contact email", "player email"],
  phone: [
    "mobile",
    "cell",
    "telephone",
    "contact number",
    "phone number",
    "mobile number",
    "cell phone",
    "tel",
    "mobile no",
    "phone no",
  ],

  // Player address
  playerAddress: [
    "address",
    "player address",
    "child address",
    "home address",
    "address1",
    "street",
    "street address",
  ],
  playerTown: ["town", "city", "player town", "player city", "locality"],
  playerPostcode: [
    "postcode",
    "player postcode",
    "eircode",
    "child postcode",
    "zip",
    "zip code",
    "postal code",
  ],
  country: ["country", "nation", "player country"],

  // Age group / membership
  ageGroup: [
    "age group",
    "agegroup",
    "age_group",
    "grade",
    "division",
    "level",
    "team age group",
  ],
  membershipType: [
    "membership type",
    "membership",
    "member type",
    "type",
    "category",
  ],
  season: ["season", "year", "registration year", "playing season"],
  team: ["team", "team name", "squad", "group"],

  // Guardian 1
  parentFirstName: [
    "parent first name",
    "guardian first name",
    "parent forename",
    "guardian forename",
    "mother first name",
    "father first name",
    "parent1 first name",
  ],
  parentLastName: [
    "parent surname",
    "parent last name",
    "guardian surname",
    "guardian last name",
    "mother surname",
    "father surname",
    "parent1 surname",
    "parent1 last name",
  ],
  parentEmail: [
    "parent email",
    "guardian email",
    "parent e-mail",
    "guardian e-mail",
    "mother email",
    "father email",
    "parent1 email",
    "contact email",
  ],
  parentPhone: [
    "parent phone",
    "guardian phone",
    "parent mobile",
    "guardian mobile",
    "mother phone",
    "father phone",
    "parent1 phone",
    "parent1 mobile",
    "emergency contact",
  ],
  guardian1Address: [
    "parent address",
    "guardian address",
    "mother address",
    "father address",
    "parent1 address",
  ],
  guardian1Town: [
    "parent town",
    "guardian town",
    "parent city",
    "guardian city",
    "parent1 town",
  ],
  guardian1Postcode: [
    "parent postcode",
    "guardian postcode",
    "mother postcode",
    "father postcode",
    "parent1 postcode",
    "parent eircode",
  ],

  // Guardian 2
  parent2FirstName: [
    "parent2 first name",
    "guardian2 first name",
    "second parent first name",
    "parent 2 first name",
  ],
  parent2LastName: [
    "parent2 surname",
    "guardian2 surname",
    "second parent surname",
    "parent 2 surname",
    "parent2 last name",
    "parent 2 last name",
  ],
  parent2Email: [
    "parent2 email",
    "guardian2 email",
    "second parent email",
    "parent 2 email",
  ],
  parent2Phone: [
    "parent2 phone",
    "guardian2 phone",
    "second parent phone",
    "parent 2 phone",
    "parent2 mobile",
  ],
  guardian2Address: [
    "parent2 address",
    "guardian2 address",
    "second parent address",
    "parent 2 address",
  ],
  guardian2Town: [
    "parent2 town",
    "guardian2 town",
    "second parent town",
    "parent 2 town",
  ],
  guardian2Postcode: [
    "parent2 postcode",
    "guardian2 postcode",
    "second parent postcode",
    "parent 2 postcode",
  ],

  // Player status flags
  isPlayer: [
    "is player",
    "player",
    "playing member",
    "playing",
    "active player",
  ],

  // Medical
  medicalNotes: ["medical notes", "medical", "health notes", "medical info"],
  allergies: ["allergies", "allergy", "food allergies"],
};

/**
 * Get all known aliases for a given target field.
 */
export function getFieldAliases(fieldName: string): string[] {
  return FIELD_ALIASES[fieldName] ?? [];
}

/**
 * Get all target fields with their aliases.
 */
export function getAllFieldAliases(): Record<string, string[]> {
  return FIELD_ALIASES;
}

// ============================================================
// Exact Match
// ============================================================

/**
 * Exact match: compares normalized column name against normalized target field name.
 * Returns 100% confidence on match.
 */
export function exactMatch(
  sourceColumn: string,
  targetFields: FieldDefinition[]
): MappingSuggestion | null {
  const normalizedSource = normalizeColumnName(sourceColumn);

  for (const field of targetFields) {
    if (normalizeColumnName(field.name) === normalizedSource) {
      return {
        sourceColumn,
        targetField: field.name,
        confidence: 100,
        strategy: "exact",
      };
    }
  }
  return null;
}

// ============================================================
// Alias Match
// ============================================================

/**
 * Alias match: checks source column against the alias database.
 * Returns 95% confidence on match.
 */
export function aliasMatch(
  sourceColumn: string,
  targetFields: FieldDefinition[]
): MappingSuggestion | null {
  const normalizedSource = normalizeColumnName(sourceColumn);
  const lowerSource = sourceColumn.toLowerCase().trim();

  for (const field of targetFields) {
    const aliases = FIELD_ALIASES[field.name];
    if (!aliases) {
      continue;
    }

    for (const alias of aliases) {
      if (
        normalizeColumnName(alias) === normalizedSource ||
        alias.toLowerCase() === lowerSource
      ) {
        return {
          sourceColumn,
          targetField: field.name,
          confidence: 95,
          strategy: "alias",
        };
      }
    }
  }
  return null;
}

// ============================================================
// Default Target Fields
// ============================================================

/**
 * Standard target fields for player import.
 */
export const DEFAULT_TARGET_FIELDS: FieldDefinition[] = [
  { name: "firstName", label: "First Name", required: true },
  { name: "lastName", label: "Last Name", required: true },
  { name: "dateOfBirth", label: "Date of Birth", required: true },
  { name: "gender", label: "Gender", required: true },
  { name: "email", label: "Email", required: false },
  { name: "phone", label: "Phone", required: false },
  { name: "playerAddress", label: "Player Address", required: false },
  { name: "playerTown", label: "Player Town", required: false },
  { name: "playerPostcode", label: "Player Postcode", required: false },
  { name: "country", label: "Country", required: false },
  { name: "ageGroup", label: "Age Group", required: false },
  { name: "membershipType", label: "Membership Type", required: false },
  { name: "season", label: "Season", required: false },
  { name: "team", label: "Team", required: false },
  { name: "parentFirstName", label: "Parent First Name", required: false },
  { name: "parentLastName", label: "Parent Last Name", required: false },
  { name: "parentEmail", label: "Parent Email", required: false },
  { name: "parentPhone", label: "Parent Phone", required: false },
  { name: "guardian1Address", label: "Guardian 1 Address", required: false },
  { name: "guardian1Town", label: "Guardian 1 Town", required: false },
  { name: "guardian1Postcode", label: "Guardian 1 Postcode", required: false },
  {
    name: "parent2FirstName",
    label: "Parent 2 First Name",
    required: false,
  },
  { name: "parent2LastName", label: "Parent 2 Last Name", required: false },
  { name: "parent2Email", label: "Parent 2 Email", required: false },
  { name: "parent2Phone", label: "Parent 2 Phone", required: false },
  { name: "guardian2Address", label: "Guardian 2 Address", required: false },
  { name: "guardian2Town", label: "Guardian 2 Town", required: false },
  { name: "guardian2Postcode", label: "Guardian 2 Postcode", required: false },
  { name: "isPlayer", label: "Is Player", required: false },
  { name: "medicalNotes", label: "Medical Notes", required: false },
  { name: "allergies", label: "Allergies", required: false },
];

// ============================================================
// Simple suggest (exact + alias only - no ctx needed)
// ============================================================

/**
 * Run exact and alias matching for a set of source columns.
 * This is a pure function (no database access).
 */
export function suggestMappingsSimple(
  sourceColumns: string[],
  targetFields?: FieldDefinition[]
): MappingSuggestion[] {
  const fields = targetFields ?? DEFAULT_TARGET_FIELDS;
  const suggestions: MappingSuggestion[] = [];
  const usedTargets = new Set<string>();

  for (const column of sourceColumns) {
    // Try exact match first
    const exact = exactMatch(column, fields);
    if (exact && !usedTargets.has(exact.targetField)) {
      suggestions.push(exact);
      usedTargets.add(exact.targetField);
      continue;
    }

    // Try alias match
    const alias = aliasMatch(column, fields);
    if (alias && !usedTargets.has(alias.targetField)) {
      suggestions.push(alias);
      usedTargets.add(alias.targetField);
    }
  }

  return suggestions;
}
