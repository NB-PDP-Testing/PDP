# Skills Data Export

This directory contains exported skills data from the Convex dev instance for reference and backup purposes.

**Important**: The export script automatically exports data for **ALL sports** in your database. It does not filter by sport - you'll get everything.

## Exporting Skills Data

To export the current skills data from your Convex dev instance, run:

```bash
cd packages/backend
npx --yes tsx scripts/export-skills-data.ts
```

Or if you have tsx installed globally:

```bash
cd packages/backend
tsx scripts/export-skills-data.ts
```

### What Gets Exported

The script exports three files:

1. **`skill-categories-YYYY-MM-DD.json`** - All skill categories (flat list)
2. **`skill-definitions-YYYY-MM-DD.json`** - All skill definitions (flat list)
3. **`skills-complete-YYYY-MM-DD.json`** - Complete structured data (grouped by sport and category)
4. **`skills-export-summary-YYYY-MM-DD.json`** - Summary statistics

### Environment Variables

The script uses the following environment variables (in order of precedence):

- `CONVEX_URL` - Direct Convex deployment URL
- `VITE_CONVEX_URL` - Alternative environment variable
- Default: `https://valuable-pig-963.convex.cloud` (dev instance)

You can override the URL:

```bash
CONVEX_URL=https://your-instance.convex.cloud npx tsx scripts/export-skills-data.ts
```

## Files in This Directory

- `*.json` - Exported data files (one set per export date)
- `README.md` - This file

## Using the Exported Data

The exported JSON files can be used for:

1. **Reference** - Understanding the current structure of skills data
2. **Backup** - Restoring data if needed
3. **Migration** - Moving data between environments
4. **Analysis** - Understanding data distribution and structure

## Schema and Relationships

For detailed information about the schema structure and relationships between tables, see:
- **[SCHEMA_AND_RELATIONSHIPS.md](./SCHEMA_AND_RELATIONSHIPS.md)** - Complete schema documentation with relationship diagrams

Key relationships:
- `skillDefinitions.categoryId` → `skillCategories._id` (foreign key)
- `skillCategories.sportCode` → `sports.code` (denormalized string reference)
- `skillDefinitions.sportCode` → `sports.code` (denormalized string reference)

## Data Structure

### Skill Categories

```typescript
{
  _id: string,
  _creationTime: number,
  sportCode: string,
  code: string,
  name: string,
  description?: string,
  sortOrder: number,
  isActive: boolean,
  createdAt: number
}
```

### Skill Definitions

```typescript
{
  _id: string,
  _creationTime: number,
  categoryId: string,
  sportCode: string,
  code: string,
  name: string,
  description?: string,
  level1Descriptor?: string,
  level2Descriptor?: string,
  level3Descriptor?: string,
  level4Descriptor?: string,
  level5Descriptor?: string,
  ageGroupRelevance?: string[],
  sortOrder: number,
  isActive: boolean,
  createdAt: number
}
```

### Complete Structured Data

The complete export groups data by sport, with categories nested and skills nested within categories:

```typescript
{
  exportedAt: number,
  sports: [
    {
      sportCode: string,
      categories: [
        {
          // category fields...
          skills: [
            // skill definition fields...
          ]
        }
      ]
    }
  ]
}
```

