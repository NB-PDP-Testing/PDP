# Linting Fix Priorities

When you encounter linting issues, fix in this priority order:

## Priority 1: Type Safety (MUST FIX)

These prevent runtime errors and improve code quality:

| Rule | Issue | Fix |
|------|-------|-----|
| `noExplicitAny` | Using `any` type | Replace with proper type definition |
| `noEvolvingTypes` | Type changes over time | Add explicit type annotation |
| `useAwait` | Missing await | Add `await` to async calls |
| `noImplicitAnyLet` | `let x;` without type | Add type: `let x: Type;` |

**Example Fix:**
```typescript
// Before
function process(data: any) { ... }

// After
interface ProcessData {
  id: string;
  values: number[];
}
function process(data: ProcessData) { ... }
```

## Priority 2: React Correctness (MUST FIX)

These prevent React bugs and warnings:

| Rule | Issue | Fix |
|------|-------|-----|
| `useExhaustiveDependencies` | Missing hook deps | Add deps or wrap in useCallback |
| `noChildrenProp` | Using children prop wrong | Use proper children pattern |
| `useHookAtTopLevel` | Hook in condition/loop | Move to top level |
| `noArrayIndexKey` | Using index as key | Use unique ID as key |

**Example Fix:**
```typescript
// Before - missing dependency
useEffect(() => {
  fetchData(userId);
}, []);

// After - correct dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## Priority 3: Accessibility (MUST FIX for UI)

These ensure the app is usable by everyone:

| Rule | Issue | Fix |
|------|-------|-----|
| `useButtonType` | Button without type | Add `type="button"` |
| `noLabelWithoutControl` | Label not linked | Add `htmlFor` and `id` |
| `useKeyWithClickEvents` | Click without keyboard | Add `onKeyDown` handler |
| `noSvgWithoutTitle` | SVG without title | Add `<title>` element |
| `noStaticElementInteractions` | Div with onClick | Use button or add role |

**Example Fix:**
```tsx
// Before
<button onClick={handleClick}>Submit</button>

// After
<button type="button" onClick={handleClick}>Submit</button>

// Before
<label>Name</label>
<input />

// After
<label htmlFor="name">Name</label>
<input id="name" />
```

## Priority 4: Complexity (SHOULD FIX)

These improve maintainability:

| Rule | Issue | Fix |
|------|-------|-----|
| `noExcessiveCognitiveComplexity` | Function too complex | Extract helpers, reduce nesting |
| `noNestedTernary` | Nested ? : operators | Use if/else or early returns |
| `noForEach` | Using .forEach() | Use for...of loop |

**Example Fix:**
```typescript
// Before - nested ternary
const status = isLoading ? "loading" : hasError ? "error" : "success";

// After - clear conditions
let status: string;
if (isLoading) {
  status = "loading";
} else if (hasError) {
  status = "error";
} else {
  status = "success";
}
```

## Priority 5: Performance (SHOULD FIX)

These improve runtime performance:

| Rule | Issue | Fix |
|------|-------|-----|
| `useTopLevelRegex` | Regex in function | Move to module level |
| `noAccumulatingSpread` | Spread in loop | Use push or concat |
| `useOptionalChain` | Multiple && checks | Use `?.` operator |

## Priority 6: Style (CAN AUTO-FIX)

These are often auto-fixable:

| Rule | Issue | Fix |
|------|-------|-----|
| `useBlockStatements` | Missing braces | Add `{ }` (auto-fix) |
| `useTemplate` | String concatenation | Use template literal (auto-fix) |
| `useConsistentArrayType` | Mixed array syntax | Standardize (auto-fix) |

**Auto-fix command:**
```bash
npx biome check --write path/to/file.tsx
```

## How to Fix Efficiently

1. **Run check on your file:**
   ```bash
   npx biome check path/to/file.tsx
   ```

2. **Auto-fix safe issues:**
   ```bash
   npx biome check --write path/to/file.tsx
   ```

3. **Manually fix remaining issues** following priority order above

4. **Verify fixes:**
   ```bash
   npx biome check path/to/file.tsx
   npm run check-types
   ```

## NEVER:

- Use `--unsafe` flag for mass auto-fixes (can break code)
- Add new `any` types
- Skip accessibility attributes
- Leave TypeScript errors unfixed
- Commit code that fails linting in files you modified
