⏺ Here's a prompt you can paste into a new session:

---

Context: Working on the PlayerARC/PDP project at /Users/jkobrien/code/PDP. We've been implementing the  
 Adult Player Lifecycle PRD in phases, reviewing each phase after Ralph completes it and fixing QA issues
before committing.

Completed so far:

- Phase 3 (adult-player-phase3-matching) — fixed and pushed ✅
- Phase 4 (adult-player-phase4-wellness) — fixed and pushed ✅
- Phase 5 (adult-player-phase5-portal-sections) — fixed and pushed ✅

Current branch: ralph/adult-player-phase5-portal-sections

Phase 5 fixes applied (for reference):

- CRITICAL: Passport sharing ownership transferred to player on account claim (claimPlayerAccount in
  playerGraduations.ts)
- CRITICAL: "Player-reported" badge added to coach injury cards
- CRITICAL: GDPR data export now has confirmation dialog with JSON + CSV options
  (player/settings/page.tsx)
- CRITICAL: assemblePlayerDataExport now resolves org names via Better Auth adapter instead of exposing
  internal IDs
- WARN: Added PolarGrid to radar chart in player/progress/page.tsx
- WARN: Eliminated N+1 in getCoachFeedbackForPlayer with Promise.all

Next step: Prep Phase 6 for Ralph and run pre-flight check.

PRD file: scripts/ralph/prds/AdultPlayerLifeCycle/adult-player-phase6-multi-role.prd.json
Copy to: scripts/ralph/prd.json
Then run: bash scripts/ralph/validate-prd.sh scripts/ralph/prd.json
Then run: bash scripts/ralph/preflight.sh

After Ralph completes Phase 6, run the QA review and fix all issues as per the established pattern (run
QA agent → fix criticals and warnings → type check → lint → commit and push).
