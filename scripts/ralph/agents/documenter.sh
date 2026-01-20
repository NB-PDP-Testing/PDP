#!/bin/bash
# Documenter Agent
# Documents features as they're built, maintaining architecture docs
# Runs after each Ralph iteration completes
#
# FIXES:
# - Track when phase is fully documented to avoid regenerating
# - Extract learnings from the current phase's progress entries

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/documenter.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
PRD_FILE="scripts/ralph/prd.json"
PROGRESS_FILE="scripts/ralph/progress.txt"
DOCS_DIR="docs/features"

mkdir -p "$OUTPUT_DIR"
mkdir -p "$DOCS_DIR"

echo "📝 Documenter Agent started at $(date)" | tee -a "$LOG_FILE"
echo "Checking for completed stories every 120 seconds..."

# Track which stories we've documented
DOCUMENTED_FILE="$OUTPUT_DIR/.documented-stories"
# Track which phases we've fully documented (prevents regeneration)
DOCUMENTED_PHASES_FILE="$OUTPUT_DIR/.documented-phases"
touch "$DOCUMENTED_FILE"
touch "$DOCUMENTED_PHASES_FILE"

check_and_document() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" | tee -a "$LOG_FILE"
    echo "=== Check at $timestamp ===" | tee -a "$LOG_FILE"

    # Get project name from PRD
    if [ ! -f "$PRD_FILE" ]; then
        echo "No PRD found, skipping" | tee -a "$LOG_FILE"
        return
    fi

    local project_name=$(jq -r '.project // "Unknown"' "$PRD_FILE")
    local branch_name=$(jq -r '.branchName // "unknown"' "$PRD_FILE")
    local feature_slug=$(echo "$branch_name" | sed 's|ralph/||')

    # Count completed stories
    local completed_count=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
    local total_count=$(jq '.userStories | length' "$PRD_FILE")

    echo "Project: $project_name" | tee -a "$LOG_FILE"
    echo "Progress: $completed_count / $total_count stories complete" | tee -a "$LOG_FILE"

    # Check if this phase is already fully documented
    if grep -q "^$feature_slug$" "$DOCUMENTED_PHASES_FILE" 2>/dev/null; then
        echo "Phase already documented, skipping" | tee -a "$LOG_FILE"
        return
    fi

    # Check for newly completed stories that need documentation
    local completed_stories=$(jq -r '.userStories[] | select(.passes == true) | .id' "$PRD_FILE")
    local new_completions=false

    for story_id in $completed_stories; do
        if ! grep -q "^${feature_slug}:${story_id}$" "$DOCUMENTED_FILE" 2>/dev/null; then
            new_completions=true
            echo "New completion: $story_id" | tee -a "$LOG_FILE"
            echo "${feature_slug}:${story_id}" >> "$DOCUMENTED_FILE"
        fi
    done

    # Determine if we should update docs
    local should_update_docs=false
    local doc_reason=""

    if [ "$completed_count" -eq "$total_count" ] && [ "$total_count" -gt 0 ]; then
        should_update_docs=true
        doc_reason="Phase complete"
    elif [ "$new_completions" = true ]; then
        # Check if we've hit a milestone (every 5 stories)
        local milestone=$((completed_count % 5))
        if [ "$milestone" -eq 0 ]; then
            should_update_docs=true
            doc_reason="Milestone reached ($completed_count stories)"
        fi
    fi

    if [ "$should_update_docs" = true ]; then
        echo "📚 Triggering documentation update: $doc_reason" | tee -a "$LOG_FILE"
        generate_feature_doc "$project_name" "$branch_name" "$completed_count" "$total_count" "$feature_slug"

        # Mark phase as documented if complete
        if [ "$completed_count" -eq "$total_count" ]; then
            echo "$feature_slug" >> "$DOCUMENTED_PHASES_FILE"
            echo "✅ Phase marked as fully documented" | tee -a "$LOG_FILE"
        fi
    fi
}

generate_feature_doc() {
    local project_name="$1"
    local branch_name="$2"
    local completed="$3"
    local total="$4"
    local feature_slug="$5"
    local doc_file="$DOCS_DIR/${feature_slug}.md"

    echo "Generating documentation: $doc_file" | tee -a "$LOG_FILE"

    # Generate the documentation
    cat > "$doc_file" << EOF
# $project_name

> Auto-generated documentation - Last updated: $(date '+%Y-%m-%d %H:%M')

## Status

- **Branch**: \`$branch_name\`
- **Progress**: $completed / $total stories complete
- **Phase Status**: $([ "$completed" -eq "$total" ] && echo "✅ Complete" || echo "🔄 In Progress")

## Completed Features

EOF

    # Add each completed story with acceptance criteria
    jq -r '.userStories[] | select(.passes == true) | "### \(.id): \(.title)\n\n\(.description)\n\n**Acceptance Criteria:**\n" + (.acceptanceCriteria | map("- " + .) | join("\n")) + "\n"' "$PRD_FILE" >> "$doc_file"

    # Add implementation notes from progress.txt (extract from this phase's entries)
    if [ -f "$PROGRESS_FILE" ]; then
        echo "" >> "$doc_file"
        echo "## Implementation Notes" >> "$doc_file"
        echo "" >> "$doc_file"

        # Extract learnings from the most recent phase entries
        echo "### Key Patterns & Learnings" >> "$doc_file"
        echo "" >> "$doc_file"

        # Get patterns discovered sections
        local patterns=$(grep -A 10 "Patterns discovered:" "$PROGRESS_FILE" 2>/dev/null | grep "^-" | head -10)
        if [ -n "$patterns" ]; then
            echo "**Patterns discovered:**" >> "$doc_file"
            echo "$patterns" >> "$doc_file"
            echo "" >> "$doc_file"
        fi

        # Get gotchas encountered
        local gotchas=$(grep -A 10 "Gotchas encountered:" "$PROGRESS_FILE" 2>/dev/null | grep "^-" | head -10)
        if [ -n "$gotchas" ]; then
            echo "**Gotchas encountered:**" >> "$doc_file"
            echo "$gotchas" >> "$doc_file"
            echo "" >> "$doc_file"
        fi

        # Get files changed summary
        local files=$(grep -A 20 "Files changed" "$PROGRESS_FILE" 2>/dev/null | grep "^-" | head -15)
        if [ -n "$files" ]; then
            echo "### Files Changed" >> "$doc_file"
            echo "" >> "$doc_file"
            echo "$files" >> "$doc_file"
            echo "" >> "$doc_file"
        fi
    fi

    # Add file references from PRD dependencies
    echo "" >> "$doc_file"
    echo "## Key Files" >> "$doc_file"
    echo "" >> "$doc_file"

    # List files from dependencies if available
    if jq -e '.dependencies.requiredFiles' "$PRD_FILE" > /dev/null 2>&1; then
        echo "### Required Files (from dependencies)" >> "$doc_file"
        jq -r '.dependencies.requiredFiles[]' "$PRD_FILE" | while read file; do
            echo "- \`$file\`" >> "$doc_file"
        done
    fi

    if jq -e '.dependencies.existingComponents' "$PRD_FILE" > /dev/null 2>&1; then
        echo "" >> "$doc_file"
        echo "### Existing Components Used" >> "$doc_file"
        jq -r '.dependencies.existingComponents[]' "$PRD_FILE" | while read file; do
            echo "- \`$file\`" >> "$doc_file"
        done
    fi

    # Add new files created in this phase (from progress.txt)
    local new_files=$(grep -E "^\- .+\.(tsx?|ts) \(NEW" "$PROGRESS_FILE" 2>/dev/null | head -10)
    if [ -n "$new_files" ]; then
        echo "" >> "$doc_file"
        echo "### New Files Created" >> "$doc_file"
        echo "$new_files" >> "$doc_file"
    fi

    echo "" >> "$doc_file"
    echo "---" >> "$doc_file"
    echo "*Documentation auto-generated by Ralph Documenter Agent*" >> "$doc_file"

    echo "✅ Documentation generated: $doc_file" | tee -a "$LOG_FILE"

    # Add feedback for Ralph if phase is complete
    if [ "$completed" -eq "$total" ]; then
        echo "" >> "$FEEDBACK_FILE"
        echo "## Documentation Update - $(date '+%Y-%m-%d %H:%M')" >> "$FEEDBACK_FILE"
        echo "- ✅ Feature documentation generated: \`$doc_file\`" >> "$FEEDBACK_FILE"
        echo "- Phase complete: $project_name" >> "$FEEDBACK_FILE"
    fi
}

# Main loop
while true; do
    check_and_document
    echo "Sleeping 120 seconds..." | tee -a "$LOG_FILE"
    sleep 120
done
