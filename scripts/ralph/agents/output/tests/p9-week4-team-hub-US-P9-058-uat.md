# UAT Test: US-P9-058 - Insights Tab - AI-Generated Team Insights (Enhanced with Integrations)

> Auto-generated: 2026-02-03 10:36
> Status: ⏳ Pending Execution

## Story
Display insights from voice notes and AI analysis. Build on Activity Feed patterns. Integrate with Activity Feed, Overview Dashboard, and Voice Notes tab with bidirectional linking.

## Acceptance Criteria Checklist

- [ ] Backend: Create teamInsights table in schema
- [ ] Schema fields: _id, teamId, organizationId, type (voice-note/ai-generated/manual), title, summary, fullText (optional), voiceNoteId (optional), playerIds (array), topic (technical/tactical/fitness/behavioral/other), priority (high/medium/low), createdBy, createdAt, readBy (array of userIds who viewed)
- [ ] Backend: Add composite indexes: by_team_and_type, by_voice_note, by_team_and_date
- [ ] Backend: Create getTeamInsights query in packages/backend/convex/models/teams.ts
- [ ] Query uses batch fetch pattern: (1) Get insights by team, (2) Batch fetch voice notes, (3) Batch fetch player identities, (4) Map lookups, (5) Enrich with player names and voice note metadata
- [ ] Query supports pagination: cursor-based (50 items/page) like activity feed
- [ ] Query returns: { page, continueCursor, isDone } or array (backward compatible)
- [ ] Backend: Create mutations: createInsight, markAsRead
- [ ] Backend: Create action: generateInsightsFromVoiceNotes (AI processing - placeholder for now, just create sample insights)
- [ ] Backend: ACTIVITY FEED INTEGRATION - After insight creation, create teamActivityFeed entry
- [ ] Schema: Extend teamActivityFeed.actionType enum: Add v.literal('insight_generated')
- [ ] Schema: Extend teamActivityFeed.entityType enum: Add v.literal('team_insight')
- [ ] Mutation Pattern: await ctx.db.insert('teamActivityFeed', { organizationId, teamId, actorId, actorName, actionType: 'insight_generated', entityType: 'team_insight', entityId: insightId, summary: `Generated insight: ${title}`, priority: insightPriority === 'high' ? 'important' : 'normal', metadata: { insightTitle: title } })
- [ ] Backend: OVERVIEW INTEGRATION - Enhance getTeamOverviewStats query
- [ ] Add to return type: unreadInsights: v.number(), highPriorityInsights: v.number()
- [ ] Query counts insights where !readBy.includes(userId) and filters for priority === 'high'
- [ ] Frontend: Replace placeholder insights-tab.tsx with full implementation
- [ ] REUSE: Copy pagination logic from activity-feed-view.tsx
- [ ] Filter controls: Type tabs (All/Voice Notes/AI Insights/Manual), Player dropdown (All + player list), Topic dropdown (All/Technical/Tactical/Fitness/Behavioral), Sort (Newest/Oldest/Priority)
- [ ] REUSE: Copy list card pattern from activity-feed-view.tsx
- [ ] Insight card shows: Creator avatar + initials, Type icon (Mic=voice note, Sparkles=AI, FileText=manual), Insight title (bold), Summary text (2-3 lines, truncated), Related player badges (if any), Topic badge, Priority badge (high only), Timestamp (relative time)
- [ ] Insight card click → Open detail modal (show full text, voice note link if applicable, mark as read)
- [ ] Detail modal: If voiceNoteId exists, show 'View Source Voice Note' button → navigate to voice notes with highlight query param
- [ ] Detail modal: Optional 'Create Task from Insight' button → pre-fill create task modal with insight details (title, description from summary)
- [ ] Generate Insights button: Top right, triggers AI action (show loading toast, refresh on complete)
- [ ] Load More button: Bottom of list when more insights available (like activity feed)
- [ ] Empty states: 'No insights yet' (with Generate Insights CTA), 'No insights match filters'
- [ ] Loading state: List skeleton (5 items)
- [ ] Mobile responsive: Stacked cards on mobile, same layout on desktop
- [ ] OVERVIEW INTEGRATION: Update quick-stats-panel.tsx to show 'Unread Insights' stat
- [ ] Replace 'Upcoming Events' placeholder → 'Unread Insights' card with priority badge (e.g., '3 insights, 1 priority')
- [ ] Click Unread Insights stat → navigate to Insights tab with unread filter
- [ ] VOICE NOTES INTEGRATION: Update voice-notes tab to show insights badge on note cards
- [ ] Voice note card shows badge: 'X insights' if insights generated from this note
- [ ] Click badge or note → detail modal → Show 'View Generated Insights' button
- [ ] Type check passes: npm run check-types
- [ ] Visual verification with dev-browser (pagination works, filters work, detail modal works, activity feed shows insight events, overview shows insight count, voice notes show insights badge)

## Test Scenarios

### Happy Path
1. Navigate to the feature
2. Perform the primary action described in the story
3. Verify all acceptance criteria are met
4. **Expected:** Feature works as described

### Edge Cases
1. Test with empty/null values
2. Test with boundary values
3. Test rapid repeated actions
4. **Expected:** Graceful handling, no errors

### Error Handling
1. Test with invalid inputs
2. Test without proper permissions
3. Test with network issues (if applicable)
4. **Expected:** Clear error messages, no crashes

## Visual Verification
- [ ] UI matches design expectations
- [ ] Responsive on mobile (if applicable)
- [ ] Loading states are appropriate
- [ ] Error states are user-friendly

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
