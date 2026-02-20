# MCP Integration Plan for PlayerARC

## Executive Summary

This document analyzes what Model Context Protocol (MCP) integration could bring to PlayerARC **on top of** the existing WhatsApp/voice notes infrastructure. After reviewing all current code, this plan focuses on genuine value-adds rather than duplicating existing functionality.

**Key Insight**: PlayerARC already has a sophisticated WhatsApp integration via Twilio Business API. MCP is NOT about replacing this - it's about exposing PlayerARC's data and capabilities to the broader AI agent ecosystem.

---

## Current State Analysis

### What PlayerARC Already Has (Comprehensive)

Based on complete code review of the backend:

#### WhatsApp Integration (`packages/backend/convex/actions/whatsapp.ts`)
- **Twilio webhook processing** - Full message lifecycle handling
- **Phone-to-coach matching** - Normalized phone lookup across Better Auth users
- **Multi-org detection** - 8 resolution strategies:
  1. Single org (direct)
  2. Explicit mention ("@Grange", "for Grange:")
  3. Team name match
  4. Age group match (u12, under-14, twelves)
  5. Sport match (soccer, GAA, hurling)
  6. Player name match (unique to one org)
  7. Coach name match (assistant coaches)
  8. Session memory (2-hour context)
- **Audio download/storage** - Twilio Basic Auth → Convex storage
- **Trust-based auto-apply** - Levels 0-3 with safe/sensitive categories
- **WhatsApp replies** - Formatted results via Twilio REST API

#### Voice Notes Pipeline (`packages/backend/convex/actions/voiceNotes.ts`)
- **Multi-source ingestion** - app_recorded, app_typed, whatsapp_audio, whatsapp_text
- **AI transcription** - OpenAI Whisper via configurable model
- **Insight extraction** - Structured Zod schema with player/team matching
- **Confidence scoring** - 0.0-1.0 AI confidence per insight
- **Auto-apply engine** - Category-based with trust level gates
- **Parent summary generation** - Anthropic Claude for parent-friendly text

#### Data Model (`packages/backend/convex/schema.ts`)
- **whatsappMessages** - Full message tracking with status lifecycle
- **whatsappSessions** - 2-hour context memory per phone
- **whatsappPendingMessages** - 24-hour expiry for multi-org clarification
- **voiceNotes** - Core note storage with transcription/insights
- **voiceNoteInsights** - Queryable insight table with confidence
- **autoAppliedInsights** - Audit trail with undo capability
- **aiModelConfig** - Platform/org-level AI model configuration

#### Frontend
- **Voice notes dashboard** - 7 tabs for coaching workflow
- **AI config UI** - Platform staff model management
- **Feature flags** - PostHog-gated WhatsApp rollout
- **Trust level UI** - Coach preference management

### What PlayerARC Does NOT Have

1. **External AI agent access** - No way for Claude Desktop, Cursor, or custom agents to query player data
2. **Cross-application orchestration** - Cannot combine PlayerARC with calendar, external scouting tools, etc.
3. **Conversational data exploration** - Coaches can't ask natural language questions about their data
4. **Programmatic integration** - No API for third-party tools to interact with voice notes
5. **Proactive agent workflows** - No way to trigger external AI analysis on player trends

---

## MCP Value Proposition

### What MCP Is NOT For PlayerARC

- **NOT a replacement for Twilio** - Keep using WhatsApp Business API
- **NOT WhatsApp Web bridging** - That violates TOS and isn't needed
- **NOT duplicating existing AI pipelines** - Whisper/GPT-4/Claude already integrated

### What MCP IS For PlayerARC

**MCP exposes PlayerARC as an AI-native data platform** that external agents can query and interact with.

Think of it as: **"SQL for AI Agents"** - A standardized protocol for AI assistants to read your data, invoke your actions, and follow your workflow templates.

---

## MCP Primitives Mapped to PDP Domain

### 1. Resources (Data AI Can Read)

| Resource URI | Description | Data Source |
|--------------|-------------|-------------|
| `playerarc://orgs/{orgId}/voice-notes/recent` | Last N voice notes for org | `voiceNotes` table |
| `playerarc://orgs/{orgId}/voice-notes/{noteId}` | Single voice note with insights | `voiceNotes` + insights |
| `playerarc://orgs/{orgId}/players` | All players in organization | `orgPlayerEnrollments` |
| `playerarc://orgs/{orgId}/players/{playerId}/insights` | All insights for a player | `voiceNoteInsights` by player |
| `playerarc://orgs/{orgId}/players/{playerId}/passport` | Full player passport | Composite query |
| `playerarc://orgs/{orgId}/teams` | Teams with roster counts | `team` + counts |
| `playerarc://orgs/{orgId}/teams/{teamId}/observations` | Team-level observations | `teamObservations` |
| `playerarc://orgs/{orgId}/coaches/{coachId}/pending` | Pending insights for review | `voiceNoteInsights` by status |
| `playerarc://orgs/{orgId}/whatsapp/messages` | Recent WhatsApp messages | `whatsappMessages` |
| `playerarc://orgs/{orgId}/parent-summaries/pending` | Summaries awaiting approval | Parent summary queue |

### 2. Tools (Actions AI Can Invoke)

| Tool Name | Description | Backend Mapping |
|-----------|-------------|-----------------|
| `search_voice_notes` | Search notes by content/player/date | New query with full-text search |
| `get_player_development_summary` | Comprehensive player report | Composite query (passport + insights + goals) |
| `apply_insight` | Apply a pending insight | `voiceNotes.updateInsightStatus` |
| `dismiss_insight` | Dismiss an insight with reason | `voiceNotes.updateInsightStatus` |
| `approve_parent_summary` | Approve summary for delivery | Existing approval mutation |
| `create_voice_note` | Create typed voice note | `voiceNotes.createTypedNote` |
| `get_coach_trust_level` | Query coach's trust level | `coachTrustLevels.getCoachTrustLevel` |
| `list_unmatched_insights` | Get insights needing player assignment | Query by status |
| `assign_player_to_insight` | Fix unmatched player | Update insight with playerId |
| `get_team_trends` | AI-analyzed team trends over time | New analytics query |
| `compare_players` | Side-by-side player comparison | Existing comparison logic |

### 3. Prompts (Workflow Templates)

| Prompt Name | Description | Use Case |
|-------------|-------------|----------|
| `weekly_player_review` | Template for reviewing player week | Coach prep for 1:1s |
| `team_performance_analysis` | Template for team-level insights | Post-match analysis |
| `parent_communication_draft` | Template for parent messages | Beyond auto-generated summaries |
| `injury_followup_checklist` | Template for return-to-play | Safety workflow |
| `development_goal_check` | Template for goal progress review | Milestone tracking |

---

## Genuine Value-Adds Over Current Implementation

### 1. Natural Language Data Exploration

**Current**: Coaches navigate UI tabs, click filters, view individual records
**With MCP**: Coaches ask Claude Desktop:

> "What did I say about Sarah's tackling over the last month?"

> "Which U14 players have shown the most improvement in November?"

> "Show me all injury mentions from last week's training sessions"

**Implementation**: MCP Resources + Tools enable conversational queries without building a chat UI.

### 2. Cross-Application Workflows

**Current**: PlayerARC is a silo - data doesn't flow to other tools
**With MCP**:

```
Coach in Cursor IDE:
"I'm planning next week's training. What skills should I focus on
based on recent voice notes for the U12s?"

→ Cursor calls PlayerARC MCP server
→ Gets recent U12 insights
→ AI synthesizes training recommendations
```

Or with a calendar MCP server:
```
"Schedule a parent meeting for any player I mentioned injuries for this week"
→ PlayerARC MCP: Get injury insights
→ Calendar MCP: Create meetings
→ Combined workflow
```

### 3. Bulk Operations via AI

**Current**: Apply insights one by one in UI
**With MCP**:

> "Apply all skill_progress insights from my last 3 voice notes that have confidence > 0.8"

The AI agent calls `apply_insight` tool in a loop with appropriate filters.

### 4. Custom Agent Integration

**Current**: Only WhatsApp → PlayerARC flow
**With MCP**: Any MCP client can interact:

- **Claude Desktop** for coaches
- **Cursor** for technical staff
- **Custom Python scripts** for analytics
- **Zapier/Make** (if MCP adapters emerge)
- **Other coaching tools** that adopt MCP

### 5. Proactive Intelligence (Future)

**Current**: Reactive - process what coaches send
**With MCP + Scheduler**:

```
Daily job:
→ Query PlayerARC MCP for players with no insights in 2 weeks
→ Generate "Players needing attention" report
→ Send via WhatsApp (using existing Twilio integration)
```

### 6. Enhanced Parent Communication

**Current**: Auto-generated summaries require coach approval
**With MCP**: AI agent could:

1. Read pending summaries via MCP Resource
2. Cross-reference with player's development goals
3. Enhance summary with goal progress context
4. Present to coach for approval

### 7. Multi-Org Intelligence (Respecting Boundaries)

**Current**: Each org is siloed (correctly)
**With MCP + Proper Auth**: Platform staff could:

> "Which organizations have the highest voice note adoption this month?"

Query aggregates without accessing individual player data.

---

## Architecture Design

### Option A: Convex HTTP Actions as MCP Server

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Clients                          │
│  (Claude Desktop, Cursor, Custom Agents)                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + JSON-RPC (MCP Protocol)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Convex HTTP Routes (New)                   │
│                                                         │
│  POST /mcp/resources/list                               │
│  POST /mcp/resources/read                               │
│  POST /mcp/tools/list                                   │
│  POST /mcp/tools/call                                   │
│  POST /mcp/prompts/list                                 │
│  POST /mcp/prompts/get                                  │
│                                                         │
│  Auth: Bearer token (Better Auth session)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Existing Convex Backend                    │
│                                                         │
│  voiceNotes queries/mutations                           │
│  player enrollment queries                              │
│  team queries                                           │
│  whatsappMessages queries                               │
│  coachTrustLevels queries                               │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- Uses existing Convex infrastructure
- Real-time subscriptions possible
- Auth already solved (Better Auth)
- Type-safe with Convex validators

**Cons**:
- MCP protocol is typically stdio or SSE-based
- May need adapter layer

### Option B: Standalone MCP Server (Node.js/TypeScript)

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Clients                          │
└────────────────────┬────────────────────────────────────┘
                     │ stdio / SSE (MCP Protocol)
                     ▼
┌─────────────────────────────────────────────────────────┐
│           PlayerARC MCP Server (New Package)            │
│           packages/mcp-server/                          │
│                                                         │
│  - Uses @modelcontextprotocol/sdk                       │
│  - Connects to Convex via ConvexHttpClient              │
│  - Implements Resources, Tools, Prompts                 │
│  - Handles auth via API tokens                          │
└────────────────────┬────────────────────────────────────┘
                     │ Convex HTTP API
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Existing Convex Backend                    │
│  (Add internal queries for MCP consumption)             │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- Clean separation of concerns
- Standard MCP SDK patterns
- Easier testing in isolation
- Can run locally for development

**Cons**:
- Another deployment target
- Need to manage API tokens
- Slight latency increase

### Recommendation: Option B (Standalone Server)

For PlayerARC, Option B is better because:
1. MCP servers are typically long-running processes (not request/response)
2. Cleaner separation allows independent versioning
3. Easier for coaches to run locally with Claude Desktop
4. Can publish to MCP server registries

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Basic MCP server with read-only resources

**Tasks**:
1. Create `packages/mcp-server/` package
2. Install `@modelcontextprotocol/sdk`
3. Implement server bootstrap with stdio transport
4. Add authentication layer (API token validation)
5. Implement 3 initial resources:
   - `voice-notes/recent` - Last 50 voice notes
   - `players` - Organization roster
   - `players/{id}/insights` - Player insights
6. Test with Claude Desktop

**Files to Create**:
```
packages/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Server entry point
│   ├── auth.ts               # Token validation
│   ├── resources/
│   │   ├── index.ts          # Resource registry
│   │   ├── voice-notes.ts    # Voice note resources
│   │   └── players.ts        # Player resources
│   └── convex-client.ts      # Convex HTTP client wrapper
```

**Backend Changes**:
- Add internal queries optimized for MCP consumption
- Create API token table and validation

### Phase 2: Tools (Week 3-4)

**Goal**: Add action capabilities

**Tasks**:
1. Implement tool registry
2. Add 5 initial tools:
   - `search_voice_notes` - Full-text search
   - `apply_insight` - Apply pending insight
   - `dismiss_insight` - Dismiss with reason
   - `get_player_development_summary` - Composite report
   - `approve_parent_summary` - Approve for delivery
3. Add input validation with Zod schemas
4. Implement authorization checks (org membership, role)
5. Test tool invocations

**Backend Changes**:
- Add full-text search capability for voice notes
- Create composite query for player development summary

### Phase 3: Prompts & Polish (Week 5-6)

**Goal**: Workflow templates and production readiness

**Tasks**:
1. Implement prompt registry
2. Add 3 initial prompts:
   - `weekly_player_review`
   - `team_performance_analysis`
   - `parent_communication_draft`
3. Add comprehensive error handling
4. Implement rate limiting
5. Add audit logging for all MCP operations
6. Create installation documentation
7. Test with multiple MCP clients

### Phase 4: Advanced Features (Week 7-8)

**Goal**: Enhanced capabilities

**Tasks**:
1. Add SSE transport for web-based clients
2. Implement resource subscriptions (real-time updates)
3. Add bulk operation tools
4. Create organization-level aggregate resources (for platform staff)
5. Build simple admin UI for MCP token management

### Phase 5: Integration & Deployment (Week 9-10)

**Goal**: Production deployment and ecosystem integration

**Tasks**:
1. Package for npm publishing
2. Create Docker container option
3. Write comprehensive documentation
4. Submit to MCP server registries
5. Create example workflows for coaches
6. Monitor usage and gather feedback

---

## Security Model

### Authentication

```typescript
interface MCPAuthToken {
  tokenId: string;
  userId: string;           // Better Auth user ID
  organizationId: string;   // Scoped to single org
  scopes: MCPScope[];       // Granular permissions
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number;
}

type MCPScope =
  | "voice_notes:read"
  | "voice_notes:write"
  | "players:read"
  | "insights:read"
  | "insights:write"
  | "parent_summaries:read"
  | "parent_summaries:write"
  | "teams:read";
```

### Authorization

1. **Organization scoping** - All queries filtered by token's orgId
2. **Role-based access** - Check Better Auth membership role
3. **Scope validation** - Each tool/resource checks required scopes
4. **Audit trail** - Log all MCP operations with user/org context

### Data Boundaries

- **Never expose cross-org data** - Even to platform staff via MCP
- **Player data respects roles** - Parents only see their children
- **Sensitive insights gated** - Injury/behavior follow existing rules

---

## Cost-Benefit Analysis

### Costs

| Item | Estimate | Notes |
|------|----------|-------|
| Development | 8-10 weeks | Senior engineer time |
| Infrastructure | ~$50/month | Separate server if needed |
| Maintenance | 2-4 hours/month | Updates, bug fixes |
| Documentation | 1 week | Installation guides, examples |

### Benefits

| Benefit | Impact | Timeline |
|---------|--------|----------|
| Coach productivity | High | Immediate after launch |
| Platform stickiness | Medium | 3-6 months |
| Ecosystem positioning | High | 6-12 months |
| API monetization potential | Medium | Future option |
| Competitive differentiation | High | Immediate |

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Low MCP adoption | Medium | Focus on Claude Desktop first |
| Security vulnerabilities | Low | Thorough auth design, audit logging |
| Performance issues | Low | Caching, query optimization |
| Scope creep | Medium | Strict phase boundaries |

---

## Success Metrics

### Phase 1 (Foundation)
- MCP server connects to Claude Desktop
- 10+ successful resource reads in testing

### Phase 2 (Tools)
- 5 coaches using MCP tools weekly
- 100+ tool invocations per month

### Phase 3 (Prompts)
- 3+ workflow prompts actively used
- Positive feedback from beta coaches

### Phase 4+ (Scale)
- 50+ active MCP users
- Integration with 2+ external tools
- Community contributions to prompts/tools

---

## Appendix: Example MCP Interactions

### Example 1: Coach Queries Player Progress

```
Coach in Claude Desktop:
"How has Emma's passing improved over the last month?"

Claude → PlayerARC MCP:
resources/read: playerarc://orgs/org123/players/emma456/insights

PlayerARC MCP → Response:
{
  "insights": [
    {
      "date": "2026-01-15",
      "category": "skill_progress",
      "title": "Passing accuracy improving",
      "description": "Emma completed 8/10 long passes in training",
      "confidence": 0.85
    },
    {
      "date": "2026-01-22",
      "category": "skill_rating",
      "title": "Passing rating increased to 4",
      "description": "Coach upgraded passing from 3 to 4",
      "confidence": 0.95
    }
  ]
}

Claude → Coach:
"Based on your voice notes, Emma's passing has shown consistent
improvement this month. On Jan 15, you noted she completed 8/10
long passes in training. A week later, you upgraded her passing
rating from 3 to 4. Would you like me to generate a parent summary
about this progress?"
```

### Example 2: Bulk Insight Processing

```
Coach in Claude Desktop:
"Apply all skill insights from yesterday's training notes that
have confidence above 0.8"

Claude → PlayerARC MCP:
tools/call: search_voice_notes
  { date: "2026-01-30", type: "training" }

PlayerARC MCP → Response:
{ noteIds: ["note1", "note2", "note3"] }

Claude → PlayerARC MCP (loop):
tools/call: apply_insight
  { noteId: "note1", insightId: "insight1" }

tools/call: apply_insight
  { noteId: "note1", insightId: "insight2" }

(skips insight3 - confidence 0.65)

Claude → Coach:
"I've applied 4 skill insights from yesterday's training:
- Sarah: Tackling improved (confidence 0.85)
- John: Shooting accuracy (confidence 0.92)
- Emma: Passing (confidence 0.88)
- Team U14: Set piece execution (confidence 0.81)

1 insight was skipped (confidence below 0.8). Would you like
to review it manually?"
```

### Example 3: Cross-Tool Workflow

```
Coach in Claude Desktop (with Calendar MCP also connected):
"Schedule 15-minute check-ins with parents of players I mentioned
injuries for this week"

Claude → PlayerARC MCP:
tools/call: search_voice_notes
  { dateFrom: "2026-01-24", category: "injury" }

PlayerARC MCP → Response:
{
  "insights": [
    { "playerName": "Jack", "parentEmail": "jack.parent@email.com" },
    { "playerName": "Sophie", "parentEmail": "sophie.parent@email.com" }
  ]
}

Claude → Calendar MCP:
tools/call: create_event
  { title: "Jack injury check-in", attendee: "jack.parent@email.com" }

tools/call: create_event
  { title: "Sophie injury check-in", attendee: "sophie.parent@email.com" }

Claude → Coach:
"I've scheduled two 15-minute parent check-ins:
- Jack's parent: Tomorrow 3pm
- Sophie's parent: Tomorrow 3:30pm

Both are regarding injury mentions from this week's sessions."
```

---

## Conclusion

MCP integration for PlayerARC is **not about replacing existing functionality** - it's about exposing the platform's sophisticated data model and AI pipelines to the broader AI agent ecosystem.

The existing WhatsApp/Twilio integration handles **inbound** coach communication excellently. MCP adds:
1. **Outbound** data access for AI agents
2. **Programmatic** interaction with insights and summaries
3. **Cross-application** workflow orchestration
4. **Natural language** data exploration

With 8-10 weeks of development, PlayerARC could become one of the first sports platforms with native AI agent integration, positioning it ahead of competitors as MCP adoption grows.
