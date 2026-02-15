# Voice Notes Performance Harness - PRD Package

**Project**: Voice Notes Performance Monitoring & Insights Tooling
**Issue**: [#495 - Voice Notes Performance Harness / Monitoring Tooling](https://github.com/NB-PDP-Testing/PDP/issues/495)
**Branch**: `feat/voice-monitor-harness`
**Status**: Planning Complete - Ready for Ralph Execution

---

## 📋 Executive Summary

Build a comprehensive monitoring and debugging harness for the Voice Notes v2 pipeline. This tool will enable platform staff to:

- **Monitor** voice notes flowing through the pipeline in real-time
- **Visualize** the end-to-end journey (artifact → claims → resolution → drafts → confirmation)
- **Analyze** performance metrics per stage (latency, costs, success rates)
- **Debug** stuck or failed voice notes
- **Track** model performance and guide A/B testing decisions
- **Alert** on degraded performance or errors

Think of this as "observability for voice notes" - the same way DataDog/New Relic monitor systems, but specifically designed for our voice processing pipeline.

---

## 🎯 Project Goals

### Problem Statement (Issue #495)

**Current Challenges:**
1. ❌ **Black box processing** - No visibility into what happens between voice note received and final draft
2. ❌ **Debugging is manual** - Have to query multiple tables, piece together timeline
3. ❌ **No performance insights** - Don't know which stages are slow or expensive
4. ❌ **Can't assess model quality** - No metrics on claim accuracy, resolution success
5. ❌ **No proactive monitoring** - Issues discovered reactively when users complain

### Solution: 7-Phase Monitoring Harness

| Phase | Name | Duration | Key Deliverables |
|-------|------|----------|------------------|
| **1** | MVP - Data Capture & Basic Views | 4-5 days | Event tables, list view, drill-down timeline |
| **2** | Flow Visualization | 3-4 days | Sankey diagram, timeline view, interactive drill-down |
| **3** | Performance Metrics & Analytics | 4-5 days | Cost tracking, success rates, quality metrics |
| **4** | Admin Dashboard UI | 5-6 days | Real-time dashboard at `/platform/voice-monitor` |
| **5** | Alerts & Monitoring | 3-4 days | Alert config, visual indicators, degradation detection |
| **6** | Model Performance & A/B Testing | 4-5 days | Model metrics, variant comparison, cohort analysis |
| **7** | Advanced Features | 4-5 days | Interactive retry, historical analysis, export |

**Total**: 27-33 days for complete harness

---

## 📁 File Structure

```
scripts/ralph/prds/voice-monitor-harness/
├── README.md                          # This file
├── PRD.json                           # Main PRD with all phases (9 phases: M1-M9)
├── CRITICAL_FIXES_APPLIED.md         # Documentation of all architectural fixes
├── context/
│   ├── MAIN_CONTEXT.md               # Project overview, architecture, v2 pipeline, patterns
│   └── PERFORMANCE_PATTERNS.md       # Mandatory performance patterns (N+1, pagination, counters)
├── phases/
│   ├── PHASE_M1.json                 # M1: Backend Instrumentation (event logging, counters)
│   ├── PHASE_M2.json                 # M2: Metrics & Aggregation (snapshots, crons)
│   ├── PHASE_M3.json                 # M3: Retry Operations (manual retry mutations)
│   ├── PHASE_M4.json                 # M4: Pipeline Alerts (health checks, anomaly detection)
│   ├── PHASE_M5.json                 # M5: Dashboard UI (flow graph, status cards, activity feed)
│   └── PHASE_M6_M7_M8_M9.json        # M6-M9: Artifacts grid, metrics/events pages, pipeline/alerts UI, cleanup
├── test-scenarios.md                 # E2E test scenarios for all 9 phases
└── quick-actions/
    ├── seed-test-data.sh             # Generate test voice notes
    ├── verify-monitoring.sh          # Verify monitoring working
    └── test-queries.sh               # Test monitoring queries
```

---

## 🧭 Quick Start (For Ralph)

### Pre-Execution Checklist

Before starting Phase 1:
- [ ] Read `PRD.json` completely
- [ ] Read `context/MAIN_CONTEXT.md` for architecture overview
- [ ] Read `docs/architecture/voice-notes-v2-technical-reference.md` (understand existing v2 pipeline)
- [ ] Read `phases/PHASE1_PRD.json` for detailed implementation steps
- [ ] Review existing monitoring patterns in `docs/development/convex-usage-monitoring.md`
- [ ] Understand v2 tables: voiceNoteArtifacts, voiceNoteClaims, voiceNoteEntityResolutions, insightDrafts

### Execution Order

1. **Read Context** → Start with `MAIN_CONTEXT.md` and v2 technical reference
2. **Phase 1 (MVP)** → Data capture, basic views (4-5 days)
3. **Phase 2 (Viz)** → Flow visualization (3-4 days)
4. **Phase 3 (Metrics)** → Performance analytics (4-5 days)
5. **Phase 4 (Dashboard)** → Admin UI (5-6 days)
6. **Phase 5 (Alerts)** → Monitoring & alerts (3-4 days)
7. **Phase 6 (A/B)** → Model performance tracking (4-5 days)
8. **Phase 7 (Advanced)** → Interactive features (4-5 days)

---

## 🎨 Key Architecture Decisions

### Data Storage Strategy

**New Tables (Separate from Operational Data):**
- `voiceNoteProcessingEvents` - Stage transitions with timestamps
- `voiceNotePerformanceMetrics` - Aggregated performance data
- `voiceNoteAlerts` - Alert configuration and history

**Why Separate?**
- Monitoring data doesn't impact operational queries
- Can be cleaned/archived independently
- Clear separation of concerns

### Real-Time Updates

- **5-second polling** for aggregate views (acceptable trade-off)
- **Convex real-time queries** for drill-down views
- **Event-driven** for alerts (immediate notification)

### UI Location

- **Platform staff only:** `/platform/voice-monitor`
- **Eventually org admins:** `/orgs/[orgId]/admin/voice-monitor` (limited to their org)
- **Never coaches/parents:** Too technical, no business value

---

## 🚀 Phase 1 Overview (MVP)

**Goal:** Capture monitoring data and build basic list/drill-down views

### What Gets Built

**Backend:**
- `voiceNoteProcessingEvents` table (stage, timestamp, metadata)
- Instrumentation in v2 pipeline (log events at each stage)
- Queries: `getRecentVoiceNotes`, `getVoiceNoteTimeline`

**Frontend:**
- `/platform/voice-monitor` route (platform staff only)
- List view: Recent voice notes with status badges
- Drill-down view: Single voice note with stage-by-stage timeline
- Basic filtering (date range, status, source channel)

### Success Criteria

- ✅ Voice note events captured at all stages
- ✅ List view shows last 100 voice notes
- ✅ Drill-down shows complete timeline with timestamps
- ✅ Can identify stuck voice notes (in same status > 5min)
- ✅ Page loads in < 2 seconds

**Duration:** 4-5 days
**Stories:** US-VNM-001 through US-VNM-006

---

## 📊 Phase 2 Overview (Visualization)

**Goal:** Visual flow representation (Sankey + Timeline)

### What Gets Built

**Components:**
- Sankey diagram showing aggregate flow (100 notes → 85 transcribed → 70 claims extracted → 60 resolved → 50 drafted)
- Interactive timeline with zoom/pan
- Stage drill-down (click stage → see all notes in that stage)

### Visualization Libraries

- **Sankey:** D3.js or Recharts (already in project)
- **Timeline:** Custom component with shadcn/ui primitives
- **Charts:** Recharts (consistent with existing dashboard)

**Duration:** 3-4 days
**Stories:** US-VNM-007 through US-VNM-010

---

## 📈 Phase 3 Overview (Performance Metrics)

**Goal:** Track and display performance KPIs

### Metrics Tracked

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| **Latency per stage** | avg(stage_end - stage_start) | Identify bottlenecks |
| **Cost per stage** | sum(openai_cost) | Optimize spending |
| **Success rate** | completed / total | Monitor reliability |
| **Quality gate rejection rate** | rejected / total_checked | Tune validation |
| **Entity resolution accuracy** | auto_resolved / (auto_resolved + needs_disambiguation) | Improve matching |
| **Draft confirmation rate** | confirmed / total_drafts | Trust system health |

### Analytics Views

- 30-day trend charts
- Stage comparison (which stage is slowest/most expensive?)
- Cohort analysis (Irish names vs English names resolution success)

**Duration:** 4-5 days
**Stories:** US-VNM-011 through US-VNM-016

---

## 🎛️ Phase 4 Overview (Admin Dashboard)

**Goal:** Polished, production-ready monitoring UI

### Dashboard Structure

```
/platform/voice-monitor
├── Overview Tab (default)
│   ├── Key Metrics Cards (24h: total processed, success rate, avg latency, total cost)
│   ├── Live Activity Feed (last 20 events, real-time)
│   └── Alert Panel (unacknowledged alerts)
├── Pipeline Flow Tab
│   ├── Sankey Diagram (aggregate flow)
│   └── Stage Statistics Table
├── Performance Tab
│   ├── Latency Charts (per stage, 30-day trend)
│   ├── Cost Analysis (breakdown by stage)
│   └── Bottleneck Detection
├── Quality Tab
│   ├── Success Rates (overall, per stage)
│   ├── Quality Gate Metrics
│   └── Entity Resolution Stats
├── Debugging Tab
│   ├── Voice Notes List (searchable, filterable)
│   ├── Stuck Notes Alert
│   └── Failed Notes Table
└── Settings Tab
    ├── Alert Configuration
    ├── Data Retention
    └── Export Options
```

**Duration:** 5-6 days
**Stories:** US-VNM-017 through US-VNM-025

---

## 🚨 Phase 5 Overview (Alerts & Monitoring)

**Goal:** Proactive issue detection

### Alert Types

| Alert | Trigger | Severity | Action |
|-------|---------|----------|--------|
| **Stuck Voice Note** | In same status > 5min | Warning | Investigate processing |
| **High Rejection Rate** | Quality gate rejection > 20% in 1h | Warning | Review validation rules |
| **Pipeline Slowdown** | Avg latency > 2x baseline | Critical | Check AI service health |
| **Entity Resolution Backlog** | Needs disambiguation queue > 50 | Warning | Review common ambiguities |
| **Cost Spike** | Hourly cost > 3x avg | Critical | Check for runaway processing |

### Delivery

- Dashboard visual indicators (colored badges)
- Optional: Email to platform staff (future)
- Optional: Slack webhook (future)

**Duration:** 3-4 days
**Stories:** US-VNM-026 through US-VNM-030

---

## 🧪 Phase 6 Overview (Model Performance & A/B Testing)

**Goal:** Support model optimization and experimentation

### Model Tracking

- **Track model used:** GPT-4 vs GPT-4-turbo vs Claude 3.5 Sonnet
- **Compare performance:** Accuracy, latency, cost per model
- **Variant support:** Track prompt version, settings

### A/B Testing Features

- Variant tagging (e.g., "prompt_v1" vs "prompt_v2")
- Cohort comparison (Irish names vs English names)
- Statistical significance testing (future)

**Duration:** 4-5 days
**Stories:** US-VNM-031 through US-VNM-035

---

## 🔧 Phase 7 Overview (Advanced Features)

**Goal:** Interactive debugging and analysis tools

### Features

- **Retry failed voice note:** Manual trigger for stuck/failed notes
- **Replay from stage:** Re-run from specific stage (e.g., re-extract claims)
- **Historical data browser:** Query voice notes from past 90 days
- **Export to CSV:** Download metrics for external analysis
- **Monitoring test harness:** Generate synthetic voice notes to test monitoring

**Duration:** 4-5 days
**Stories:** US-VNM-036 through US-VNM-040

---

## 🧪 Testing Strategy

### E2E Tests (Playwright)

Create tests in `apps/web/uat/tests/voice-monitor/`:
- `dashboard.spec.ts` - Dashboard loading, tabs, access control
- `list-view.spec.ts` - Voice notes list, filtering, search
- `drill-down.spec.ts` - Single voice note timeline
- `visualization.spec.ts` - Sankey diagram, timeline interaction
- `alerts.spec.ts` - Alert triggers, acknowledgment

### Monitoring Test Harness

Script to generate test voice notes:
```bash
./scripts/ralph/prds/voice-monitor-harness/quick-actions/seed-test-data.sh
```

Generates:
- Normal flow voice notes (all stages successful)
- Stuck voice notes (stops at transcription)
- Failed voice notes (quality gate rejection)
- Ambiguous names (needs disambiguation)

**Total**: ~50 E2E tests across all phases

---

## 🔗 Integration with Existing Systems

### Voice Notes v2 Pipeline

Instrumentation points:
- `createArtifact` → log event (status: "received")
- `transcribeAudio` → log event (status: "transcribed", duration, whisper_confidence)
- `extractClaims` → log event (status: "claims_extracted", claim_count, ai_latency, cost)
- `resolveEntities` → log event (status: "entities_resolved", auto_resolved_count, needs_disambiguation_count)
- `generateDrafts` → log event (status: "drafts_created", draft_count, auto_confirmed_count)
- `applyDraft` → log event (status: "applied")

**Minimal Intrusion:** Simple logging calls, no logic changes to v2 pipeline

### Performance Monitoring (Convex)

- **Separate from** general Convex usage monitoring
- **Complements** existing performance tracking
- **Voice-specific** metrics and visualizations

---

## ⚙️ Technical Patterns

### Mandatory Patterns

**ALWAYS**:
- ✅ Use `.withIndex()` - NEVER `.filter()` after indexed query
- ✅ Batch fetch + Map lookup (avoid N+1 queries)
- ✅ Platform staff authorization on ALL `/platform/voice-monitor/*` routes
- ✅ Real-time queries where appropriate (drill-down views)
- ✅ Aggregated queries for historical data (>7 days)
- ✅ Include args and returns validators on all queries/mutations
- ✅ Co-locate imports with usage (same edit)

**NEVER**:
- ❌ Query per item in loop (N+1)
- ❌ Expose voice note content to non-platform staff
- ❌ Impact v2 pipeline performance (monitoring should be lightweight)
- ❌ Create dashboard without authorization checks

### Performance Targets

| Operation | Target | Pass Criteria |
|-----------|--------|---------------|
| Dashboard page load | < 2 seconds | Full page with Overview tab |
| Voice notes list query | < 200ms | Last 100 notes |
| Drill-down timeline query | < 100ms | Single voice note |
| Sankey diagram render | < 500ms | Aggregate flow |
| Event logging latency | < 10ms | No impact on v2 pipeline |
| Alert check | < 50ms | Run every 30 seconds |

---

## 📚 Documentation Hierarchy

### Level 1: Overview
- **`PRD.json`** - Complete project definition
- **`context/MAIN_CONTEXT.md`** - Architecture and concepts

### Level 2: Phase Implementation
- **`phases/PHASE1_PRD.json`** - Detailed Phase 1 stories
- **`context/PHASE1_DATA_CAPTURE.md`** - Phase 1 implementation guide
- *(Repeat for all 7 phases)*

### Level 3: Reference
- **`docs/architecture/voice-notes-v2-technical-reference.md`** - Existing v2 pipeline
- **`docs/development/convex-usage-monitoring.md`** - General monitoring patterns
- **`docs/performance/convex-over-usage-implementation-plan.md`** - Performance optimization context

---

## 🎯 Success Criteria (All Phases)

### Phase 1 (MVP)
- [ ] All v2 pipeline stages log events
- [ ] List view shows last 100 voice notes with status
- [ ] Drill-down shows complete timeline
- [ ] Page loads in < 2 seconds
- [ ] Platform staff authorization enforced

### Phase 2 (Visualization)
- [ ] Sankey diagram renders aggregate flow
- [ ] Timeline view interactive (zoom, pan)
- [ ] Stage drill-down works
- [ ] Renders in < 500ms

### Phase 3 (Metrics)
- [ ] Latency tracked per stage
- [ ] Cost tracked per stage
- [ ] Success rates calculated
- [ ] 30-day trend charts display
- [ ] Cohort analysis functional

### Phase 4 (Dashboard)
- [ ] Overview tab loads first
- [ ] All 6 tabs functional
- [ ] Real-time updates work (< 10s lag)
- [ ] Filtering and search work
- [ ] Export to CSV functional

### Phase 5 (Alerts)
- [ ] All 5 alert types trigger correctly
- [ ] Alerts visible in dashboard
- [ ] Acknowledgment flow works
- [ ] No false positives

### Phase 6 (A/B Testing)
- [ ] Model usage tracked
- [ ] Variant comparison works
- [ ] Cohort analysis shows differences
- [ ] Claim accuracy tracked

### Phase 7 (Advanced)
- [ ] Retry mechanism works
- [ ] Replay from stage works
- [ ] Historical browser functional
- [ ] Test harness generates test data

**Overall Success:**
- [ ] Complete visibility into v2 pipeline
- [ ] Can debug stuck/failed voice notes in < 2 minutes
- [ ] Performance bottlenecks identified
- [ ] Model quality assessed
- [ ] Zero impact on v2 pipeline performance
- [ ] No security regressions

---

## 📝 Ralph Execution Notes

### Agent Delegation Strategy

**Multiple Parallel Agents** (as per user request):

**Agent 1: Backend Instrumentation** (Phases 1, 3, 6)
- Add event logging to v2 pipeline
- Create monitoring queries
- Performance metrics calculation

**Agent 2: Frontend Dashboard** (Phases 2, 4, 7)
- Build dashboard UI components
- Implement visualizations
- Create interactive features

**Agent 3: Testing** (All phases)
- E2E test creation
- Test data generation
- Monitoring test harness

**Agent 4: Alerts & Analytics** (Phases 5, 6)
- Alert configuration
- Statistical analysis
- A/B testing support

### Coordination

- Agents work on phases in parallel where possible
- Backend Agent 1 completes Phase 1 backend before Agent 2 starts Phase 1 frontend
- Testing Agent 3 writes tests for completed phases continuously

---

## 🔧 Troubleshooting

### Events not logging
- Check event logging calls in v2 pipeline
- Verify `voiceNoteProcessingEvents` table exists
- Check Convex logs for errors

### Dashboard slow
- Verify using indexed queries
- Check if querying > 100 voice notes (paginate)
- Enable aggregate queries for > 7 days

### Sankey diagram not rendering
- Check data format (expected: `{source, target, value}[]`)
- Verify D3.js or Recharts installed
- Check browser console for errors

### Alerts not triggering
- Verify alert cron running every 30 seconds
- Check alert thresholds configured correctly
- Verify `voiceNoteAlerts` table has records

---

## 🎉 Next Steps After Completion

1. **Monitor for 1 week** - Ensure stability, gather feedback
2. **Org Admin Access** - Extend to org admins (limited to their org) if valuable
3. **Export API** - Build API for external monitoring tools (DataDog, etc.)
4. **Predictive Alerts** - ML-based anomaly detection (future)
5. **Cost Optimization** - Use insights to reduce per-voice-note cost

---

**Last Updated**: February 15, 2026
**Prepared By**: Claude Code
**For**: Ralph (Automated Project Management System)
**Issue**: [#495](https://github.com/NB-PDP-Testing/PDP/issues/495)
