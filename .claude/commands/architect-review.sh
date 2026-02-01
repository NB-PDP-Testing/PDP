#!/bin/bash
# Architect Review Command
# Triggers architectural planning before Ralph starts a phase
#
# Usage: /architect-review [prd-file]

cd "$(dirname "$0")/../.."

PRD_FILE="${1:-scripts/ralph/prd.json}"

if [ ! -f "$PRD_FILE" ]; then
    echo "❌ PRD file not found: $PRD_FILE"
    exit 1
fi

PHASE=$(jq -r '.branchName // "unknown"' "$PRD_FILE" | sed 's|ralph/||')
STORY_COUNT=$(jq '.userStories | length' "$PRD_FILE")

echo "📐 Triggering Architect Agent..."
echo "Phase: $PHASE"
echo "Stories: $STORY_COUNT"
echo ""
echo "The architect will:"
echo "  1. Review all user stories in the PRD"
echo "  2. Identify key architectural decisions needed"
echo "  3. Generate Architecture Decision Records (ADRs)"
echo "  4. Document design trade-offs and recommendations"
echo "  5. Create implementation guidance for Ralph"
echo ""
echo "⏳ This may take 2-3 minutes for comprehensive analysis..."
echo ""

cat << 'AGENT_PROMPT'

Please invoke the architect agent with the following:

Task: {
  subagent_type: "architect",
  model: "opus",  // Use Opus for complex architectural reasoning
  description: "Pre-phase architectural planning",
  prompt: "Read the architect agent definition at .claude/agents/architect.md

Your task:

1. Read the PRD at scripts/ralph/prd.json
2. Analyze all user stories for architectural impact
3. Identify major architectural decisions needed
4. For each key decision:
   - Create an ADR in docs/architecture/decisions/
   - Document options considered, pros/cons, and chosen approach
   - Include implementation notes
5. Write implementation guidance to scripts/ralph/agents/output/feedback.md
6. Flag any security or scalability concerns

Focus areas:
- Data model design (schema, indexes, relationships)
- System integration patterns
- Security architecture
- Performance and scalability
- UX patterns and real-time updates

Generate comprehensive ADRs following the template in the agent definition.

The output will guide Ralph's implementation to follow sound architectural principles."
}

AGENT_PROMPT

echo ""
echo "After the architect completes:"
echo "  1. Review generated ADRs in docs/architecture/decisions/"
echo "  2. Check implementation guidance in feedback.md"
echo "  3. Start Ralph - he'll follow the architectural decisions"
echo ""
