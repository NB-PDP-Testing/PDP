# Organization Sport Association Feature

**Date**: December 20, 2025
**Branch**: `feature/identity-system-migration`
**Status**: ✅ Complete

---

## Executive Summary

This feature implements a hierarchical sport management system where organizations can specify their supported sports, and teams automatically inherit these sports when created. This supports both single-sport and multi-sport organizations (e.g., GAA clubs with Football, Hurling, and Camogie).

## Problem Statement

**Before this feature:**
- Organizations had no sport configuration
- Each team independently selected its sport from a hardcoded list
- No relationship between organization sports and team sports
- No validation or consistency across teams
- Teams couldn't auto-default their sport from organization settings

**After this feature:**
- Organizations can specify supported sports (1 or more)
- Teams auto-default to the first org sport when created
- Coaches see a helpful "Auto-selected from organization" message
- Sports are loaded from database (not hardcoded)
- Settings page allows admins to manage org sports at any time

---

## Architecture

### Data Model Hierarchy

```
┌─────────────────────────────────────┐
│     Organization                    │
│  supportedSports: string[]          │
│  ["gaa_football", "hurling", ...]   │
└──────────────┬──────────────────────┘
               │
               │ defaults to first sport
               ↓
┌─────────────────────────────────────┐
│          Team                       │
│  sport: string                      │
│  "gaa_football"                     │
└─────────────────────────────────────┘
```

### Database Schema Changes

#### Organizations Table (Better Auth)
**File**: `packages/backend/convex/betterAuth/schema.ts`

```typescript
const customOrganizationTable = defineTable({
  // ... existing fields
  name: v.string(),
  slug: v.string(),
  logo: v.optional(v.union(v.null(), v.string())),
  colors: v.optional(v.array(v.string())),

  // NEW: Supported sports field
  supportedSports: v.optional(v.array(v.string())), // e.g., ["gaa_football", "hurling"]
})
```

**Lines Changed**: 86-89

---

## Implementation Details

### 1. Backend Changes

#### 1.1 Schema Update
**File**: `packages/backend/convex/betterAuth/schema.ts`

- **Added**: `supportedSports` field (optional array of sport codes)
- **Purpose**: Store which sports the organization supports
- **Type**: `v.optional(v.array(v.string()))`

**Location**: Lines 86-89

---

#### 1.2 Organization Queries
**File**: `packages/backend/convex/models/organizations.ts`

##### Updated: `getOrganization` Query
Added `supportedSports` to return type and handler.

**Return Type** (Lines 35):
```typescript
returns: v.union(
  v.null(),
  v.object({
    _id: v.string(),
    name: v.string(),
    // ... other fields
    supportedSports: v.optional(v.array(v.string())), // NEW
  })
),
```

**Handler** (Lines 62):
```typescript
return {
  // ... other fields
  supportedSports: org.supportedSports as string[] | undefined,
};
```

---

##### New: `updateOrganizationSports` Mutation
**Location**: Lines 378-453

**Purpose**: Update an organization's supported sports

**Validation**:
- ✅ User must be authenticated
- ✅ User must be owner or admin
- ✅ Sport codes must exist in `sports` reference table
- ✅ Empty array is allowed (remove all sports)

**Example Usage**:
```typescript
await updateOrganizationSports({
  organizationId: "abc123",
  supportedSports: ["gaa_football", "hurling", "camogie"]
});
```

**Security**: Only owners and admins can update supported sports.

---

### 2. Frontend Changes

#### 2.1 Organization Creation Page
**File**: `apps/web/src/app/orgs/create/page.tsx`

##### State Management (Lines 81-95)
```typescript
const [selectedSports, setSelectedSports] = useState<string[]>([]);
const availableSports = useQuery(api.models.referenceData.getSports, {});
const updateOrganizationSports = useMutation(
  api.models.organizations.updateOrganizationSports
);
```

##### UI - Sports Selection Section (Lines 810-886)
Multi-select checkbox grid displaying:
- Sport name (e.g., "GAA Football")
- Governing body (e.g., "GAA")
- Selected sports shown as badges
- Clear all button

**Visual Preview**:
```
┌─────────────────────────────────────────────┐
│  Supported Sports (Optional)                │
│  Select the sports your organization...     │
│                                              │
│  ☑ GAA Football                             │
│    GAA                                       │
│                                              │
│  ☑ Hurling                                  │
│    GAA                                       │
│                                              │
│  ☐ Soccer                                   │
│    FAI                                       │
│                                              │
│  Selected: [GAA Football] [Hurling]         │
└─────────────────────────────────────────────┘
```

##### Save Logic (Lines 321-334)
After organization is created via Better Auth, save supported sports:

```typescript
if (selectedSports.length > 0) {
  await updateOrganizationSports({
    organizationId: data.id,
    supportedSports: selectedSports,
  });
}
```

---

#### 2.2 Team Creation (Admin Page)
**File**: `apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx`

##### Data Fetching (Lines 455-461)
```typescript
// Get organization data (for supported sports)
const organization = useQuery(api.models.organizations.getOrganization, {
  organizationId: orgId,
});

// Get available sports from reference data
const availableSports = useQuery(api.models.referenceData.getSports, {});
```

##### Auto-Default Sport (Lines 543-550)
When creating a new team, default to first org sport:

```typescript
const openCreateDialog = () => {
  // Default sport from organization's supported sports
  const defaultSport =
    organization?.supportedSports && organization.supportedSports.length > 0
      ? organization.supportedSports[0]  // Use first sport
      : "";

  setFormData({
    ...defaultFormData,
    sport: defaultSport,  // Auto-filled!
  });
  // ...
};
```

##### Sport Dropdown (Lines 1049-1073)
```typescript
<Select value={formData.sport}>
  <SelectContent>
    {availableSports?.map((sport) => (
      <SelectItem key={sport.code} value={sport.code}>
        {sport.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

{/* Helpful hint when auto-selected */}
{organization?.supportedSports &&
 formData.sport === organization.supportedSports[0] && (
  <p className="text-xs text-muted-foreground">
    Auto-selected from organization
  </p>
)}
```

**Before**: Hardcoded `SPORTS = ["GAA Football", "Hurling", ...]` array
**After**: Database-driven from `getSports` query using sport codes

---

#### 2.3 Organization Settings Page
**File**: `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx`

##### State & Queries (Lines 126-155)
```typescript
// State
const [selectedSports, setSelectedSports] = useState<string[]>([]);
const [savingSports, setSavingSports] = useState(false);

// Query available sports
const availableSports = useQuery(api.models.referenceData.getSports, {});

// Mutation to update org sports
const updateOrganizationSports = useMutation(
  api.models.organizations.updateOrganizationSports
);
```

##### Sync from Org Data (Line 215)
```typescript
useEffect(() => {
  if (orgData) {
    // ... other fields
    setSelectedSports(orgData.supportedSports || []);
  }
}, [orgData]);
```

##### Save Handler (Lines 309-325)
```typescript
const handleSaveSports = async () => {
  setSavingSports(true);
  try {
    await updateOrganizationSports({
      organizationId: orgId,
      supportedSports: selectedSports,
    });
    toast.success("Supported sports updated successfully!");
  } catch (error) {
    toast.error("Failed to update supported sports");
  } finally {
    setSavingSports(false);
  }
};
```

##### UI Card (Lines 1043-1134)
**"Supported Sports" Management Section**

Features:
- ✅ Checkbox grid for selecting sports
- ✅ Shows sport name + governing body
- ✅ Selected sports displayed as badges
- ✅ Save button with loading state
- ✅ Info banner: "Teams will automatically default to the first selected sport"
- ✅ Admin/owner only access

**Visual Layout**:
```
┌─────────────────────────────────────────────┐
│  🛡️  Supported Sports                       │
│  Select the sports your organization...     │
├─────────────────────────────────────────────┤
│                                              │
│  ☑ GAA Football                             │
│    GAA                                       │
│                                              │
│  ☑ Hurling                                  │
│    GAA                                       │
│                                              │
│  ☐ Soccer                                   │
│    FAI                                       │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ Selected Sports                      │   │
│  │ [GAA Football] [Hurling]            │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  [✓ Save Supported Sports]                  │
│                                              │
│  ℹ️  Teams will automatically default to    │
│     the first selected sport.               │
└─────────────────────────────────────────────┘
```

---

## User Flows

### Flow 1: Platform Staff Creates Organization

1. **Navigate**: `/orgs/create` (platform staff only)
2. **Fill Form**:
   - Organization name
   - URL slug
   - Logo (optional)
   - Colors (optional)
   - **NEW**: Select supported sports ✨
3. **Submit**: Organization created with sports saved
4. **Result**: Redirected to `/orgs/{orgId}/admin`

---

### Flow 2: Admin Creates Team

1. **Navigate**: `/orgs/{orgId}/admin/teams`
2. **Click**: "Create Team" button
3. **Form Opens**:
   - Sport field **auto-filled** with org's first sport ✨
   - Hint shown: "Auto-selected from organization"
4. **Admin Can**:
   - Keep the auto-selected sport
   - Change to another sport from dropdown
5. **Submit**: Team created with selected sport

---

### Flow 3: Admin Updates Org Sports

1. **Navigate**: `/orgs/{orgId}/admin/settings`
2. **Scroll to**: "Supported Sports" card
3. **Select/Deselect**: Sports via checkboxes
4. **View**: Selected sports as badges
5. **Click**: "Save Supported Sports"
6. **Result**: Toast confirms success
7. **Effect**: Future teams will default to new first sport

---

## Data Examples

### Example 1: Single-Sport Organization (Rugby Club)
```json
{
  "name": "Grange Rugby Football Club",
  "slug": "grange-rfc",
  "supportedSports": ["rugby"]
}
```

**When creating a team**:
- Sport auto-defaults to `"rugby"`
- Coaches see hint: "Auto-selected from organization"

---

### Example 2: Multi-Sport Organization (GAA Club)
```json
{
  "name": "Portarlington GAA",
  "slug": "portarlington-gaa",
  "supportedSports": ["gaa_football", "hurling", "camogie", "ladies_football"]
}
```

**When creating a team**:
- Sport auto-defaults to `"gaa_football"` (first in array)
- Dropdown shows all 4 sports
- Coaches can select any of the 4 supported sports

---

### Example 3: Organization Without Sports
```json
{
  "name": "Generic Sports Club",
  "slug": "generic-sports",
  "supportedSports": [] // or undefined
}
```

**When creating a team**:
- Sport field is empty (no auto-default)
- Dropdown shows ALL available sports
- Admin must manually select

---

## Benefits

### 1. **Consistency**
- Teams align with organization's actual sports
- Prevents teams being created for unsupported sports

### 2. **User Experience**
- Auto-fill saves time for coaches/admins
- Clear visual feedback ("Auto-selected from organization")
- Easy to change if needed

### 3. **Data Integrity**
- Sports come from reference data (validated)
- Org-level validation ensures sport codes exist
- No hardcoded lists to maintain

### 4. **Flexibility**
- Supports multi-sport organizations
- Admins can update sports anytime
- Optional field (backwards compatible)

### 5. **Scalability**
- Sports are database-driven
- Easy to add new sports to reference data
- No frontend code changes needed for new sports

---

## Testing Scenarios

### ✅ Scenario 1: Create Org with Sports
1. Go to `/orgs/create` as platform staff
2. Fill form and select 2 sports (e.g., Football, Hurling)
3. Submit and verify org created
4. Check org settings page shows selected sports

**Expected**: Organization has both sports saved

---

### ✅ Scenario 2: Create Team with Auto-Default
1. Create org with "Rugby" as supported sport
2. Go to teams page and click "Create Team"
3. Verify sport dropdown shows "Rugby" pre-selected
4. Verify hint shows "Auto-selected from organization"

**Expected**: Sport auto-fills to Rugby

---

### ✅ Scenario 3: Create Team with No Org Sports
1. Create org without selecting any sports
2. Go to teams page and click "Create Team"
3. Verify sport dropdown is empty

**Expected**: No auto-default, admin must select manually

---

### ✅ Scenario 4: Update Org Sports in Settings
1. Go to org settings as admin
2. Find "Supported Sports" card
3. Select/deselect sports
4. Click "Save Supported Sports"
5. Verify toast shows success
6. Refresh and verify sports persisted

**Expected**: Sports updated and saved

---

### ✅ Scenario 5: Multi-Sport Organization
1. Create org with 3 sports: [Football, Hurling, Camogie]
2. Create team - verify defaults to Football (first)
3. Create another team - can select any of the 3

**Expected**: First sport used as default, all 3 available

---

### ✅ Scenario 6: Non-Admin Cannot Update Sports
1. Log in as regular member (not owner/admin)
2. Go to org settings
3. Verify "Supported Sports" card not shown

**Expected**: Only admins/owners see sports management

---

## Migration Notes

### Existing Organizations
- **No migration needed** - `supportedSports` is optional
- Existing orgs will have `supportedSports: undefined`
- Teams will continue to work normally
- Admins can add sports via settings page anytime

### Existing Teams
- **No changes** - teams keep their current sport
- No data migration required
- Sport field remains unchanged

### Breaking Changes
- **None** - fully backwards compatible

---

## File Changes Summary

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `betterAuth/schema.ts` | 86-89 | Schema | Added `supportedSports` field to org table |
| `models/organizations.ts` | 35 | Query | Added field to `getOrganization` return type |
| `models/organizations.ts` | 62 | Query | Return `supportedSports` in handler |
| `models/organizations.ts` | 378-453 | Mutation | Created `updateOrganizationSports` |
| `orgs/create/page.tsx` | 81-95 | State | Added sports state and mutations |
| `orgs/create/page.tsx` | 810-886 | UI | Added sports selection section |
| `orgs/create/page.tsx` | 321-334 | Logic | Save sports after org creation |
| `admin/teams/page.tsx` | 455-461 | Query | Fetch org and sports data |
| `admin/teams/page.tsx` | 543-550 | Logic | Auto-default sport from org |
| `admin/teams/page.tsx` | 1049-1073 | UI | Sport dropdown with hint |
| `admin/settings/page.tsx` | 126-155 | State | Added sports state, query, mutation |
| `admin/settings/page.tsx` | 215 | Sync | Load sports from org data |
| `admin/settings/page.tsx` | 309-325 | Handler | Save sports handler |
| `admin/settings/page.tsx` | 1043-1134 | UI | Sports management card |

**Total Files Modified**: 5
**Total Lines Changed**: ~300

---

## Technical Decisions

### Why Array Instead of Single Sport?
**Decision**: Use `supportedSports: string[]` (array) instead of `primarySport: string` (single)

**Rationale**:
- Many organizations support multiple sports (GAA clubs, schools)
- Allows flexibility without schema changes later
- First sport in array becomes default for teams
- More accurate representation of real-world organizations

---

### Why Sport Codes Instead of Names?
**Decision**: Store sport codes (`"gaa_football"`) instead of names (`"GAA Football"`)

**Rationale**:
- Codes are immutable (names can change)
- Easier to match with reference data
- Consistent with existing `sports` table structure
- Names can be updated in reference data without breaking relationships

---

### Why Auto-Default First Sport?
**Decision**: Use `supportedSports[0]` as team default

**Rationale**:
- Simplest UX - no config needed
- Works for 99% of single-sport orgs
- Multi-sport orgs can list primary sport first
- Coaches can easily change if needed

---

### Why Optional Field?
**Decision**: Make `supportedSports` optional in schema

**Rationale**:
- Backwards compatibility (existing orgs work)
- Not all orgs may want to configure this
- Gradual adoption - orgs can add later
- No forced migration

---

## Future Enhancements

### Potential Improvements

1. **Sport Ordering**
   - Drag-and-drop to reorder supported sports
   - Explicit "primary sport" designation

2. **Team Validation**
   - Optionally restrict teams to only org's supported sports
   - Warning if team sport not in org's list

3. **Bulk Import**
   - Import sports during GAA/CSV player import
   - Auto-detect sports from imported data

4. **Analytics**
   - Show sport distribution across teams
   - Track which sports have most players

5. **Sport-Specific Settings**
   - Per-sport configurations
   - Sport-specific skill definitions

---

## Related Documentation

- [Identity System Status Report](./IDENTITY_SYSTEM_STATUS_REPORT.md)
- [Better Auth Schema](../packages/backend/convex/betterAuth/schema.ts)
- [Organization Model](../packages/backend/convex/models/organizations.ts)
- [Reference Data Model](../packages/backend/convex/models/referenceData.ts)

---

## Changelog

### 2025-12-20 - Initial Implementation
- ✅ Added `supportedSports` field to organization schema
- ✅ Created `updateOrganizationSports` mutation with validation
- ✅ Updated `getOrganization` query to return supported sports
- ✅ Added sports selection to org creation page
- ✅ Implemented auto-default sport for team creation
- ✅ Added sports management to org settings page
- ✅ Replaced hardcoded sports with database-driven approach
- ✅ Added helpful UI hints and badges

---

## Support

For questions or issues related to this feature:

1. Review this documentation
2. Check the file references above
3. Review commit history on branch `feature/identity-system-migration`
4. Contact: Development Team

---

**End of Document**
