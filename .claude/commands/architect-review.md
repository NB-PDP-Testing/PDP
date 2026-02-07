Run a comprehensive architectural review before Ralph starts implementing a phase.

## Instructions

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the architect agent definition at `.claude/agents/architect.md`
3. Use the `architecture-reviewer` Task agent (subagent_type) with model `opus` to perform a full architectural review

The architect agent should:

1. **Analyze all user stories** in the PRD for architectural impact
2. **Identify major architectural decisions** needed (data model, integrations, security, performance, UX)
3. **Generate Architecture Decision Records (ADRs)** in `docs/architecture/decisions/` following the template in the agent definition
4. **Write implementation guidance** to `scripts/ralph/agents/output/feedback.md`
5. **Flag risks** - security, scalability, and performance concerns with mitigations

### Focus Areas
- Data model design (schema, indexes, relationships)
- System integration patterns
- Security architecture
- Performance and scalability
- UX patterns and real-time updates
- Convex-specific patterns (indexes, batch queries, N+1 prevention)

### Output
- ADRs saved to `docs/architecture/decisions/`
- Implementation guidance written to `scripts/ralph/agents/output/feedback.md`
- Summary of findings presented to the user

After the review completes, present:
- Number of ADRs generated
- Key architectural decisions
- Any blocking concerns
- Pre-implementation checklist
