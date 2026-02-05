Show the current PRD phase status and story breakdown.

## Instructions

1. Read `scripts/ralph/prd.json`
2. Extract and display:
   - **Phase name** (from `branchName`)
   - **Total stories** and how many are completed (where `passes == true`)
   - **Story breakdown** - list each story with its ID, title, and status (completed or pending)
3. Check if the phase has been architecturally reviewed by looking in `.claude/.reviewed-phases`
4. Display a summary like:

```
PRD STATUS
Phase:     [phase-name]
Stories:   X / Y completed (Z pending)
Architect: Reviewed / Not reviewed

User Stories:
  [done] US-XXX: Title
  [pending] US-YYY: Title
  ...
```

5. Remind the user of available commands:
   - `/architect-review` - Run architectural analysis
   - `/review-security` - Run security review
   - `/document-phase` - Generate phase documentation
