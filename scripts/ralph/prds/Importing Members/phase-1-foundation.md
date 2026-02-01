# Phase 1: Foundation & Multi-Sport Support

**Timeline**: Weeks 1-4
**Status**: Ready for Implementation
**Dependencies**: None

---

## Objectives

1. Abstract GAA-specific logic to configurable components
2. Enable import for any sport with configurable age groups/skills
3. Build database foundation for templates, sessions, mapping history
4. **Preserve per-player selection** from GAA import
5. **Add benchmark selection** during import wizard
6. Maintain 100% backward compatibility with existing GAA import

---

## Success Criteria

- [ ] Import wizard works for GAA Football (100% backward compatible)
- [ ] Per-player selection works (checkbox per player, search, bulk actions)
- [ ] Benchmark configuration step allows strategy selection
- [ ] Benchmarks applied correctly based on strategy (blank/middle/age-appropriate/NGB/custom)
- [ ] Import wizard works for Soccer with custom template
- [ ] Import wizard works for Rugby with custom template
- [ ] 80%+ columns auto-mapped for known templates
- [ ] Template selection UI functional
- [ ] Import session tracks selected players and benchmark settings
- [ ] Historical mapping learning captures corrections
- [ ] Zero regression in existing GAA import functionality

---

## Database Schema Changes

### New Tables

#### 1. `importTemplates`

Sport-specific or organization-specific import configurations.

```typescript
defineTable({
  name: v.string(),                    // "GAA Foireann Export"
  description: v.optional(v.string()),
  sportCode: v.optional(v.string()),   // null = works for all sports
  sourceType: v.union(v.literal("csv"), v.literal("excel"), v.literal("paste")),
  scope: v.union(v.literal("platform"), v.literal("organization")),
  organizationId: v.optional(v.string()),

  // Column mappings
  columnMappings: v.array(v.object({
    sourcePattern: v.string(),         // "Forename" or "/first.*name/i"
    targetField: v.string(),           // "firstName"
    required: v.boolean(),
    transform: v.optional(v.string()), // "toUpperCase", "parseDate"
    aliases: v.optional(v.array(v.string())),
  })),

  // Age group mappings
  ageGroupMappings: v.optional(v.array(v.object({
    sourceValue: v.string(),           // "JUVENILE", "U12"
    targetAgeGroup: v.string(),        // "u12"
  }))),

  // Skill/benchmark initialization
  skillInitialization: v.object({
    strategy: v.union(
      v.literal("blank"),              // All 1s
      v.literal("middle"),             // All 3s
      v.literal("age-appropriate"),    // Age group standards
      v.literal("ngb-benchmarks"),     // NGB benchmark data
      v.literal("custom")              // Custom template
    ),
    customBenchmarkTemplateId: v.optional(v.id("benchmarkTemplates")),
    applyToPassportStatus: v.optional(v.array(v.string())),
  }),

  // Default behaviors
  defaults: v.object({
    createTeams: v.boolean(),
    createPassports: v.boolean(),
    season: v.optional(v.string()),
  }),

  isActive: v.boolean(),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_scope", ["scope"])
  .index("by_sportCode", ["sportCode"])
  .index("by_organizationId", ["organizationId"])
  .index("by_scope_and_sport", ["scope", "sportCode"])
```

#### 2. `importSessions`

Tracks each import execution with full audit trail.

```typescript
defineTable({
  organizationId: v.string(),
  templateId: v.optional(v.id("importTemplates")),
  initiatedBy: v.string(),

  status: v.union(
    v.literal("uploading"),
    v.literal("mapping"),
    v.literal("selecting"),    // NEW: per-player selection
    v.literal("reviewing"),
    v.literal("importing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")
  ),

  sourceInfo: v.object({
    type: v.union(v.literal("file"), v.literal("paste"), v.literal("api")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    rowCount: v.number(),
    columnCount: v.number(),
  }),

  // Column mappings
  mappings: v.record(v.string(), v.string()),

  // Per-player selection
  playerSelections: v.array(v.object({
    rowIndex: v.number(),
    selected: v.boolean(),
    reason: v.optional(v.string()),
  })),

  // Benchmark settings
  benchmarkSettings: v.optional(v.object({
    applyBenchmarks: v.boolean(),
    strategy: v.string(),
    customTemplateId: v.optional(v.id("benchmarkTemplates")),
    passportStatuses: v.array(v.string()),
  })),

  // Statistics
  stats: v.object({
    totalRows: v.number(),
    selectedRows: v.number(),
    validRows: v.number(),
    errorRows: v.number(),
    duplicateRows: v.number(),
    playersCreated: v.number(),
    playersUpdated: v.number(),
    playersSkipped: v.number(),
    guardiansCreated: v.number(),
    guardiansLinked: v.number(),
    teamsCreated: v.number(),
    passportsCreated: v.number(),
    benchmarksApplied: v.number(),
  }),

  errors: v.array(v.object({
    rowNumber: v.number(),
    field: v.string(),
    error: v.string(),
    value: v.optional(v.string()),
    resolved: v.boolean(),
  })),

  duplicates: v.array(v.object({
    rowNumber: v.number(),
    existingPlayerId: v.id("playerIdentities"),
    resolution: v.union(v.literal("skip"), v.literal("merge"), v.literal("replace")),
  })),

  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organizationId", ["organizationId"])
  .index("by_status", ["status"])
  .index("by_initiatedBy", ["initiatedBy"])
  .index("by_startedAt", ["startedAt"])
  .index("by_org_and_status", ["organizationId", "status"])
```

#### 3. `importMappingHistory`

Learns from past imports to improve auto-mapping.

```typescript
defineTable({
  organizationId: v.optional(v.string()),
  templateId: v.optional(v.id("importTemplates")),

  sourceColumnName: v.string(),
  normalizedColumnName: v.string(),
  targetField: v.string(),

  usageCount: v.number(),
  lastUsedAt: v.number(),
  confidence: v.number(),              // 0-100

  createdAt: v.number(),
})
  .index("by_normalizedColumnName", ["normalizedColumnName"])
  .index("by_organizationId", ["organizationId"])
  .index("by_templateId", ["templateId"])
  .index("by_targetField", ["targetField"])
```

#### 4. `benchmarkTemplates`

Custom benchmark configurations per sport/organization.

```typescript
defineTable({
  name: v.string(),
  sportCode: v.string(),
  scope: v.union(v.literal("platform"), v.literal("organization")),
  organizationId: v.optional(v.string()),

  benchmarks: v.array(v.object({
    skillCode: v.string(),
    ageGroup: v.string(),
    expectedRating: v.number(),        // 1-5 scale
    minAcceptable: v.optional(v.number()),
    description: v.optional(v.string()),
  })),

  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_scope", ["scope"])
  .index("by_organizationId", ["organizationId"])
```

### Modifications to Existing Tables

**Add to `playerIdentities`:**
```typescript
{
  importSessionId: v.optional(v.id("importSessions")),
  externalIds: v.optional(v.record(v.string(), v.string())), // {"foireann": "12345"}
}
```

**Add to `orgPlayerEnrollments`:**
```typescript
{
  importSessionId: v.optional(v.id("importSessions")),
  lastSyncedAt: v.optional(v.number()),
  syncSource: v.optional(v.string()),  // "foireann", "manual"
}
```

---

## Backend Implementation

### Files to Create

#### 1. `/packages/backend/convex/lib/import/parser.ts` (~200 lines)

CSV/Excel parsing engine with multi-format support.

**Dependencies**: `papaparse`, `xlsx`, `iconv-lite`, `file-type`

**Key Functions**:
```typescript
export function parseCSV(text: string, options?: CSVParseOptions): ParseResult
export function parseExcel(buffer: ArrayBuffer): ParseResult
export function detectHeaderRow(rows: string[][]): number
export function detectDelimiter(text: string): string
export function detectEncoding(buffer: Buffer): string
```

**Responsibilities**:
- Parse CSV with quote handling, multi-line cells
- Parse Excel (.xlsx, .xls) to JSON
- Auto-detect header row (heuristic: first row with >50% string values)
- Auto-detect delimiter (comma, semicolon, tab, pipe)
- Handle non-UTF8 encodings (Windows-1252, ISO-8859-1)

#### 2. `/packages/backend/convex/lib/import/mapper.ts` (~300 lines)

Smart field mapping with 6 strategies.

**Dependencies**: `fastest-levenshtein`, `string-similarity`

**Key Functions**:
```typescript
export async function suggestMappings(
  columns: string[],
  targetSchema: FieldDefinition[],
  options: { organizationId?, templateId?, useLLM? }
): Promise<MappingSuggestion[]>

export function getFieldAliases(fieldName: string): string[]
export function fuzzyMatch(source: string, targets: string[], threshold?: number): Match[]
export function analyzeColumnContent(values: string[]): ContentAnalysis
```

**Mapping Strategies** (in order):
1. **Exact match** (100% confidence): Lowercase comparison
2. **Alias match** (95% confidence): Pre-defined alias dictionary
3. **Fuzzy match** (70-90% confidence): Levenshtein distance < 3 edits
4. **Historical match** (80% confidence): Org previously mapped this column
5. **Content analysis** (60-80% confidence): Regex patterns (email, phone, date)
6. **AI inference** (Phase 4): LLM analyzes column name + sample values

**Alias Database** (examples):
```typescript
{
  firstName: ["forename", "first name", "fname", "given name", "christian name"],
  lastName: ["surname", "last name", "lname", "family name"],
  dateOfBirth: ["dob", "birth date", "birthdate", "date of birth", "birthday"],
  email: ["e-mail", "email address", "contact email"],
  phone: ["mobile", "cell", "telephone", "contact number", "phone number"],
}
```

#### 3. `/packages/backend/convex/lib/import/validator.ts` (~250 lines)

Schema and business rule validation.

**Dependencies**: `zod`, `validator.js`, `libphonenumber-js`, `date-fns`, `email-validator`

**Key Functions**:
```typescript
export function validateRow(
  row: Record<string, string>,
  rowNumber: number,
  schema: FieldDefinition[]
): ValidationResult

export function validateBatch(
  rows: Record<string, string>[],
  schema: FieldDefinition[]
): BatchValidationResult

export function autoFixValue(
  value: string,
  field: string,
  error: ValidationError
): { fixed: string, confidence: number } | null
```

**Validation Rules**:
- **Required fields**: firstName, lastName, dateOfBirth, gender, ageGroup, season
- **Email**: RFC 5322 compliant validation
- **Phone**: International format parsing with country code inference
- **Date**: Multiple format support (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- **Age logic**: DOB must result in age appropriate for age group
- **Gender**: Normalize to "male"/"female"/"other"

**Auto-Fix Suggestions**:
- Date formats: "15/3/2015" → "2015-03-15"
- Phone: Add country code if missing
- Name: Title case suggestion
- Email typos: "gmial.com" → "gmail.com"

#### 4. `/packages/backend/convex/lib/import/benchmarkApplicator.ts` (~150 lines)

Applies benchmarks to newly created sport passports.

**Key Function**:
```typescript
export async function applyBenchmarksToPassport(
  ctx: MutationCtx,
  passportId: Id<"sportPassports">,
  settings: {
    strategy: "blank" | "middle" | "age-appropriate" | "ngb-benchmarks" | "custom",
    templateId?: Id<"benchmarkTemplates">,
    ageGroup: string,
    sportCode: string,
  }
): Promise<{ benchmarksApplied: number }>
```

**Strategies**:
1. **blank**: All skills = 1 (minimum rating)
2. **middle**: All skills = 3 (mid-range rating)
3. **age-appropriate**: Use age-based defaults from skill definitions
4. **ngb-benchmarks**: Use NGB standard benchmarks from `skillBenchmarks` table
5. **custom**: Use ratings from custom benchmark template

**Logic**:
- Fetch all skills for sportCode
- For each skill, determine rating based on strategy
- Create `skillAssessment` records with:
  - `assessmentType: "import"`
  - `source: "manual"`
  - `assessedBy: systemUserId`
  - `rating: calculated value`

#### 5. `/packages/backend/convex/lib/import/sportConfig.ts` (~150 lines)

Sport-specific configurations and validations.

**Key Functions**:
```typescript
export async function getSportConfig(
  ctx: QueryCtx,
  sportCode: string
): Promise<SportConfig>

export async function getAgeGroupsForSport(
  ctx: QueryCtx,
  sportCode: string
): Promise<AgeGroup[]>

export async function getSkillsForSport(
  ctx: QueryCtx,
  sportCode: string
): Promise<SkillDefinition[]>

export function validateAgeForGroup(
  age: number,
  ageGroup: string,
  sportCode: string
): boolean
```

**Configuration Structure**:
```typescript
type SportConfig = {
  code: string;
  name: string;
  ageGroups: AgeGroup[];
  skillCategories: SkillCategory[];
  defaultSkillRatings: Record<string, number>;
  validationRules: ValidationRule[];
}
```

#### 6. `/packages/backend/convex/models/importTemplates.ts` (~200 lines)

Template CRUD operations.

**Mutations**:
```typescript
export const createTemplate = mutation({...})
export const updateTemplate = mutation({...})
export const deleteTemplate = mutation({...})
export const cloneTemplate = mutation({...})
```

**Queries**:
```typescript
export const getTemplate = query({...})
export const listTemplates = query({...})
export const listTemplatesBySport = query({...})
export const listTemplatesByOrg = query({...})
```

#### 7. `/packages/backend/convex/models/importSessions.ts` (~300 lines)

Session lifecycle management.

**Mutations**:
```typescript
export const createImportSession = mutation({
  args: {
    organizationId: v.string(),
    templateId: v.optional(v.id("importTemplates")),
    sourceInfo: v.object({...}),
  },
  handler: async (ctx, args) => {
    // Create session with status "uploading"
    // Return session ID
  },
})

export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("importSessions"),
    status: v.string(),
  },
})

export const updatePlayerSelections = mutation({
  args: {
    sessionId: v.id("importSessions"),
    selections: v.array(v.object({
      rowIndex: v.number(),
      selected: v.boolean(),
      reason: v.optional(v.string()),
    })),
  },
})

export const setBenchmarkSettings = mutation({
  args: {
    sessionId: v.id("importSessions"),
    settings: v.object({
      applyBenchmarks: v.boolean(),
      strategy: v.string(),
      customTemplateId: v.optional(v.id("benchmarkTemplates")),
      passportStatuses: v.array(v.string()),
    }),
  },
})

export const recordSessionStats = mutation({
  args: {
    sessionId: v.id("importSessions"),
    stats: v.object({...}),
  },
})
```

### Files to Modify

#### `/packages/backend/convex/models/playerImport.ts`

**CRITICAL**: This file contains the proven guardian matching algorithm. Handle with care.

**Changes**:
1. Add optional parameters (maintain backward compatibility):
   - `sportCode?: string`
   - `templateId?: Id<"importTemplates">`
   - `sessionId?: Id<"importSessions">`
   - `selectedRowIndices?: number[]`
   - `benchmarkSettings?: BenchmarkSettings`

2. Extract hardcoded values:
   - Replace `"gaa_football"` with `sportCode` parameter
   - Make skill rating strategy configurable

3. Add benchmark application:
   - After sport passport creation in Phase 4
   - Call `applyBenchmarksToPassport()` if benchmarkSettings provided

4. Add row filtering:
   - Filter `players` array by `selectedRowIndices` if provided

**PRESERVE (DO NOT CHANGE)**:
- Guardian matching algorithm (lines 139-249)
- Multi-signal scoring weights (email 50pts, surname+postcode 45pts, phone 30pts, etc.)
- Two-pass parsing logic
- All existing function signatures

**Modified Signature**:
```typescript
export const batchImportPlayersWithIdentity = mutation({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),            // NEW
    templateId: v.optional(v.id("importTemplates")), // NEW
    sessionId: v.optional(v.id("importSessions")),   // NEW
    selectedRowIndices: v.optional(v.array(v.number())), // NEW
    benchmarkSettings: v.optional(v.object({      // NEW
      applyBenchmarks: v.boolean(),
      strategy: v.string(),
      customTemplateId: v.optional(v.id("benchmarkTemplates")),
      passportStatuses: v.array(v.string()),
    })),
    players: v.array(v.object({...})),            // Existing
  },
  handler: async (ctx, args) => {
    // NEW: Filter players by selection
    const playersToImport = args.selectedRowIndices
      ? args.players.filter((_, idx) => args.selectedRowIndices!.includes(idx))
      : args.players;

    // Existing 4-phase import logic...
    // Phase 1: Create player identities
    // Phase 2: Guardian matching
    // Phase 3: Explicit parent info
    // Phase 4: Org enrollments + sport passports

    // NEW: After passport creation
    if (args.benchmarkSettings?.applyBenchmarks) {
      for (const passport of createdPassports) {
        await applyBenchmarksToPassport(ctx, passport.id, {
          strategy: args.benchmarkSettings.strategy,
          templateId: args.benchmarkSettings.customTemplateId,
          ageGroup: passport.ageGroup,
          sportCode: args.sportCode || "gaa_football",
        });
      }
    }

    // Return existing results + benchmarksApplied count
  },
})
```

---

## Frontend Implementation

### Files to Create

#### 1. `/apps/web/src/app/orgs/[orgId]/import/page.tsx` (~150 lines)

New entry point for generic import.

**Features**:
- Sport selection dropdown (if no template selected)
- Template selection (platform + org templates)
- "Start Import" button → routes to wizard
- Recent imports list
- Download template option

#### 2. `/apps/web/src/components/import/ImportWizard.tsx` (~500 lines)

Generic import wizard orchestrator.

**Wizard Steps**:
```typescript
const WIZARD_STEPS = [
  { id: 1, name: "Upload", mandatory: true },
  { id: 2, name: "Map Columns", conditional: true, skip: () => autoMapped >= 100 },
  { id: 2.5, name: "Select Players", mandatory: true },
  { id: 3, name: "Configure Import", mandatory: true },  // Benchmark settings
  { id: 4, name: "Review", conditional: true, skip: () => noDuplicates && noErrors },
  { id: 5, name: "Import", mandatory: true },
  { id: 6, name: "Complete", mandatory: true },
];
```

**State Management**:
```typescript
const [step, setStep] = useState(1);
const [template, setTemplate] = useState<Template | null>(null);
const [sportCode, setSportCode] = useState<string | null>(null);
const [parsedData, setParsedData] = useState<ParseResult | null>(null);
const [mappings, setMappings] = useState<Record<string, string>>({});
const [playerSelections, setPlayerSelections] = useState<Map<number, boolean>>(new Map());
const [benchmarkSettings, setBenchmarkSettings] = useState<BenchmarkSettings>({
  applyBenchmarks: true,
  strategy: "age-appropriate",
  customTemplateId: null,
  passportStatuses: ["active"],
});
const [sessionId, setSessionId] = useState<Id<"importSessions"> | null>(null);
```

#### 3. `/apps/web/src/components/import/steps/UploadStep.tsx` (~250 lines)

File upload, paste, and initial validation.

**Features**:
- File drag & drop (CSV, Excel)
- Clipboard paste (from Excel)
- Template download
- Sport selection (if no template)
- File parsing with progress
- Header detection
- Row/column count display

#### 4. `/apps/web/src/components/import/steps/MappingStep.tsx` (~300 lines)

Smart field mapping UI with confidence indicators.

**Features**:
- Auto-mapped columns with checkmarks
- Unmapped columns highlighted
- Sample values preview (5 rows)
- Confidence percentage display
- Manual dropdown override
- "Don't import" option per column
- Validation preview (required fields check)

**UI Pattern**:
```typescript
<MappingRow>
  <SourceColumn>
    Forename
    <SampleValues>["John", "Mary", "Tom", ...]</SampleValues>
  </SourceColumn>

  <MappingArrow confidence={100}>
    <ConfidenceBadge>100% - Exact Match</ConfidenceBadge>
  </MappingArrow>

  <TargetField>
    <Select value="firstName" disabled={autoMapped}>
      <option value="firstName">First Name</option>
      <option value="lastName">Last Name</option>
      <option value="_skip">Don't Import</option>
    </Select>
    <Button onClick={unlockMapping}>Override</Button>
  </TargetField>
</MappingRow>
```

#### 5. `/apps/web/src/components/import/steps/PlayerSelectionStep.tsx` (~350 lines)

Per-player selection with search and bulk actions.

**Features** (from GAA import):
- Checkbox per player
- Select All / Deselect All buttons
- Search by name, DOB, team
- Filter: All / Selected / Unselected
- Selected count display
- Table view with sortable columns

**UI Pattern**:
```typescript
<PlayerSelectionUI>
  <Header>
    <h2>Select Players to Import</h2>
    <Summary>{selectedCount} of {totalCount} players selected</Summary>
  </Header>

  <Controls>
    <SearchBar placeholder="Search by name, DOB, team..." />
    <FilterButtons>
      <Button active={filter === "all"}>All ({totalCount})</Button>
      <Button active={filter === "selected"}>Selected ({selectedCount})</Button>
      <Button active={filter === "unselected"}>Unselected ({unselectedCount})</Button>
    </FilterButtons>
    <BulkActions>
      <Button onClick={selectAll}>Select All</Button>
      <Button onClick={deselectAll}>Deselect All</Button>
    </BulkActions>
  </Controls>

  <PlayerTable>
    <thead>
      <tr>
        <th><Checkbox checked={allSelected} onChange={toggleAll} /></th>
        <th>Name</th>
        <th>DOB</th>
        <th>Age Group</th>
        <th>Gender</th>
        <th>Parent Contact</th>
        <th>Team</th>
      </tr>
    </thead>
    <tbody>
      {filteredPlayers.map((player, idx) => (
        <tr key={idx} className={selected ? "bg-blue-50" : ""}>
          <td><Checkbox checked={selected} onChange={() => toggle(idx)} /></td>
          <td>{player.firstName} {player.lastName}</td>
          <td>{player.dateOfBirth}</td>
          <td>{player.ageGroup}</td>
          <td>{player.gender}</td>
          <td>{player.parentEmail || player.parentPhone}</td>
          <td>{player.team}</td>
        </tr>
      ))}
    </tbody>
  </PlayerTable>
</PlayerSelectionUI>
```

#### 6. `/apps/web/src/components/import/steps/BenchmarkConfigStep.tsx` (~300 lines)

Benchmark initialization configuration.

**Features**:
- Toggle: "Initialize skill ratings during import"
- Strategy selection (radio buttons):
  - Blank (All 1s)
  - Middle (All 3s)
  - Age-Appropriate (Recommended)
  - NGB Standards
  - Custom Template
- Custom template selector (if "custom" selected)
- Passport status filter (checkboxes: active, inactive, archived)
- Preview: Show sample skill ratings for U12 player

**UI Pattern**: See comprehensive plan for full component code.

#### 7. `/apps/web/src/components/import/steps/ReviewStep.tsx` (~400 lines)

Duplicate resolution and validation error fixing.

**Features** (extracted from GAA import):
- Duplicate resolution with search/bulk actions
- Validation error display with fix actions
- Team creation preview
- Guardian matching preview

#### 8. `/apps/web/src/components/import/steps/ImportStep.tsx` (~200 lines)

Progress tracker with real-time updates.

**Features**:
- Phase-by-phase breakdown
- Live stats counter
- Current operation display
- Error collection

#### 9. `/apps/web/src/components/import/steps/CompleteStep.tsx` (~250 lines)

Success summary with "What's Next" workflow.

**Features**:
- Statistics cards (players, guardians, teams, passports, benchmarks)
- Import log download
- "What's Next" action cards
- Return to dashboard link

### Files to Modify

#### `/apps/web/src/components/gaa-import.tsx`

**Strategy**: Extract reusable components, wrap in new wizard.

**Changes**:
1. Extract to `/import/shared/`:
   - `DuplicateResolution.tsx` (lines 2066-2265)
   - `TeamCreation.tsx` (lines 1245-1389)
   - `GuardianMatching.tsx` (guardian preview UI)
   - `PlayerSelectionTable.tsx` (lines 1600-1800)

2. Update to use `ImportWizard`:
   - Pass GAA template ID
   - Set sportCode to "gaa_football"
   - Use extracted shared components

3. Add benchmark configuration:
   - Insert `BenchmarkConfigStep` into flow

**PRESERVE (DO NOT CHANGE)**:
- All UX patterns (conditional steps, search, bulk actions)
- Two-pass CSV parsing logic (lines 591-829)
- Multi-signal guardian scoring display
- Detailed progress tracking (lines 2554-2568)
- Export/download capabilities (lines 2301-2389)

---

## Default Templates

### Template 1: GAA Foireann Export

```typescript
{
  name: "GAA Foireann Export",
  description: "Import from GAA Foireann membership export",
  sportCode: "gaa_football",
  sourceType: "csv",
  scope: "platform",

  columnMappings: [
    { sourcePattern: "Forename", targetField: "firstName", required: true },
    { sourcePattern: "Surname", targetField: "lastName", required: true },
    { sourcePattern: "DOB", targetField: "dateOfBirth", required: true, transform: "parseDate" },
    { sourcePattern: "gender", targetField: "gender", required: true, transform: "normalizeGender" },
    { sourcePattern: "email", targetField: "parentEmail", required: false },
    { sourcePattern: "Mobile Number", targetField: "parentPhone", required: false },
    { sourcePattern: "Address1", targetField: "address", required: false },
    { sourcePattern: "Postcode", targetField: "postcode", required: false },
    { sourcePattern: "Town", targetField: "town", required: false },
    // ... 30+ total mappings
  ],

  ageGroupMappings: [
    { sourceValue: "JUVENILE", targetAgeGroup: "auto" },
    { sourceValue: "SENIOR", targetAgeGroup: "senior" },
  ],

  skillInitialization: {
    strategy: "age-appropriate",
    applyToPassportStatus: ["active"],
  },

  defaults: {
    createTeams: true,
    createPassports: true,
    season: "2025",
  },

  isActive: true,
}
```

### Template 2: Generic CSV

```typescript
{
  name: "Generic CSV/Excel",
  description: "Import from any CSV or Excel file",
  sportCode: null,
  sourceType: "csv",
  scope: "platform",

  columnMappings: [
    { sourcePattern: "/first.*name/i", targetField: "firstName", required: true },
    { sourcePattern: "/last.*name|surname/i", targetField: "lastName", required: true },
    { sourcePattern: "/dob|birth/i", targetField: "dateOfBirth", required: true },
    { sourcePattern: "/gender|sex/i", targetField: "gender", required: true },
  ],

  skillInitialization: {
    strategy: "blank",
    applyToPassportStatus: ["active"],
  },

  defaults: {
    createTeams: true,
    createPassports: true,
  },

  isActive: true,
}
```

---

## Testing Requirements

### Unit Tests

**Backend**:
- `parser.ts`: CSV edge cases, Excel formats, encoding detection
- `mapper.ts`: All 5 mapping strategies, fuzzy matching thresholds
- `validator.ts`: All validation rules, auto-fix suggestions
- `benchmarkApplicator.ts`: All 5 strategies, rating calculations
- `sportConfig.ts`: Age validation, skill lookups

**Frontend**:
- Wizard step navigation
- Player selection state management
- Benchmark configuration logic
- Mapping confidence calculations

### Integration Tests

1. **End-to-end GAA import**:
   - Upload CSV → Map columns → Select players → Configure benchmarks → Review → Import
   - Verify: 90/100 players imported, 10 deselected
   - Verify: Age-appropriate benchmarks applied correctly

2. **End-to-end Soccer import**:
   - Create custom Soccer template
   - Upload CSV → Auto-map 80%+ → Import
   - Verify: Soccer sport passports created

3. **End-to-end Rugby import**:
   - Use NGB benchmarks
   - Verify: Benchmark ratings match NGB standards

4. **Template functionality**:
   - Create, edit, clone, delete templates
   - Verify: Template usage tracked in history

### Manual UAT

1. Import 100 GAA players (existing flow):
   - Deselect 10 players
   - Apply age-appropriate benchmarks
   - Verify: 90 imported, skills initialized for U12 vs U14

2. Import 50 soccer players:
   - Create custom template
   - Apply custom benchmark template
   - Verify: Ratings match template

3. Import 30 rugby players:
   - Use NGB benchmarks
   - Verify: All skills match NGB standards

---

## Ralph Integration

### Parallel Work Streams

#### Stream 1: Backend Infrastructure (2 weeks)

**Agent 1: Database Schema & Migrations**
- Create 4 new tables in schema.ts
- Add indexes
- Modify playerIdentities, orgPlayerEnrollments
- Create migration scripts
- Verify schema deployment

**Agent 2: Parser & Mapper Engines**
- Implement parser.ts (CSV, Excel, encoding)
- Implement mapper.ts (5 strategies, fuzzy matching)
- Create alias database
- Unit tests for both

**Agent 3: Validator Engine**
- Implement validator.ts (schema, business rules)
- Auto-fix suggestions
- Error collection
- Unit tests

**Agent 4: Benchmark Applicator**
- Implement benchmarkApplicator.ts (5 strategies)
- Skill rating calculations
- Integration with skillAssessments table
- Unit tests

**Agent 5: Template & Session Mutations**
- Implement importTemplates.ts (CRUD)
- Implement importSessions.ts (lifecycle)
- Default template seeds
- Unit tests

#### Stream 2: Frontend Wizard (2 weeks)

**Agent 6: ImportWizard Shell + Routing**
- Create page.tsx (entry point)
- Create ImportWizard.tsx (orchestrator)
- Step navigation logic
- State management
- Routing integration

**Agent 7: UploadStep + MappingStep**
- Create UploadStep.tsx (file upload, paste)
- Create MappingStep.tsx (smart mapping UI)
- Confidence indicators
- Sample value preview

**Agent 8: PlayerSelectionStep**
- Extract from GAA import (lines 1600-1800)
- Create PlayerSelectionStep.tsx
- Search, filter, bulk actions
- Checkbox state management

**Agent 9: BenchmarkConfigStep**
- Create BenchmarkConfigStep.tsx
- Strategy selection UI
- Template selector
- Benchmark preview
- Passport status filter

**Agent 10: ReviewStep**
- Extract DuplicateResolution from GAA (lines 2066-2265)
- Extract TeamCreation from GAA (lines 1245-1389)
- Create ReviewStep.tsx
- Validation error display

**Agent 11: ImportStep + CompleteStep**
- Create ImportStep.tsx (progress tracker)
- Create CompleteStep.tsx (success summary)
- "What's Next" workflow
- Download functionality

#### Stream 3: Sport Configurations (1 week)

**Agent 12: Default Templates**
- Create GAA Foireann template
- Create Generic CSV template
- Template seeding script

**Agent 13: Sport Configurations**
- GAA Football config
- Soccer config
- Rugby config
- Age group mappings

**Agent 14: Benchmark Templates**
- NGB standard benchmarks (GAA, Soccer, Rugby)
- Age-appropriate defaults
- Template seeding script

#### Stream 4: Testing & Documentation (1 week)

**Agent 15: Unit Tests**
- Backend unit tests (parser, mapper, validator)
- Frontend unit tests (wizard, steps)
- Coverage target: 80%+

**Agent 16: Integration Tests**
- End-to-end flows (GAA, Soccer, Rugby)
- Template CRUD
- Session tracking

**Agent 17: Documentation**
- Update CLAUDE.md
- Create /docs/features/generic-import-framework.md
- API documentation
- Migration guide

---

## Dependencies

None - This is Phase 1 (foundation).

---

## Risk Mitigation

### Backward Compatibility
- GAA import must continue working 100%
- Extensive testing with real GAA club data
- Feature flag for rollback if needed

### Data Integrity
- Validation at every step
- Session tracking for audit trail
- Error collection without blocking import

### Performance
- Batch processing (100 records/batch)
- Map-based lookups (no N+1 queries)
- Index-based queries only

---

## Definition of Done

- [ ] All 4 new database tables created with indexes
- [ ] All backend files created and unit tested
- [ ] All frontend components created and unit tested
- [ ] GAA import works 100% with new wizard
- [ ] Soccer import works with custom template
- [ ] Rugby import works with NGB benchmarks
- [ ] Per-player selection functional
- [ ] Benchmark configuration functional
- [ ] Integration tests pass
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Deployed to staging
- [ ] UAT sign-off

---

**Next Phase**: [Phase 2: Enhanced UX & Data Quality](./phase-2-enhanced-ux.md)
