/**
 * CSV Parser - Dependency-free CSV/text parsing engine for the import framework.
 *
 * Handles: quoted fields, multi-line cells, delimiter detection, header row detection.
 * No npm dependencies (Convex runtime restriction).
 */

// ============================================================
// Types
// ============================================================

export type ParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  detectedDelimiter: string;
};

export type CSVParseOptions = {
  delimiter?: string;
  headerRow?: number; // 0-based index of header row
  trimValues?: boolean;
};

// ============================================================
// Top-level regex constants
// ============================================================

const NUMBER_REGEX = /^\d+(\.\d+)?$/;
const DATE_REGEX = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;
const LETTER_REGEX = /[a-zA-Z]/;

// ============================================================
// Delimiter Detection
// ============================================================

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

/**
 * Auto-detect the delimiter used in CSV content by counting occurrences
 * in the first few lines and choosing the most consistent one.
 */
export function detectDelimiter(text: string): string {
  const sampleLines = text.split("\n").slice(0, 10);
  if (sampleLines.length === 0) {
    return ",";
  }

  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = sampleLines.map((line) => countUnquoted(line, delimiter));
    if (counts.every((c) => c === 0)) {
      continue;
    }

    const nonEmptyCounts = counts.filter((c) => c > 0);
    if (nonEmptyCounts.length === 0) {
      continue;
    }

    const avg =
      nonEmptyCounts.reduce((a, b) => a + b, 0) / nonEmptyCounts.length;
    const variance =
      nonEmptyCounts.reduce((sum, c) => sum + (c - avg) ** 2, 0) /
      nonEmptyCounts.length;
    const score = avg * nonEmptyCounts.length - variance;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Count occurrences of a character outside quoted sections.
 */
function countUnquoted(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === char && !inQuotes) {
      count += 1;
    }
  }
  return count;
}

// ============================================================
// Header Row Detection
// ============================================================

function isHeaderLikeValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  if (NUMBER_REGEX.test(trimmed)) {
    return false;
  }
  if (DATE_REGEX.test(trimmed)) {
    return false;
  }
  return LETTER_REGEX.test(trimmed);
}

/**
 * Detect the header row using heuristic: first row where >50% of values
 * look like column names (non-numeric, non-empty strings).
 * Returns 0-based row index.
 */
export function detectHeaderRow(rawRows: string[][]): number {
  for (let i = 0; i < Math.min(rawRows.length, 5); i += 1) {
    const row = rawRows[i];
    if (row.length === 0) {
      continue;
    }

    const nonEmpty = row.filter((v) => v.trim() !== "");
    if (nonEmpty.length === 0) {
      continue;
    }

    const stringLikeCount = nonEmpty.filter(isHeaderLikeValue).length;

    if (stringLikeCount / nonEmpty.length > 0.5) {
      return i;
    }
  }
  return 0;
}

// ============================================================
// CSV Line Parser - split into helpers to reduce complexity
// ============================================================

type ParserState = {
  rows: string[][];
  currentRow: string[];
  currentField: string;
  inQuotes: boolean;
  pos: number;
};

function handleQuotedChar(state: ParserState, text: string): void {
  const char = text[state.pos];
  if (char === '"') {
    // Check for escaped quote ("")
    if (state.pos + 1 < text.length && text[state.pos + 1] === '"') {
      state.currentField += '"';
      state.pos += 2;
      return;
    }
    state.inQuotes = false;
    state.pos += 1;
    return;
  }
  // Inside quotes: include everything (including newlines)
  state.currentField += char;
  state.pos += 1;
}

function handleNewline(state: ParserState): void {
  state.currentRow.push(state.currentField);
  state.currentField = "";
  state.rows.push(state.currentRow);
  state.currentRow = [];
}

function handleUnquotedChar(
  state: ParserState,
  text: string,
  delimiter: string
): void {
  const char = text[state.pos];

  if (char === '"') {
    state.inQuotes = true;
    state.pos += 1;
    return;
  }

  if (char === delimiter) {
    state.currentRow.push(state.currentField);
    state.currentField = "";
    state.pos += 1;
    return;
  }

  if (char === "\r") {
    if (state.pos + 1 < text.length && text[state.pos + 1] === "\n") {
      state.pos += 1;
    }
    handleNewline(state);
    state.pos += 1;
    return;
  }

  if (char === "\n") {
    handleNewline(state);
    state.pos += 1;
    return;
  }

  state.currentField += char;
  state.pos += 1;
}

/**
 * Parse CSV text into raw 2D array, handling:
 * - Quoted fields with embedded delimiters
 * - Multi-line cells within quotes
 * - Escaped quotes (doubled "")
 */
function parseToRawRows(text: string, delimiter: string): string[][] {
  const state: ParserState = {
    rows: [],
    currentRow: [],
    currentField: "",
    inQuotes: false,
    pos: 0,
  };

  while (state.pos < text.length) {
    if (state.inQuotes) {
      handleQuotedChar(state, text);
    } else {
      handleUnquotedChar(state, text, delimiter);
    }
  }

  // Don't forget the last field/row
  if (state.currentField !== "" || state.currentRow.length > 0) {
    state.currentRow.push(state.currentField);
    state.rows.push(state.currentRow);
  }

  return state.rows;
}

// ============================================================
// Main Parse Function
// ============================================================

const EMPTY_RESULT: ParseResult = {
  headers: [],
  rows: [],
  totalRows: 0,
  detectedDelimiter: ",",
};

/**
 * Convert raw 2D rows into Record<string, string>[] using headers.
 */
function buildRecords(
  dataRows: string[][],
  headers: string[],
  trimValues: boolean
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (const rawRow of dataRows) {
    if (rawRow.every((cell) => cell.trim() === "")) {
      continue;
    }

    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j += 1) {
      const header = headers[j];
      if (!header) {
        continue;
      }
      const value = j < rawRow.length ? rawRow[j] : "";
      record[header] = trimValues ? value.trim() : value;
    }
    rows.push(record);
  }
  return rows;
}

/**
 * Parse CSV text into structured data.
 *
 * Features:
 * - Auto-detects delimiter (comma, semicolon, tab, pipe)
 * - Auto-detects header row
 * - Handles quoted fields with embedded commas/newlines
 * - Handles escaped quotes ("")
 * - Trims whitespace from values
 * - Skips empty rows
 */
export function parseCSV(text: string, options?: CSVParseOptions): ParseResult {
  if (!text || text.trim().length === 0) {
    return EMPTY_RESULT;
  }

  const delimiter = options?.delimiter ?? detectDelimiter(text);
  const trimValues = options?.trimValues ?? true;

  const rawRows = parseToRawRows(text, delimiter);

  const nonEmptyRows = rawRows.filter((row) =>
    row.some((cell) => cell.trim() !== "")
  );

  if (nonEmptyRows.length === 0) {
    return { ...EMPTY_RESULT, detectedDelimiter: delimiter };
  }

  const headerRowIndex = options?.headerRow ?? detectHeaderRow(nonEmptyRows);

  const headers = nonEmptyRows[headerRowIndex].map((h) =>
    trimValues ? h.trim() : h
  );

  const dataRows = nonEmptyRows.slice(headerRowIndex + 1);
  const rows = buildRecords(dataRows, headers, trimValues);

  return {
    headers,
    rows,
    totalRows: rows.length,
    detectedDelimiter: delimiter,
  };
}
