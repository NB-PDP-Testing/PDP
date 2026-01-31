# Seed Team Script

**Location:** `packages/backend/convex/scripts/seedRugbyTeam.ts`

Seeds a team with 35 players and full assessment history for any sport (rugby, soccer, GAA, etc.). Useful for demos, testing, and development.

## Quick Start

```bash
# 1. Get your organization ID from the database or URL
# 2. Run the seed script
npx convex run scripts/seedRugbyTeam:seed \
  --args '{"orgId":"YOUR_ORG_ID","teamName":"U15 Boys"}'
```

## Usage

### Development

```bash
# Dry run - preview what would be created (no changes made)
npx convex run scripts/seedRugbyTeam:seed \
  '{"orgId":"abc123","teamName":"U15 Boys","dryRun":true}'

# Full run - creates rugby team (default sport)
npx convex run scripts/seedRugbyTeam:seed \
  '{"orgId":"abc123","teamName":"U15 Boys"}'

# Soccer team
npx convex run scripts/seedRugbyTeam:seed \
  '{"orgId":"abc123","teamName":"U14 Soccer","sport":"soccer"}'

# GAA Football team
npx convex run scripts/seedRugbyTeam:seed \
  '{"orgId":"abc123","teamName":"U12 GAA","sport":"gaa_football"}'

# With custom age group and gender
npx convex run scripts/seedRugbyTeam:seed \
  '{"orgId":"abc123","teamName":"U14 Girls","sport":"rugby","ageGroup":"u14","gender":"Female"}'
```

### Production

Production runs require an explicit confirmation flag for safety:

```bash
npx convex run scripts/seedRugbyTeam:seed \
  --args '{"orgId":"abc123","teamName":"U15 Boys","confirmProduction":true}' \
  --prod
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `orgId` | string | Yes | - | Organization ID (Better Auth org ID) |
| `teamName` | string | Yes | - | Name of the team to create/find |
| `sport` | string | No | `"rugby"` | Sport code: "rugby", "soccer", "gaa_football", etc. |
| `ageGroup` | string | No | `"u15"` | Age group (e.g., "u12", "u14", "u16", "u18") |
| `gender` | string | No | `"Mixed"` | Team gender: "Male", "Female", or "Mixed" |
| `dryRun` | boolean | No | `false` | Preview mode - no data created |
| `confirmProduction` | boolean | No | `false` | Required for production runs |

## What Gets Created

### Players (35 total)

The script creates 35 players with a realistic distribution of names:

| Origin | Count | Percentage |
|--------|-------|------------|
| Irish | 28 | 80% |
| Indian | 3 | 8.5% |
| Polish | 2 | 5.7% |
| European | 2 | 5.7% |

**Irish names include:** Seán, Conor, Cian, Aoife, Niamh, Saoirse, etc.
**Surnames include:** O'Brien, Murphy, Kelly, Walsh, Byrne, Ryan, etc.

Gender distribution is approximately 75% male, 25% female.

### Performance Levels

Players are assigned to three performance tiers:

| Level | Count | Rating Range | Description |
|-------|-------|--------------|-------------|
| High | 7 | 4.0 - 5.0 | Elite performers, consistent excellence |
| Medium | 21 | 2.5 - 3.5 | Developing players, room for growth |
| Low | 7 | 1.0 - 2.0 | Beginners, need significant development |

### Assessments

Each player receives **3 assessments** showing progression over time:

| Assessment | Date | Type | Description |
|------------|------|------|-------------|
| 1st | 3 months ago | Initial | Baseline assessment |
| 2nd | 6 weeks ago | Training | Mid-period check |
| 3rd | 1 week ago | Training | Most recent assessment |

Each assessment covers all **44 rugby skills** across 6 categories:
- Passing & Handling
- Catching & Receiving
- Running & Evasion
- Kicking
- Contact & Tackling
- Game Understanding

### Skill Variation

To create realistic player profiles:
- Each player has **strengths** (1-2 categories rated higher)
- Each player has **weaknesses** (1-2 categories rated lower)
- Individual skills have slight random variation (±0.4)
- Ratings show **progression** across the 3 assessments

## Output

Successful run returns:

```json
{
  "success": true,
  "created": {
    "teamId": "team_abc123",
    "players": 35,
    "passports": 35,
    "assessments": 4620
  },
  "playerBreakdown": {
    "irish": 28,
    "indian": 3,
    "polish": 2,
    "european": 2,
    "highPerformers": 7,
    "mediumPerformers": 21,
    "lowPerformers": 7
  }
}
```

**Assessment count:** 35 players × 3 assessments × 44 skills = 4,620 skill ratings

## Cleanup

To remove all seeded data:

```bash
npx convex run scripts/seedRugbyTeam:cleanup \
  --args '{"orgId":"abc123","teamName":"U15 Boys","confirmDelete":true}'
```

The cleanup function:
1. Finds all players assigned to the specified team
2. Deletes their skill assessments
3. Deletes their sport passports
4. Deletes their team assignments
5. Deletes their organization enrollments
6. Deletes player identities (only those created by this seed script)

**Note:** Players are only deleted if they were created by this seed script (`createdFrom: "seed_rugby_team"`). Manually created players are preserved.

## Finding Your Organization ID

### From the URL
When viewing your organization in the app, the URL contains the org ID:
```
https://app.example.com/orgs/abc123xyz/admin
                            ^^^^^^^^^^
                            This is your orgId
```

### From the Database
```bash
# List all organizations
npx convex run --component betterAuth adapter:findMany \
  --args '{"model":"organization","limit":10}'
```

## Idempotency

The script is designed to be **safely re-runnable**:

- Uses `findOrCreatePlayer` to avoid duplicate players
- Checks for existing enrollments before creating
- Checks for existing team assignments before creating
- Existing teams are reused (not duplicated)

Running the script multiple times will:
- Skip creating players that already exist (by name + DOB)
- Add new assessments to existing passports
- Not duplicate team assignments

## Prerequisites

Before running the seed script, ensure:

1. **Organization exists** - The orgId must be valid
2. **Rugby skills are seeded** - Run `seedDefaultSportRules` first if needed
3. **User has access** - Script runs as internal mutation (no auth required)

## Troubleshooting

### "Organization not found"
Verify the orgId is correct. Use the database query above to list organizations.

### "No rugby skills found"
Rugby skill definitions haven't been seeded. This should happen automatically on deployment, but you can manually trigger:
```bash
npx convex run scripts/seedDefaultSportRules:seed
```

### "Production run requires confirmProduction: true"
Add `"confirmProduction":true` to your args when running with `--prod`.

## Example Workflow

```bash
# 1. Check your org ID
npx convex dashboard
# Navigate to organization table, copy the _id

# 2. Preview what will be created
npx convex run scripts/seedRugbyTeam:seed \
  --args '{"orgId":"k17abc...","teamName":"Demo U15 Boys","dryRun":true}'

# 3. Create the data
npx convex run scripts/seedRugbyTeam:seed \
  --args '{"orgId":"k17abc...","teamName":"Demo U15 Boys"}'

# 4. View in the app
# Navigate to /orgs/{orgId}/coach/players

# 5. Clean up when done
npx convex run scripts/seedRugbyTeam:cleanup \
  --args '{"orgId":"k17abc...","teamName":"Demo U15 Boys","confirmDelete":true}'
```

## Related Scripts

- `seedDemoClub.ts` - Seeds a complete demo club with multiple sports
- `seedDefaultSportRules.ts` - Seeds sport configurations and skill definitions
- `seedUATData.ts` - Seeds UAT test data

## Technical Details

### Tables Modified

| Table | Records Created |
|-------|-----------------|
| `playerIdentities` | 35 |
| `orgPlayerEnrollments` | 35 |
| `teamPlayerIdentities` | 35 |
| `sportPassports` | 35 |
| `skillAssessments` | 4,620 |
| `team` (Better Auth) | 1 (if not exists) |

### Performance

- Script takes approximately 30-60 seconds to complete
- Uses batch assessment recording for efficiency
- Logs progress for each player created

---

**Created:** January 2026
**Author:** Development Team
