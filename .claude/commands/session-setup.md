Run a session setup check before starting any implementation work. Execute all of the following steps and present a concise summary:

## 1. Git Status
- Run `git branch --show-current` to show the active branch
- Run `git status --short` to show uncommitted changes
- Run `git log --oneline -3` to show recent commits on this branch

## 2. Environment Check
- Identify whether we're on a feature branch, main, or a Ralph branch
- If the branch name suggests a specific feature/phase, note it
- ASK the user to confirm target environment (dev/production) before any database operations later

## 3. PRD Context
- Check if there's an active PRD for the current branch by looking in `scripts/ralph/prds/` for matching files
- If found, summarize the phase and remaining stories
- If not found, note that no PRD is active

## 4. Pending Feedback
- Check `scripts/ralph/agents/output/feedback.md` for any unresolved items
- Report count of pending feedback items if any

## 5. Summary
Present a compact status block like:
```
Branch:      feat/voice-gateways-v2
Environment: [ask user before DB ops]
Uncommitted: 3 files modified
Last commit: fix: address Phase 6 review findings
PRD:         Phase 7 - 2/5 stories complete
Feedback:    12 items pending
```

Then ask: "What are we working on this session?"
