
## Auto Quality Check - 2026-02-12 23:15:06
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplates.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:15:10
### File: /Users/jkobrien/code/PDP/packages/backend/convex/lib/import/mapper.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:15:11
### File: /Users/jkobrien/code/PDP/packages/backend/convex/lib/import/parser.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:17:45
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplates.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:20:12
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplates.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:20:22
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplates.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-12 23:20:32
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplates.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Code Review Gate - 2026-02-12 23:24:34

🔍 **Code Review: BLOCK** (1 critical, 1 high, 0 medium) - 🚨 **CRITICAL**: `.filter()` usage in `packages/backend/convex/models/importTemplates.ts` - use `.withIndex()` instead\n  ```\n262:      return templates.filter((t) => t.isActive);
273:      return templates.filter((t) => t.isActive);
280:    return templates.filter((t) => t.isActive);\n  ```\n- ⚠️ **HIGH**: Mutation in `packages/backend/convex/models/importTemplates.ts` may be missing auth check\n\n**Verdict:** BLOCK - Fix CRITICAL/HIGH issues before continuing

