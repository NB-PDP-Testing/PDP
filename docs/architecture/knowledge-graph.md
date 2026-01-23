# Knowledge Graph Architecture for Player Development

**Date**: January 23, 2026
**Status**: 📋 Planning
**Author**: Architecture Team

---

## Executive Summary

As PlayerARC scales with more players, organizations, and sports, traditional relational queries become insufficient for extracting meaningful cross-domain insights. This document outlines our strategic roadmap for implementing a **Knowledge Graph** layer that will enable:

- **Cross-Sport Skill Transfer Analysis**: Identify how skills in one sport correlate with development in another
- **Predictive Player Development**: Forecast player progression trajectories based on historical patterns
- **Coach Effectiveness Mapping**: Track which coaches successfully develop specific skill categories
- **Intelligent Recommendations**: Generate evidence-based improvement plans drawing from coach insights across all sports

### Why Knowledge Graphs?

| Traditional Queries | Knowledge Graph Queries |
|---------------------|-------------------------|
| "Show me Player X's soccer skills" | "Show all players who developed like Player X at age 14" |
| "List Coach A's team roster" | "Find coaches whose players improved fastest in ball handling" |
| "Get assessments from last month" | "Trace how Coach A's training insights led to skill improvements" |
| "Count injuries by body part" | "Identify players with injury patterns similar to those who later achieved elite status" |

---

## Current Data Architecture Analysis

### Entity Inventory (47 Models Analyzed)

PlayerARC's Convex backend contains rich, relationship-heavy data ideal for graph representation:

#### Core Player Entities
| Entity | Current Records | Graph Node Type | Key Relationships |
|--------|-----------------|-----------------|-------------------|
| `playerIdentities` | Platform-level | **Player** | Central hub for multi-org tracking |
| `sportPassports` | Per-sport-per-org | **SportProfile** | Links player to sport-specific data |
| `skillAssessments` | Time-series | **Assessment** | Temporal chain of skill ratings |
| `passportGoals` | Development tracking | **Goal** | Links to skills and milestones |

#### Guardian & Family
| Entity | Graph Node Type | Key Relationships |
|--------|-----------------|-------------------|
| `guardianIdentities` | **Guardian** | N:M links to players |
| `guardianPlayerLinks` | **Relationship Edge** | Parent-child with metadata |
| `orgGuardianProfiles` | **OrgProfile Edge** | Org-specific preferences |

#### Team & Coaching
| Entity | Graph Node Type | Key Relationships |
|--------|-----------------|-------------------|
| `teamPlayerIdentities` | **Membership Edge** | Player-team with temporal data |
| `coachAssignments` | **Assignment Edge** | Coach-team with scope |
| `voiceNotes` | **Observation** | Source of extracted insights |
| `coachParentSummaries` | **Communication** | Insight delivery chain |

#### Reference Data
| Entity | Graph Node Type | Key Relationships |
|--------|-----------------|-------------------|
| `sports` | **Sport** | Top-level category |
| `skillCategories` | **SkillCategory** | Sport-specific groupings |
| `skillDefinitions` | **Skill** | Individual assessable skills |
| `skillBenchmarks` | **Benchmark** | NGB standards with percentiles |

#### Health & Safety
| Entity | Graph Node Type | Key Relationships |
|--------|-----------------|-------------------|
| `playerInjuries` | **Injury** | Cross-org visibility, RTP protocol |
| `medicalProfiles` | **MedicalInfo** | Allergies, conditions |

---

## Proposed Knowledge Graph Schema

### Node Types

```
┌─────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH SCHEMA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CORE NODES                                                      │
│  ───────────                                                     │
│  (:Player {id, name, birthDate, gender, playerType})            │
│  (:Guardian {id, name, email, phone})                           │
│  (:Coach {id, name, specializations[]})                         │
│  (:Team {id, name, sport, ageGroup, season})                    │
│  (:Organization {id, name, type})                               │
│                                                                  │
│  SPORT & SKILL NODES                                             │
│  ──────────────────                                              │
│  (:Sport {code, name, governingBody})                           │
│  (:SkillCategory {code, name, sport})                           │
│  (:Skill {code, name, category, level1-5Descriptors})           │
│  (:Benchmark {sport, skill, ageGroup, gender, level, rating})   │
│                                                                  │
│  EVENT NODES (Temporal)                                          │
│  ─────────────────────                                           │
│  (:Assessment {id, date, rating, type, confidence})             │
│  (:Goal {id, title, category, status, progress})                │
│  (:Injury {id, type, bodyPart, severity, status})               │
│  (:VoiceNote {id, date, type, summary})                         │
│  (:Insight {id, category, description, status})                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship Types

```
PLAYER RELATIONSHIPS
────────────────────
(:Player)-[:ENROLLED_IN {season, status}]->(:Organization)
(:Player)-[:HAS_SPORT {startDate, currentRating}]->(:Sport)
(:Player)-[:ON_TEAM {role, season, startDate, endDate}]->(:Team)
(:Player)-[:PARENT_OF]<-[:IS_PARENT]-(:Guardian)
(:Player)-[:HAS_ASSESSMENT]->(:Assessment)-[:OF_SKILL]->(:Skill)
(:Player)-[:HAS_GOAL]->(:Goal)-[:TARGETS]->(:Skill)
(:Player)-[:HAD_INJURY]->(:Injury)
(:Player)-[:SIMILAR_TO {score, factors[]}]->(:Player)

COACHING RELATIONSHIPS
──────────────────────
(:Coach)-[:COACHES {season, role}]->(:Team)
(:Coach)-[:CREATED]->(:VoiceNote)-[:CONTAINS]->(:Insight)
(:Coach)-[:MADE_ASSESSMENT]->(:Assessment)
(:Insight)-[:ABOUT]->(:Player)
(:Insight)-[:LED_TO]->(:Assessment | :Goal | :Injury)

SKILL RELATIONSHIPS
───────────────────
(:Skill)-[:BELONGS_TO]->(:SkillCategory)-[:FOR_SPORT]->(:Sport)
(:Skill)-[:REQUIRES]->(:Skill)  // Prerequisite relationships
(:Skill)-[:TRANSFERS_TO {weight}]->(:Skill)  // Cross-sport transfer
(:Skill)-[:HAS_BENCHMARK]->(:Benchmark)
(:Assessment)-[:COMPARED_TO]->(:Benchmark)

TEMPORAL RELATIONSHIPS
──────────────────────
(:Assessment)-[:FOLLOWED_BY]->(:Assessment)  // Progression chain
(:Goal)-[:HAS_MILESTONE]->(:Milestone)-[:NEXT]->(:Milestone)
(:Injury)-[:AFFECTED]->(:Skill)  // Impact on skill development
```

---

## Primary Use Cases

### 1. Cross-Sport Skill Transfer Analysis

**Problem**: A player excelling in GAA Football joins the Soccer program. Which skills transfer? What development path is optimal?

**Graph Query**:
```cypher
// Find players who succeeded in both sports
MATCH (p:Player)-[:HAS_SPORT]->(gaa:Sport {code: "gaa_football"})
MATCH (p)-[:HAS_SPORT]->(soccer:Sport {code: "soccer"})
MATCH (p)-[:HAS_ASSESSMENT]->(a1:Assessment)-[:OF_SKILL]->(s1:Skill)
MATCH (p)-[:HAS_ASSESSMENT]->(a2:Assessment)-[:OF_SKILL]->(s2:Skill)
WHERE s1.sport = "gaa_football" AND s2.sport = "soccer"
  AND a1.date < a2.date
  AND a2.rating >= 4
WITH s1.code as gaaSkill, s2.code as soccerSkill,
     COUNT(DISTINCT p) as playerCount,
     AVG(a2.rating - a1.rating) as avgImprovement
WHERE playerCount >= 5
RETURN gaaSkill, soccerSkill, playerCount, avgImprovement
ORDER BY avgImprovement DESC
```

**Insight Example**:
> "Players with high agility ratings in GAA (4+) develop soccer footwork 40% faster than those without GAA background"

### 2. Predictive Player Development

**Problem**: Predict how long it will take Player X to reach skill level 4 in "ball_control".

**Graph Query**:
```cypher
// Find similar players and their progression timelines
MATCH (target:Player {id: $playerId})-[:HAS_ASSESSMENT]->(ta:Assessment)-[:OF_SKILL]->(skill:Skill {code: "ball_control"})
WITH target, skill, ta.rating as currentRating, ta.date as currentDate
MATCH (similar:Player)-[:HAS_ASSESSMENT]->(a1:Assessment)-[:OF_SKILL]->(skill)
MATCH (similar)-[:HAS_ASSESSMENT]->(a2:Assessment)-[:OF_SKILL]->(skill)
WHERE similar <> target
  AND a1.rating = currentRating
  AND a2.rating >= 4
  AND a1.date < a2.date
WITH target, currentRating,
     duration.inDays(date(a1.date), date(a2.date)).days as daysToLevel4,
     similar.ageGroup as ageGroup
RETURN AVG(daysToLevel4) as avgDays,
       PERCENTILE_CONT(daysToLevel4, 0.25) as fastPath,
       PERCENTILE_CONT(daysToLevel4, 0.75) as slowPath
```

**Insight Example**:
> "Based on 23 similar players, expect Player X to reach level 4 in 45-90 days (median: 62 days)"

### 3. Coach Effectiveness Mapping

**Problem**: Which coaches are most effective at developing specific skill categories?

**Graph Query**:
```cypher
// Calculate coach effectiveness by skill improvement velocity
MATCH (c:Coach)-[:MADE_ASSESSMENT]->(a1:Assessment)-[:OF_SKILL]->(skill:Skill)
MATCH (a1)-[:FOLLOWED_BY]->(a2:Assessment)-[:OF_SKILL]->(skill)
WHERE a1.assessedBy = c.id AND a2.assessedBy = c.id
WITH c, skill.category as category,
     AVG(a2.rating - a1.rating) as avgImprovement,
     COUNT(*) as assessmentPairs,
     AVG(duration.inDays(date(a1.date), date(a2.date)).days) as avgDaysBetween
WHERE assessmentPairs >= 10
RETURN c.name, category, avgImprovement, assessmentPairs,
       avgImprovement / avgDaysBetween * 30 as monthlyVelocity
ORDER BY monthlyVelocity DESC
```

**Insight Example**:
> "Coach Sarah's players improve 'Ball Mastery' skills 2.3x faster than organization average"

### 4. Voice Note → Improvement Path

**Problem**: Trace how coach observations (voice notes) lead to recorded improvements.

**Graph Query**:
```cypher
// Track insight-to-action-to-outcome chain
MATCH (vn:VoiceNote)-[:CONTAINS]->(i:Insight)-[:ABOUT]->(p:Player)
MATCH (i)-[:LED_TO]->(a:Assessment)-[:OF_SKILL]->(skill:Skill)
MATCH (a)-[:FOLLOWED_BY*1..3]->(later:Assessment)-[:OF_SKILL]->(skill)
WHERE i.category = "skill_progress"
  AND later.rating > a.rating
WITH vn.coachId as coach, i.category as insightType,
     COUNT(*) as insightsActedOn,
     AVG(later.rating - a.rating) as avgImprovement
RETURN coach, insightType, insightsActedOn, avgImprovement
ORDER BY avgImprovement DESC
```

**Insight Example**:
> "Voice note insights marked 'skill_progress' lead to measurable improvement 73% of the time"

### 5. Injury Risk Prediction

**Problem**: Identify players at risk based on injury patterns similar to previously injured players.

**Graph Query**:
```cypher
// Find players with risk factors matching injured cohort
MATCH (injured:Player)-[:HAD_INJURY]->(inj:Injury)
WHERE inj.severity IN ["severe", "long_term"]
MATCH (injured)-[:HAS_ASSESSMENT]->(a:Assessment)-[:OF_SKILL]->(skill:Skill)
WHERE a.date < inj.dateOccurred
WITH injured, inj, skill.code as skillCode, a.rating as rating
MATCH (current:Player)-[:HAS_ASSESSMENT]->(ca:Assessment)-[:OF_SKILL]->(cs:Skill {code: skillCode})
WHERE NOT EXISTS((current)-[:HAD_INJURY]->(:Injury {severity: "severe"}))
  AND ABS(ca.rating - rating) < 0.5
WITH current, COUNT(DISTINCT injured) as matchingPatterns
WHERE matchingPatterns >= 3
RETURN current.name, matchingPatterns,
       "Review training load" as recommendation
ORDER BY matchingPatterns DESC
```

---

## Technology Recommendations

### Primary Recommendation: Neo4j AuraDB

After evaluating multiple options, we recommend **Neo4j AuraDB Professional** for the following reasons:

| Factor | Neo4j | Amazon Neptune | Memgraph |
|--------|-------|----------------|----------|
| **Graph Algorithms** | 65+ in GDS library | Limited | Fewer |
| **Query Language** | Cypher (ISO GQL) | Gremlin/SPARQL | openCypher |
| **Sports Analytics Fit** | Excellent | Good | Good |
| **Convex Integration** | HTTP API | AWS-native | HTTP API |
| **Cost (starter)** | $65/mo | ~$0.10/hr | $99/mo |
| **Community/Docs** | Largest | AWS-focused | Growing |

**Graph Data Science Library** is critical for:
- PageRank (coach influence)
- Community Detection (player clusters)
- Similarity Algorithms (player matching)
- Path Finding (skill prerequisites)
- ML Embeddings (player vectors)

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │      CONVEX          │        │      NEO4J           │       │
│  │   (Primary Store)    │ ────── │   (Analytics Graph)  │       │
│  │                      │  Sync  │                      │       │
│  │  • User data         │ ────── │  • Skill progression │       │
│  │  • Teams & players   │        │  • Cross-sport links │       │
│  │  • Assessments       │ ◄───── │  • Recommendations   │       │
│  │  • Real-time ops     │ Results│  • Pattern detection │       │
│  └──────────────────────┘        └──────────────────────┘       │
│            │                               │                     │
│            │                               │                     │
│            ▼                               ▼                     │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │     NEXT.JS          │        │   VECTOR DB          │       │
│  │   (Frontend)         │        │   (Weaviate)         │       │
│  │                      │        │                      │       │
│  │  • Real-time UI      │        │  • Semantic search   │       │
│  │  • Assessment forms  │        │  • Voice note embeds │       │
│  │  • Player profiles   │        │  • Similar players   │       │
│  └──────────────────────┘        └──────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Strategy

**Event-Driven Sync (Recommended)**:
```typescript
// packages/backend/convex/actions/graphSync.ts
import { action } from "../_generated/server";
import { v } from "convex/values";

export const syncAssessmentToGraph = action({
  args: { assessmentId: v.id("skillAssessments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch assessment with context
    const assessment = await ctx.runQuery(
      internal.skillAssessments.getById,
      { id: args.assessmentId }
    );

    // Sync to Neo4j
    await fetch(process.env.NEO4J_HTTP_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NEO4J_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        statements: [{
          statement: `
            MERGE (p:Player {id: $playerId})
            MERGE (s:Skill {code: $skillCode})
            CREATE (a:Assessment {
              id: $assessmentId,
              rating: $rating,
              date: date($date),
              type: $type
            })
            MERGE (p)-[:HAS_ASSESSMENT]->(a)
            MERGE (a)-[:OF_SKILL]->(s)
            WITH p, a, s
            OPTIONAL MATCH (p)-[:HAS_ASSESSMENT]->(prev:Assessment)-[:OF_SKILL]->(s)
            WHERE prev.date < a.date AND prev <> a
            WITH a, prev ORDER BY prev.date DESC LIMIT 1
            FOREACH (_ IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
              MERGE (prev)-[:FOLLOWED_BY]->(a)
            )
          `,
          parameters: {
            playerId: assessment.playerIdentityId,
            skillCode: assessment.skillCode,
            assessmentId: assessment._id,
            rating: assessment.rating,
            date: assessment.assessmentDate,
            type: assessment.assessmentType
          }
        }]
      })
    });

    return null;
  }
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Objective**: Establish graph infrastructure and core data model

| Task | Owner | Dependencies | Deliverables |
|------|-------|--------------|--------------|
| Set up Neo4j AuraDB instance | DevOps | None | Running instance |
| Design initial graph schema | Architecture | Schema review | Cypher DDL |
| Build Convex → Neo4j sync action | Backend | Schema | Sync mutation |
| Create skill assessment sync | Backend | Sync action | Assessment nodes |
| Build player identity sync | Backend | Sync action | Player nodes |
| Create initial visualization | Frontend | React-graph-viz | Skill tree view |

**Success Metrics**:
- [ ] Neo4j instance running with schema
- [ ] 1,000+ assessment nodes synced
- [ ] Basic skill tree visualization functional

### Phase 2: Analytics (Weeks 5-8)

**Objective**: Implement core graph queries and insights

| Task | Owner | Dependencies | Deliverables |
|------|-------|--------------|--------------|
| Build skill progression query | Backend | Phase 1 | API endpoint |
| Implement similar player matching | Backend | Phase 1 | Similarity scores |
| Create coach effectiveness query | Backend | Phase 1 | Coach metrics |
| Build cross-sport correlation | Backend | Phase 1 | Transfer weights |
| Add benchmark comparison | Backend | Phase 1 | Benchmark edges |
| Create analytics dashboard | Frontend | APIs | Dashboard UI |

**Success Metrics**:
- [ ] Player progression queries < 500ms
- [ ] Similar player matching accuracy > 80%
- [ ] Coach dashboard with graph metrics

### Phase 3: AI Integration (Weeks 9-12)

**Objective**: Connect knowledge graph with AI pipelines

| Task | Owner | Dependencies | Deliverables |
|------|-------|--------------|--------------|
| Build HybridRAG pipeline | Backend | Weaviate setup | RAG endpoint |
| Add voice note graph linking | Backend | Phase 2 | Insight edges |
| Implement graph-enhanced prompts | Backend | Phase 2 | Better AI context |
| Create recommendation engine | Backend | All analytics | Recommendations |
| Add natural language queries | Frontend | HybridRAG | Query interface |

**Success Metrics**:
- [ ] Voice note → improvement path traced
- [ ] AI recommendations with evidence paths
- [ ] Natural language query interface functional

### Phase 4: Advanced Features (Weeks 13-16)

**Objective**: Predictive analytics and optimization

| Task | Owner | Dependencies | Deliverables |
|------|-------|--------------|--------------|
| Build predictive models | Data Science | Phase 2-3 | ML models |
| Implement injury risk scoring | Backend | Injury data | Risk scores |
| Create optimal path finder | Backend | Skill prereqs | Path recommendations |
| Add cohort analysis | Backend | Team data | Cohort comparisons |
| Build team composition optimizer | Backend | All data | Team recommendations |

**Success Metrics**:
- [ ] Skill prediction within ±20% accuracy
- [ ] Injury risk identification rate > 60%
- [ ] Team composition suggestions validated

---

## Cost Analysis

### Monthly Estimates by Scale

| Scale | Players | Convex | Neo4j | Weaviate | Total |
|-------|---------|--------|-------|----------|-------|
| Prototype | 100 | $0 | $0 (free) | $0 | **$0** |
| Small | 1,000 | $25 | $65 | $25 | **$115** |
| Medium | 10,000 | $100 | $259 | $100 | **$459** |
| Large | 100,000 | $400 | $500+ | $350 | **$1,250+** |

### Cost Optimization Strategies

1. **Batch Sync**: Sync assessments hourly instead of real-time for non-critical data
2. **Query Caching**: Cache frequently-accessed graph queries in Convex
3. **Archive Old Data**: Move historical assessments to cold storage, query on-demand
4. **Tiered Features**: Reserve complex graph queries for premium organizations

---

## Security & Compliance

### Data Flow Security

```
Convex (Primary)              Neo4j (Analytics)
     │                              │
     │  1. Data encrypted at rest   │
     │  2. TLS 1.3 in transit       │
     │  3. API key authentication   │
     │  4. No PII in Neo4j          │
     │     (use player IDs only)    │
     │  5. Org-scoped queries       │
     │                              │
     ▼                              ▼
Organization A data ═══╪═══ Organization B data
        (isolated)     ║        (isolated)
                       ║
              Graph queries filter
              by organizationId
```

### Compliance Checklist

- [ ] No PII stored in Neo4j (IDs only, names in Convex)
- [ ] All sync actions use service account
- [ ] Graph queries scoped by organizationId
- [ ] Audit log for all sync operations
- [ ] GDPR deletion propagates to Neo4j
- [ ] Data retention policies applied

---

## Visualization Strategy

### Recommended Libraries

| Library | Use Case | Integration |
|---------|----------|-------------|
| **Neo4j NVL** | Player skill trees, development paths | React component |
| **react-graph-vis** | Team relationship networks | Lighter weight |
| **Recharts** | Skill progression timelines | Already in use |
| **D3.js** | Custom force-directed layouts | Complex custom views |

### Key Visualizations

1. **Skill Tree View**
   - Hierarchical skill dependencies
   - Player's current level highlighted
   - Recommended next skills

2. **Player Similarity Network**
   - Cluster similar players
   - Show development paths of similar successful players

3. **Coach Effectiveness Heatmap**
   - Skills on Y-axis, coaches on X-axis
   - Color = improvement velocity

4. **Cross-Sport Transfer Map**
   - Sports as main nodes
   - Edge weights = transfer coefficients

---

## Success Metrics

### Phase 1 (Foundation)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Graph sync latency | < 2 seconds | Monitoring |
| Data consistency | 99.9% | Audit queries |
| Basic query performance | < 500ms | APM |

### Phase 2 (Analytics)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Similar player accuracy | > 80% | Coach validation |
| Coach metrics adoption | > 50% coaches | Usage analytics |
| Dashboard load time | < 3 seconds | Frontend metrics |

### Phase 3 (AI Integration)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Recommendation relevance | > 70% useful | User feedback |
| AI query accuracy | > 85% | Evaluation set |
| Insight-to-improvement tracking | > 60% traced | Graph queries |

### Phase 4 (Advanced)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Prediction accuracy | ±20% of actual | Historical validation |
| Injury risk detection | > 60% identified | Retrospective |
| User satisfaction | > 4.0/5.0 | NPS surveys |

---

## Appendix A: Full Graph Schema (Cypher DDL)

```cypher
// Create constraints for unique identifiers
CREATE CONSTRAINT player_id IF NOT EXISTS FOR (p:Player) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT skill_code IF NOT EXISTS FOR (s:Skill) REQUIRE s.code IS UNIQUE;
CREATE CONSTRAINT sport_code IF NOT EXISTS FOR (sp:Sport) REQUIRE sp.code IS UNIQUE;
CREATE CONSTRAINT assessment_id IF NOT EXISTS FOR (a:Assessment) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT team_id IF NOT EXISTS FOR (t:Team) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT coach_id IF NOT EXISTS FOR (c:Coach) REQUIRE c.id IS UNIQUE;

// Create indexes for common queries
CREATE INDEX player_org IF NOT EXISTS FOR (p:Player) ON (p.organizationId);
CREATE INDEX assessment_date IF NOT EXISTS FOR (a:Assessment) ON (a.date);
CREATE INDEX skill_sport IF NOT EXISTS FOR (s:Skill) ON (s.sport);
CREATE INDEX assessment_skill IF NOT EXISTS FOR (a:Assessment) ON (a.skillCode);

// Node type labels
// :Player, :Guardian, :Coach, :Team, :Organization
// :Sport, :SkillCategory, :Skill, :Benchmark
// :Assessment, :Goal, :Milestone, :Injury, :VoiceNote, :Insight
```

---

## Appendix B: Sample Cypher Queries

### Player Skill Progression
```cypher
MATCH (p:Player {id: $playerId})-[:HAS_ASSESSMENT]->(a:Assessment)-[:OF_SKILL]->(s:Skill {code: $skillCode})
RETURN a.date as date, a.rating as rating, a.type as type
ORDER BY a.date ASC
```

### Similar Players by Skill Profile
```cypher
MATCH (target:Player {id: $playerId})-[:HAS_ASSESSMENT]->(ta:Assessment)-[:OF_SKILL]->(skill:Skill)
WITH target, skill.code as skillCode, ta.rating as targetRating
MATCH (other:Player)-[:HAS_ASSESSMENT]->(oa:Assessment)-[:OF_SKILL]->(skill:Skill {code: skillCode})
WHERE other <> target
  AND other.organizationId = target.organizationId
WITH other, SUM(ABS(oa.rating - targetRating)) as totalDiff, COUNT(*) as skillCount
WHERE skillCount >= 5
RETURN other.id, other.name, totalDiff / skillCount as avgDiff
ORDER BY avgDiff ASC
LIMIT 10
```

### Coach Improvement Velocity
```cypher
MATCH (c:Coach {id: $coachId})-[:MADE_ASSESSMENT]->(a1:Assessment)
MATCH (a1)-[:FOLLOWED_BY]->(a2:Assessment)
WHERE a2.assessedBy = c.id
WITH c, a1.skillCode as skill,
     AVG(a2.rating - a1.rating) as improvement,
     AVG(duration.inDays(date(a1.date), date(a2.date)).days) as avgDays
RETURN skill, improvement, avgDays, improvement / avgDays * 30 as monthlyRate
ORDER BY monthlyRate DESC
```

---

## Related Documentation

- [System Overview](./system-overview.md) - Current data architecture
- [Multi-Team System](./multi-team-system.md) - Team assignment architecture
- [Player Passport](./player-passport.md) - Player profile structure
- [AI Configuration](./ai-configuration.md) - Current AI integrations
- [Identity System](./identity-system.md) - Platform-level identity

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0 | Initial document creation |

---

*This document is maintained by the Architecture team. For questions or contributions, contact the development team.*
