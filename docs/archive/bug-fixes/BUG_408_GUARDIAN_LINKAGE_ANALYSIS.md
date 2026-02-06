# Bug #408 Analysis: Guardian Linkage Errors on Login

## Summary

After investigation, this bug appears to be caused by **running on an outdated local branch** rather than an active bug in the current main branch.

## Error Details

```
Error: This user is already linked to another guardian identity
at handler (../../convex/models/guardianIdentities.ts:1051:8)
```

## Root Cause Analysis

The error occurs when:
1. A user account is **already linked** to guardian identity A (from previous testing)
2. The system finds another **unclaimed** guardian identity B matching their email
3. The `guardian_claim` onboarding task appears for identity B
4. When the user tries to claim B, the `linkGuardianToUser` mutation rejects it because the user is already linked to A

This is **intentional behavior** to prevent data corruption (one user should not be linked to multiple guardian identities).

## Relevant Fixes Already in Main

The following fixes have been merged to main and address related guardian linking issues:

| Commit | Date | Description |
|--------|------|-------------|
| `c8d117ef` | Jan 24, 2026 | Handle guardian email conflicts with reassignment flow |
| `f251d4f3` | Jan 29, 2026 | Fix onboarding guardian assignment and role fixes |

## Likely Cause

The reporter is running on `localhost:3000` with:
- An **old local branch** that doesn't have recent fixes
- **Stale test data** where the test account is already linked to a guardian identity from previous testing sessions

## Recommended Actions

1. **Pull latest main branch:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Clear test account data** - either:
   - Use a fresh test account that has no prior guardian links
   - Or manually remove the existing guardian link from the test account in the database

3. **Restart the dev server** and test again

4. If the issue persists after these steps, please provide:
   - The exact git commit hash you're running (`git rev-parse HEAD`)
   - The test account email being used
   - Screenshot of the full error with stack trace

## Secondary Issue Mentioned

> "if a user is clear of roles, i am not certain those links are being cleared"

This is a separate concern about whether removing the parent role clears guardian-player links. This was addressed in PR #382:
- Commit `2fdbb121` - "Clean up guardian-player links when parent removed from org"

This fix is also in main, so pulling the latest branch should resolve this as well.

---

*Analysis by Claude Code - Feb 1, 2026*
