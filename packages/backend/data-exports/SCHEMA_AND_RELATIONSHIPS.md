# Skills Data Schema and Relationships

## Overview

The export script exports **ALL sports** automatically. It queries all records from `skillCategories` and `skillDefinitions` tables without filtering by sport, so you'll get data for every sport in your database.

## Database Schema

### Table: `sports` (Reference)

```typescript
sports: defineTable({
  code: v.string(),              // "gaa", "soccer", "rugby"
  name: v.string(),              // "GAA", "Soccer", "Rugby"
  governingBody: v.optional(v.string()),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
})
.index("by_code", ["code"])
.index("by_isActive", ["isActive"])
.index("by_sortOrder", ["sortOrder"])
```

**Location**: `packages/backend/convex/schema.ts` (lines 11-37)

---

### Table: `skillCategories`

**Purpose**: Sport-specific groupings of skills (e.g., "Ball Mastery", "Passing & Distribution")

```typescript
skillCategories: defineTable({
  sportCode: v.string(),         // FK to sports.code (denormalized)
  code: v.string(),              // "ball_mastery", "passing", "tactical"
  name: v.string(),              // "Ball Mastery", "Passing & Distribution"
  description: v.optional(v.string()),
  sortOrder: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
})
.index("by_sportCode", ["sportCode"])
.index("by_sportCode_and_code", ["sportCode", "code"])
.index("by_sortOrder", ["sportCode", "sortOrder"])
```

**Schema Location**: `packages/backend/convex/schema.ts` (lines 40-51)

**Key Fields**:
- `sportCode`: Links to `sports.code` (string reference, not foreign key constraint)
- `code`: Unique identifier within a sport (e.g., "ball_mastery")
- `name`: Display name
- `sortOrder`: Display order within the sport
- `isActive`: Soft delete flag

**Example**:
```json
{
  "_id": "j123abc...",
  "_creationTime": 1234567890,
  "sportCode": "gaa",
  "code": "ball_mastery",
  "name": "Ball Mastery",
  "description": "Fundamental ball handling skills",
  "sortOrder": 1,
  "isActive": true,
  "createdAt": 1234567890
}
```

---

### Table: `skillDefinitions`

**Purpose**: Individual assessable skills within categories

```typescript
skillDefinitions: defineTable({
  categoryId: v.id("skillCategories"),  // FK to skillCategories._id
  sportCode: v.string(),                // FK to sports.code (denormalized)
  code: v.string(),                     // "solo_run", "hand_pass", "ball_control"
  name: v.string(),                     // "Solo Run", "Hand Pass", "Ball Control"
  description: v.optional(v.string()),
  // Level descriptors for 1-5 rating scale
  level1Descriptor: v.optional(v.string()),  // "Cannot perform consistently"
  level2Descriptor: v.optional(v.string()),  // "Developing, needs work"
  level3Descriptor: v.optional(v.string()),  // "Competent in training"
  level4Descriptor: v.optional(v.string()),  // "Proficient in matches"
  level5Descriptor: v.optional(v.string()),  // "Excellent, role model"
  // Age group relevance
  ageGroupRelevance: v.optional(v.array(v.string())),  // ["u8", "u9", "u10"]
  sortOrder: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
})
.index("by_categoryId", ["categoryId"])
.index("by_sportCode", ["sportCode"])
.index("by_sportCode_and_code", ["sportCode", "code"])
.index("by_sortOrder", ["categoryId", "sortOrder"])
```

**Schema Location**: `packages/backend/convex/schema.ts` (lines 54-75)

**Key Fields**:
- `categoryId`: **Link** to `skillCategories._id` (Convex ID reference)
- `sportCode`: Links to `sports.code` (denormalized for easier queries)
- `code`: Unique identifier within a sport (e.g., "solo_run")
- `name`: Display name
- `level1Descriptor` through `level5Descriptor`: Assessment criteria for 1-5 rating scale
- `ageGroupRelevance`: Which age groups this skill applies to
- `sortOrder`: Display order within the category
- `isActive`: Soft delete flag

**Example**:
```json
{
  "_id": "k456def...",
  "_creationTime": 1234567890,
  "categoryId": "j123abc...",
  "sportCode": "gaa",
  "code": "solo_run",
  "name": "Solo Run",
  "description": "Running while bouncing the ball",
  "level1Descriptor": "Cannot perform consistently",
  "level2Descriptor": "Developing, needs work",
  "level3Descriptor": "Competent in training",
  "level4Descriptor": "Proficient in matches",
  "level5Descriptor": "Excellent, role model",
  "ageGroupRelevance": ["u8", "u9", "u10", "u11", "u12"],
  "sortOrder": 1,
  "isActive": true,
  "createdAt": 1234567890
}
```

---

## Relationships and Links

### Relationship Diagram

```
sports (reference)
  │
  ├─ sportCode (string) ──────────────┐
  │                                    │
  │                                    │
skillCategories                        │
  │                                    │
  ├─ _id ─────────────────────────────┼─── categoryId (in skillDefinitions)
  │                                    │
  └─ sportCode (string) ──────────────┘
                                      │
skillDefinitions                       │
  │                                    │
  ├─ categoryId ──────────────────────┘ (links to skillCategories._id)
  │
  └─ sportCode (string) ──────────────── (denormalized link to sports.code)
```

### Link Types

#### 1. **Foreign Key: `skillDefinitions.categoryId` → `skillCategories._id`**
- **Type**: Convex ID reference (`v.id("skillCategories")`)
- **Relationship**: Many-to-One (many skills belong to one category)
- **Usage**: 
  - Query skills by category: `ctx.db.query("skillDefinitions").withIndex("by_categoryId", ...)`
  - Get category from skill: `await ctx.db.get(skill.categoryId)`
- **In Export**: The `categoryId` is included in the flat export, and the relationship is preserved in the structured export

#### 2. **Denormalized: `skillCategories.sportCode` → `sports.code`**
- **Type**: String reference (not a foreign key constraint)
- **Relationship**: Many-to-One (many categories belong to one sport)
- **Purpose**: Denormalized for easier querying (avoids joins)
- **Usage**:
  - Query categories by sport: `ctx.db.query("skillCategories").withIndex("by_sportCode", ...)`
  - Group by sport in exports
- **In Export**: `sportCode` is included in all exports

#### 3. **Denormalized: `skillDefinitions.sportCode` → `sports.code`**
- **Type**: String reference (not a foreign key constraint)
- **Relationship**: Many-to-One (many skills belong to one sport)
- **Purpose**: Denormalized for easier querying (avoids joins through category)
- **Usage**:
  - Query skills by sport directly: `ctx.db.query("skillDefinitions").withIndex("by_sportCode", ...)`
  - Filter skills without loading categories first
- **In Export**: `sportCode` is included in all exports

### Why Denormalization?

Both `skillCategories` and `skillDefinitions` store `sportCode` even though:
- Categories could get sportCode from the sport table
- Skills could get sportCode from their category

**Benefits**:
- ✅ Faster queries (no joins needed)
- ✅ Simpler filtering by sport
- ✅ Better index performance
- ✅ Easier exports and grouping

**Trade-offs**:
- ⚠️ Must keep `sportCode` in sync when moving categories/skills
- ⚠️ Slightly more storage (minimal impact)

---

## Export Structure

### Flat Exports

**`skill-categories-YYYY-MM-DD.json`**:
```json
[
  {
    "_id": "...",
    "_creationTime": 1234567890,
    "sportCode": "gaa",
    "code": "ball_mastery",
    "name": "Ball Mastery",
    ...
  },
  {
    "_id": "...",
    "sportCode": "soccer",
    "code": "ball_control",
    ...
  }
]
```

**`skill-definitions-YYYY-MM-DD.json`**:
```json
[
  {
    "_id": "...",
    "_creationTime": 1234567890,
    "categoryId": "j123abc...",  // ← Link to category
    "sportCode": "gaa",          // ← Denormalized sport link
    "code": "solo_run",
    "name": "Solo Run",
    ...
  }
]
```

### Structured Export

**`skills-complete-YYYY-MM-DD.json`**:
```json
{
  "exportedAt": 1234567890,
  "sports": [
    {
      "sportCode": "gaa",
      "categories": [
        {
          "_id": "j123abc...",
          "code": "ball_mastery",
          "name": "Ball Mastery",
          ...
          "skills": [
            {
              "_id": "k456def...",
              "code": "solo_run",
              "name": "Solo Run",
              // categoryId is implicit (parent category)
              // sportCode is implicit (parent sport)
              ...
            }
          ]
        }
      ]
    }
  ]
}
```

**Note**: In the structured export, the `categoryId` and `sportCode` links are implicit through the nesting structure, but the IDs are still available if needed.

---

## Query Patterns

### Get all categories for a sport
```typescript
const categories = await ctx.db
  .query("skillCategories")
  .withIndex("by_sportCode", (q) => q.eq("sportCode", "gaa"))
  .collect();
```

### Get all skills for a category
```typescript
const skills = await ctx.db
  .query("skillDefinitions")
  .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
  .collect();
```

### Get all skills for a sport (direct)
```typescript
const skills = await ctx.db
  .query("skillDefinitions")
  .withIndex("by_sportCode", (q) => q.eq("sportCode", "gaa"))
  .collect();
```

### Get category for a skill
```typescript
const category = await ctx.db.get(skill.categoryId);
```

---

## File Locations

- **Schema Definition**: `packages/backend/convex/schema.ts` (lines 11-75)
- **Export Queries**: `packages/backend/convex/models/referenceData.ts` (lines 3140-3336)
- **Export Script**: `packages/backend/scripts/export-skills-data.ts`
- **This Documentation**: `packages/backend/data-exports/SCHEMA_AND_RELATIONSHIPS.md`

---

## Summary

✅ **Yes, the export script pulls data for ALL sports automatically**

The queries use `.collect()` without any filtering, so they retrieve:
- All skill categories from all sports
- All skill definitions from all sports
- Complete structured data grouped by sport

The relationships are preserved:
- `categoryId` links skills to categories
- `sportCode` (denormalized) links both categories and skills to sports
- Structured export maintains the hierarchy: Sport → Category → Skill




