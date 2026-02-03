# Better Auth User Data Patterns

This document provides the correct patterns for querying and displaying Better Auth user data in Convex queries. Follow these patterns to avoid common mistakes.

## ⚠️ Critical: Better Auth User Object Structure

Better Auth user objects have these key fields:
- `_id` - The user's ID (NOT `id`, NOT `userId`)
- `name` - The user's display name (NOT `firstName`/`lastName`)
- `email` - The user's email address

```typescript
// ✅ CORRECT: Better Auth user fields
{
  _id: "j123abc...",
  name: "John Smith",
  email: "john@example.com",
  // ... other fields
}

// ❌ WRONG: These fields DO NOT EXIST
{
  id: "...",           // Does not exist, use _id
  firstName: "...",    // Does not exist, use name
  lastName: "...",     // Does not exist, use name
}
```

## Pattern 1: Batch Fetch Users with Lookup Map

Use this pattern when you need to enrich data with user information:

```typescript
// Step 1: Collect unique user IDs
const uniqueUserIds = [...new Set(items.map(item => item.userId))];

// Step 2: Batch fetch all users at once
const usersData = await Promise.all(
  uniqueUserIds.map((userId) =>
    ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "_id",        // ✅ Use "_id", not "userId"
          value: userId,
          operator: "eq",
        },
      ],
    })
  )
);

// Step 3: Create lookup map using _id field
const userMap = new Map<string, BetterAuthDoc<"user">>();
for (const user of usersData) {
  if (user) {
    userMap.set(user._id, user);  // ✅ Use user._id, not user.id
  }
}

// Step 4: Enrich data with user info (synchronous, no await!)
const enriched = items.map((item) => {
  const user = userMap.get(item.userId);
  const displayName = user
    ? user.name || user.email || "Unknown"  // ✅ Use user.name, not firstName/lastName
    : "Unknown";

  return {
    ...item,
    userName: displayName,
    userEmail: user?.email,
  };
});
```

## Pattern 2: Display Name with Fallbacks

Always use this pattern for displaying user names:

```typescript
// ✅ CORRECT: Use name field with fallbacks
const displayName = user
  ? user.name || user.email || "Unknown"
  : "Unknown";

// ❌ WRONG: These patterns are incorrect
const displayName = `${user.firstName} ${user.lastName}`;  // Fields don't exist
const displayName = user.name || "Unknown";                // Missing email fallback
```

## Pattern 3: Query User by ID

When looking up a single user:

```typescript
// ✅ CORRECT: Query by _id field
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [
    {
      field: "_id",      // ✅ Use "_id"
      value: userId,
      operator: "eq",
    },
  ],
});

// ❌ WRONG: Querying by userId always returns null
const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [
    {
      field: "userId",   // ❌ This field is always null in this app
      value: userId,
      operator: "eq",
    },
  ],
});
```

## Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct |
|-----------|-----------|
| `user.id` | `user._id` |
| `user.firstName`, `user.lastName` | `user.name` |
| `field: "userId"` in query | `field: "_id"` in query |
| `user.name \|\| "Unknown"` | `user.name \|\| user.email \|\| "Unknown"` |
| `userMap.set(user.id, user)` | `userMap.set(user._id, user)` |

## Examples in Codebase

These files demonstrate correct patterns:

- `packages/backend/convex/models/teamCollaboration.ts:184` - Correct map population
- `packages/backend/convex/models/passportEnquiries.ts:62` - Correct name display
- `packages/backend/convex/models/coaches.ts:499` - Correct _id usage (after fix)

## Why This Matters

**Incorrect field usage results in:**
- "Unknown" displayed instead of actual names
- Empty lookup maps (no user data found)
- Silent failures (no error, just missing data)

**Testing checklist when querying user data:**
1. Map populated with `user._id`? ✅
2. Display name uses `user.name`? ✅
3. Fallback to `user.email` included? ✅
4. Query uses `field: "_id"`? ✅

---

**Last Updated**: February 3, 2026
**Related Issues**: US-P9-057 coach name display bug
