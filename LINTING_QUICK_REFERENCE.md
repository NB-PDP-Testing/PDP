# Linting Quick Reference for Developers

**TL;DR:** Fix linting issues in files you modify. CI will catch new issues.

---

## 🚀 Before You Commit

### 1. Check Your Changed Files
```bash
# Check all changed files
npx biome check --changed .

# Check specific file
npx biome check path/to/your/file.ts

# Check specific directory
npx biome check apps/web/src/app/orgs
```

### 2. Auto-Fix What You Can
```bash
# Auto-fix specific file
npx biome check --write path/to/your/file.ts

# Review the changes
git diff path/to/your/file.ts
```

### 3. Manually Fix Remaining Issues
See "Priority Guide" below

---

## 📋 Priority Guide

When fixing linting issues in a file, use this order:

### 🔴 Priority 1: Remove `any` Types
**Rule:** `noExplicitAny`
**Impact:** High - Type safety

```typescript
// ❌ Bad
function getData(input: any) {
  return input.value;
}

// ✅ Good
interface DataInput {
  value: string;
}
function getData(input: DataInput) {
  return input.value;
}
```

### 🟡 Priority 2: Simplify Complex Functions
**Rule:** `noExcessiveCognitiveComplexity`
**Impact:** Medium - Maintainability

**Fix:** Break down into smaller functions
- Extract repeated logic into helpers
- Use early returns to reduce nesting
- Simplify nested conditionals

### 🟢 Priority 3: Accessibility
**Rules:** `useButtonType`, `noLabelWithoutControl`, `useKeyWithClickEvents`
**Impact:** Medium - User experience

```tsx
// ❌ Bad
<button>Click me</button>

// ✅ Good
<button type="button">Click me</button>

// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button type="button" onClick={handleClick}>Click me</button>
```

### 🟢 Priority 4: Style Improvements
**Rules:** `useBlockStatements`, `useConsistentTypeDefinitions`, etc.
**Impact:** Low - Code consistency

```typescript
// ❌ Bad
if (condition) doSomething();

// ✅ Good
if (condition) {
  doSomething();
}

// ❌ Bad
interface User {
  name: string;
}

// ✅ Good
type User = {
  name: string;
};
```

---

## 🚫 What NOT to Do

### ❌ Don't Ignore Linting Errors
```typescript
// ❌ Bad - Using biome-ignore
// biome-ignore lint/suspicious/noExplicitAny: too hard to fix
function getData(input: any) { ... }

// ✅ Good - Fix the issue
function getData(input: DataInput) { ... }
```

### ❌ Don't Add New `any` Types
```typescript
// ❌ Bad - Creates new linting debt
const data: any = await fetchData();

// ✅ Good - Use proper types
const data: UserData = await fetchData();

// ✅ Also Good - Use unknown if type is truly unknown
const data: unknown = await fetchData();
if (isUserData(data)) {
  // now data is UserData
}
```

### ❌ Don't Fix Unrelated Files
- Only fix linting issues in files you're modifying
- Don't create "linting fix only" PRs (unless optional sprint)
- Include linting fixes as part of your feature/bug fix PR

---

## 💡 Common Issues & Quick Fixes

### Issue: "Unexpected any"
```typescript
// ❌ Problem
function process(data: any) { ... }

// ✅ Quick fix: Define a type
type ProcessData = {
  id: string;
  value: number;
};
function process(data: ProcessData) { ... }

// ✅ Alternative: Use unknown
function process(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Type guard here
  }
}
```

### Issue: "Use block statements"
```typescript
// ❌ Problem
if (condition) return;

// ✅ Quick fix: Add braces
if (condition) {
  return;
}
```

### Issue: "Use type instead of interface"
```typescript
// ❌ Problem
interface User {
  name: string;
}

// ✅ Quick fix: Convert to type
type User = {
  name: string;
};
```

### Issue: "Unexpected non-null assertion"
```typescript
// ❌ Problem
const value = data!.property;

// ✅ Quick fix: Use optional chaining
const value = data?.property;

// ✅ Or: Add proper null check
if (data) {
  const value = data.property;
}
```

### Issue: "Add button type attribute"
```tsx
// ❌ Problem
<button onClick={handleClick}>Submit</button>

// ✅ Quick fix: Add type attribute
<button type="button" onClick={handleClick}>Submit</button>

// Note: Use type="submit" for form submissions
<button type="submit">Submit Form</button>
```

---

## 🔧 Useful Commands

### Check Commands
```bash
# Check all files (see full issue count)
npx biome check .

# Check changed files only
npx biome check --changed .

# Check specific pattern
npx biome check "apps/web/src/**/*.ts"

# Get statistics
npx biome check . 2>&1 | tail -5
```

### Fix Commands
```bash
# Auto-fix specific file (safe fixes only)
npx biome check --write path/to/file.ts

# Auto-fix all changed files
npx biome check --write --changed .

# See what would be fixed without applying
npx biome check --write --changed . --dry-run
```

### Type Check
```bash
# Always run after linting fixes
npm run check-types

# Run build to ensure nothing broke
npm run build
```

---

## 📊 Current Status

**Total Issues:** 1,727 (as of 2026-01-02)
- 971 Errors
- 745 Warnings
- 11 Infos

**Target:** 10-15% reduction per month through natural file modifications

**Top Issues:**
1. `noExplicitAny` - 352 issues (20%)
2. `useBlockStatements` - 299 issues (17%)
3. `noIncrementDecrement` - 226 issues (13%)
4. `noExcessiveCognitiveComplexity` - 130 issues (8%)
5. `useConsistentTypeDefinitions` - 98 issues (6%)

---

## ✅ Pre-Commit Checklist

Before committing code that modifies existing files:

- [ ] Ran `npx biome check --changed .`
- [ ] Fixed linting issues in modified files
- [ ] Prioritized removing `any` types
- [ ] Ran `npm run check-types` (passed)
- [ ] Tested changes locally
- [ ] No new linting warnings introduced

---

## 🆘 Need Help?

### CI Failed on Linting?
```bash
# CI error will show which files have issues
# Run locally to see details:
npx biome check path/to/failing/file.ts

# Fix the issues and commit
git add path/to/failing/file.ts
git commit --amend --no-edit
git push --force-with-lease
```

### Too Many Issues in One File?
**Option 1:** Fix in stages
- Commit feature changes first
- Fix linting in separate commit
- Both in same PR

**Option 2:** Get help
- Ask team member to review
- Pair program on complex fixes
- Check LINTING_COMPREHENSIVE_PLAN.md for examples

### Not Sure How to Fix an Issue?
1. Read the Biome error message (usually helpful)
2. Check this guide for common issues
3. Search: "biome [rule-name] fix"
4. Ask in team chat
5. Check LINTING_COMPREHENSIVE_PLAN.md

---

## 🎯 Optional: Weekend Cleanup Sprint

**Got 1-3 hours free? Pick a focused area:**

### Sprint 1: API Routes (1-2 hours)
```bash
npx biome check apps/web/src/app/api
# Fix all `any` types in API routes
```

### Sprint 2: Shared Components (2-3 hours)
```bash
npx biome check apps/web/src/components
# Fix prop types, remove `any`
```

### Sprint 3: Accessibility (2-3 hours)
```bash
# Search for specific issues
npx biome check . 2>&1 | grep "useButtonType"
# Fix button types, ARIA labels
```

### Sprint 4: Backend (3-4 hours)
```bash
npx biome check packages/backend/convex/models
# Remove `any` types from backend logic
```

---

## 📚 More Information

- **Full Plan:** `LINTING_COMPREHENSIVE_PLAN.md`
- **CI Status:** `CI_CD_STATUS.md`
- **Biome Docs:** https://biomejs.dev/
- **Rules Reference:** https://biomejs.dev/linter/rules/

---

**Remember:** Small, consistent improvements > Big, risky changes

Fix linting as you go, and we'll get there together! 🚀
