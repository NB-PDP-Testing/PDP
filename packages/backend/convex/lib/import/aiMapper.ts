/**
 * AI-powered column mapping prompt engineering
 * Builds prompts for Claude API to suggest CSV column mappings
 */

// Available target fields for PlayerARC imports
const AVAILABLE_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "email",
  "phone",
  "address.street1",
  "address.city",
  "address.county",
  "address.postcode",
  "address.country",
  "gender",
  "guardianFirstName",
  "guardianLastName",
  "guardianEmail",
  "guardianPhone",
] as const;

/**
 * Build a prompt for Claude API to map a CSV column to a PlayerARC field
 *
 * @param columnName - The original CSV column name
 * @param sampleValues - 3-5 sample values from the column
 * @param availableFields - Optional override for available fields (defaults to AVAILABLE_FIELDS)
 * @returns Formatted prompt for Claude API
 */
export function buildMappingPrompt(
  columnName: string,
  sampleValues: string[],
  availableFields: readonly string[] = AVAILABLE_FIELDS
): string {
  // Validate inputs
  if (!columnName || columnName.trim().length === 0) {
    throw new Error("columnName is required and cannot be empty");
  }

  if (!sampleValues || sampleValues.length === 0) {
    throw new Error("sampleValues is required and cannot be empty");
  }

  // Build the prompt
  const prompt = `You are a data mapping expert for a sports player management system.

**Task**: Map the CSV column to the most appropriate target field based on the column name and sample values.

**Available Target Fields**:
${availableFields.map((field) => `  - ${field}`).join("\n")}

**CSV Column Name**: ${columnName}

**Sample Values**:
${sampleValues.map((value, idx) => `  ${idx + 1}. "${value}"`).join("\n")}

**Instructions**:
1. Analyze the column name and sample values
2. Choose the most appropriate target field from the available fields list
3. If no field is a good match, return targetField as null
4. Be conservative with confidence scores - only use high confidence (80%+) if you're certain
5. Provide a brief 1-sentence explanation for your choice

**Response Format** (return ONLY valid JSON):
{
  "targetField": "<field_name_or_null>",
  "confidence": <number_0_to_100>,
  "reasoning": "<brief_explanation>"
}

**Examples**:

Example 1 - High Confidence:
Column: "Player First Name"
Samples: ["John", "Sarah", "Michael"]
Response:
{
  "targetField": "firstName",
  "confidence": 95,
  "reasoning": "Column name explicitly indicates first name, samples are typical first names."
}

Example 2 - Medium Confidence:
Column: "Contact"
Samples: ["john@example.com", "555-1234", "sarah@test.com"]
Response:
{
  "targetField": "email",
  "confidence": 60,
  "reasoning": "Mixed contact data, but most samples appear to be email addresses."
}

Example 3 - Low Confidence (No Match):
Column: "Jersey Number"
Samples: ["10", "7", "23"]
Response:
{
  "targetField": null,
  "confidence": 0,
  "reasoning": "Jersey numbers don't match any available fields in the system."
}

**Constraints**:
- Only use field names from the Available Target Fields list
- Return null for targetField if unsure or no good match exists
- Be conservative with confidence scores to avoid false positives
- Keep reasoning concise (1 sentence max)

Now analyze the CSV column and provide your mapping suggestion.`;

  return prompt;
}

/**
 * Get the list of available target fields
 */
export function getAvailableFields(): readonly string[] {
  return AVAILABLE_FIELDS;
}

/**
 * Normalize a column name for caching and comparison
 * Converts to lowercase, trims whitespace, removes special characters
 *
 * @param columnName - Original column name
 * @returns Normalized column name
 */
export function normalizeColumnName(columnName: string): string {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ""); // Remove special chars
}
