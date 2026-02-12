## Summary

Team-level voice notes (e.g. team performance) are correctly classified and displayed on the main desktop site, but the **review microsite** incorrectly renders them under an "Unmatched Players" section with a "Search for Player" dropdown — forcing the reviewer to select a player even though the note is team-related, not player-related.

## Root Cause Area

**This is NOT a voice classification issue.** The AI classification pipeline is working correctly:
- Voice note is submitted about team performance
- It is picked up and classified correctly
- On the main desktop site under Voice Notes, it displays correctly with category "Performance" and scope "Team Performance"

**The bug is in the review microsite rendering logic.** The microsite does not account for team-level notes and treats all claims/insights as player-scoped, forcing them into the unmatched player resolution flow.

## Steps to Reproduce

1. Submit a WhatsApp voice message about team performance (e.g. "The team did really well at training today, their passing was excellent")
2. Wait for the message to be processed and classified
3. View the voice note on the **main desktop site** under Voice Notes — observe it displays correctly as team performance, category "Performance"
4. Open the **review microsite** link for the same voice note
5. Observe the note appears under an "Unmatched Players" section with a "Search for Player" dropdown

## Expected Behavior

Team-level voice notes should be displayed on the review microsite as team-level items — no player search dropdown, no unmatched player section. The microsite should respect the team-level scope the same way the main site does.

## Actual Behavior

The review microsite puts team-level notes under "Unmatched Players" and shows a "Search for Player" dropdown, requiring the user to assign a player to what is inherently a team-level observation.

## What Works Correctly

- WhatsApp message ingestion
- Voice note classification (team performance correctly identified)
- Category assignment (Performance)
- Main desktop site display (correct team-level rendering)

## What Is Broken

- Review microsite rendering of team-level notes
- Microsite assumes all voice note claims are player-scoped
- Team-level notes forced into unmatched player resolution flow
