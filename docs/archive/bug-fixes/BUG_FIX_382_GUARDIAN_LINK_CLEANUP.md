# Bug #382: Guardian-Player Links Not Cleaned Up When Parent Removed from Organization

## Issue Description
When a parent is removed from an organization (via admin UI or member management), the guardian-player links to their children enrolled in that organization persist. These orphaned links remain visible in the Guardian tab and require manual deletion.

## Root Cause Analysis

### Investigation
Examined the `removeFromOrganization` function in `packages/backend/convex/models/members.ts` (lines 5315-5340).

The function correctly deletes:
- `orgGuardianProfiles` - Organization-scoped guardian profile records

But it **did not delete**:
- `guardianPlayerLinks` - Platform-level links between guardians and players

### Why This Happened
The guardian system has a multi-level architecture:
1. `guardianIdentities` - Platform-level guardian record (linked to user)
2. `guardianPlayerLinks` - Platform-level link between guardian and player
3. `orgGuardianProfiles` - Organization-scoped guardian profile

When implementing the removal logic, only the organization-scoped data (`orgGuardianProfiles`) was being cleaned up. The `guardianPlayerLinks`, while technically platform-level, also need cleanup when the linked player is enrolled in the organization being removed.

## Solution
Added cleanup logic in `removeFromOrganization` to:
1. Query all `guardianPlayerLinks` for the guardian identity being processed
2. For each link, check if the `playerIdentityId` has an enrollment in the organization being removed
3. Delete the link only if the player is enrolled in that specific organization

This preserves links to children in other organizations (correct behavior for multi-org scenarios) while cleaning up the links specific to the removed organization.

## Files Changed
- `packages/backend/convex/models/members.ts` - Added cleanup logic after orgGuardianProfiles deletion

## PR
https://github.com/NB-PDP-Testing/PDP/pull/394
