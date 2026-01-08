#!/bin/bash

# PostHog Feature Flag Management Script (Interactive)
#
# Usage:
#   1. Get your PostHog API key from: PostHog -> Settings -> Personal API Keys
#   2. Get your Project ID from the URL: https://app.posthog.com/project/<PROJECT_ID>/...
#   3. Run: POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 ./scripts/enable-ux-flags.sh
#
# Options:
#   --yes, -y          Skip confirmation prompts (apply default action to all)
#   --enable-all       Enable all flags without prompts
#   --disable-all      Disable all flags without prompts
#   --config <file>    Use custom JSON config file (default: ux-feature-flags.json)
#   --phase <n>        Only process flags from specific phase(s), comma-separated
#   --dry-run          Show what would happen without making changes
#
# Examples:
#   ./scripts/enable-ux-flags.sh                           # Interactive mode
#   ./scripts/enable-ux-flags.sh --enable-all              # Enable all flags
#   ./scripts/enable-ux-flags.sh --phase 4,5               # Only Phase 4 & 5
#   ./scripts/enable-ux-flags.sh --disable-all --phase 13  # Disable Phase 13 only

set -e

# Get script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'
DIM='\033[2m'

# Default values
AUTO_YES=false
ENABLE_ALL=false
DISABLE_ALL=false
DRY_RUN=false
CONFIG_FILE="$SCRIPT_DIR/ux-feature-flags.json"
PHASE_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --yes|-y)
      AUTO_YES=true
      shift
      ;;
    --enable-all)
      ENABLE_ALL=true
      AUTO_YES=true
      shift
      ;;
    --disable-all)
      DISABLE_ALL=true
      AUTO_YES=true
      shift
      ;;
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --phase)
      PHASE_FILTER="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "PostHog Feature Flag Management Script"
      echo ""
      echo "Usage: POSTHOG_API_KEY=xxx POSTHOG_PROJECT_ID=xxx $0 [options]"
      echo ""
      echo "Options:"
      echo "  --yes, -y          Skip confirmation prompts"
      echo "  --enable-all       Enable all flags without prompts"
      echo "  --disable-all      Disable all flags without prompts"
      echo "  --config <file>    Use custom JSON config file"
      echo "  --phase <n>        Only process specific phase(s), comma-separated"
      echo "  --dry-run          Show what would happen without making changes"
      echo "  --help, -h         Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}   PostHog UX Feature Flags - Management Console${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check for jq
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ Error: jq is required but not installed${NC}"
  echo ""
  echo "Install with:"
  echo "   brew install jq     # macOS"
  echo "   apt install jq      # Ubuntu/Debian"
  exit 1
fi

# Check config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ Error: Config file not found: $CONFIG_FILE${NC}"
  exit 1
fi

# Check required env vars
if [ -z "$POSTHOG_API_KEY" ]; then
  echo -e "${RED}❌ Error: POSTHOG_API_KEY is required${NC}"
  echo ""
  echo -e "${CYAN}How to get your API key:${NC}"
  echo "   1. Go to PostHog dashboard"
  echo "   2. Click Settings (gear icon)"
  echo "   3. Go to 'Personal API Keys'"
  echo "   4. Create a new key with 'Feature Flags' scope"
  echo ""
  echo -e "${YELLOW}Usage:${NC}"
  echo "   POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 $0"
  exit 1
fi

if [ -z "$POSTHOG_PROJECT_ID" ]; then
  echo -e "${RED}❌ Error: POSTHOG_PROJECT_ID is required${NC}"
  echo ""
  echo -e "${CYAN}How to find your Project ID:${NC}"
  echo "   Look at your PostHog URL:"
  echo "   https://app.posthog.com/project/${BOLD}<PROJECT_ID>${NC}/feature_flags"
  echo ""
  echo -e "${YELLOW}Usage:${NC}"
  echo "   POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 $0"
  exit 1
fi

# PostHog API base URL (use eu.posthog.com if you're on EU cloud)
POSTHOG_HOST="${POSTHOG_HOST:-https://app.posthog.com}"

# Load config
CONFIG_VERSION=$(jq -r '.metadata.version' "$CONFIG_FILE")
FLAG_COUNT=$(jq '.flags | length' "$CONFIG_FILE")

echo -e "${CYAN}Configuration:${NC}"
echo -e "   Config File:  ${BOLD}$CONFIG_FILE${NC}"
echo -e "   Config Ver:   ${BOLD}$CONFIG_VERSION${NC}"
echo -e "   Total Flags:  ${BOLD}$FLAG_COUNT${NC}"
echo -e "   Host:         ${BOLD}$POSTHOG_HOST${NC}"
echo -e "   Project ID:   ${BOLD}$POSTHOG_PROJECT_ID${NC}"
echo -e "   API Key:      ${BOLD}${POSTHOG_API_KEY:0:10}...${NC}"
if [ -n "$PHASE_FILTER" ]; then
  echo -e "   Phase Filter: ${BOLD}$PHASE_FILTER${NC}"
fi
if [ "$DRY_RUN" = true ]; then
  echo -e "   Mode:         ${YELLOW}${BOLD}DRY RUN (no changes will be made)${NC}"
fi
if [ "$ENABLE_ALL" = true ]; then
  echo -e "   Action:       ${GREEN}${BOLD}Enable All${NC}"
elif [ "$DISABLE_ALL" = true ]; then
  echo -e "   Action:       ${RED}${BOLD}Disable All${NC}"
fi
echo ""

# Test API connection
echo -e "${YELLOW}Testing API connection...${NC}"
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/feature_flags/" \
  -H "Authorization: Bearer $POSTHOG_API_KEY" 2>&1)

if [ "$TEST_RESPONSE" != "200" ]; then
  echo -e "${RED}❌ API connection failed (HTTP $TEST_RESPONSE)${NC}"
  echo "   Please check your API key and Project ID"
  exit 1
fi
echo -e "${GREEN}✅ API connection successful${NC}"
echo ""

# Fetch current flag states from PostHog
echo -e "${YELLOW}Fetching current flag states from PostHog...${NC}"
EXISTING_FLAGS=$(curl -s "$POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/feature_flags/?limit=100" \
  -H "Authorization: Bearer $POSTHOG_API_KEY")
echo -e "${GREEN}✅ Retrieved existing flags${NC}"
echo ""

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}   Feature Flags${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Counters
ENABLED=0
DISABLED=0
SKIPPED=0
FAILED=0
CURRENT_PHASE=""

# Track flags by initial state
FLAGS_ALREADY_ON=""
FLAGS_ALREADY_OFF=""
FLAGS_NOT_CREATED=""

# Process each flag from JSON
while IFS= read -r flag_json; do
  FLAG_KEY=$(echo "$flag_json" | jq -r '.key')
  FLAG_NAME=$(echo "$flag_json" | jq -r '.name')
  FLAG_PHASE=$(echo "$flag_json" | jq -r '.phase')
  FLAG_DESC=$(echo "$flag_json" | jq -r '.description')

  # Check phase filter
  if [ -n "$PHASE_FILTER" ]; then
    if ! echo ",$PHASE_FILTER," | grep -q ",$FLAG_PHASE,"; then
      continue
    fi
  fi

  # Get phase name from config
  PHASE_NAME=$(jq -r ".phases[\"$FLAG_PHASE\"] // \"Unknown\"" "$CONFIG_FILE")

  # Print phase header if changed
  if [ "$FLAG_PHASE" != "$CURRENT_PHASE" ]; then
    CURRENT_PHASE="$FLAG_PHASE"
    echo ""
    echo -e "${BLUE}━━━ Phase $FLAG_PHASE: $PHASE_NAME ━━━${NC}"
    echo ""
  fi

  # Check current state in PostHog
  CURRENT_STATE=$(echo "$EXISTING_FLAGS" | jq -r ".results[] | select(.key == \"$FLAG_KEY\") | .active // false")
  EXISTING_ID=$(echo "$EXISTING_FLAGS" | jq -r ".results[] | select(.key == \"$FLAG_KEY\") | .id // empty")

  if [ "$CURRENT_STATE" = "true" ]; then
    STATE_DISPLAY="${GREEN}ON${NC}"
    FLAGS_ALREADY_ON="${FLAGS_ALREADY_ON}${FLAG_KEY}|${FLAG_NAME}|${FLAG_PHASE}\n"
  elif [ -n "$EXISTING_ID" ]; then
    STATE_DISPLAY="${RED}OFF${NC}"
    FLAGS_ALREADY_OFF="${FLAGS_ALREADY_OFF}${FLAG_KEY}|${FLAG_NAME}|${FLAG_PHASE}\n"
  else
    STATE_DISPLAY="${DIM}Not created${NC}"
    FLAGS_NOT_CREATED="${FLAGS_NOT_CREATED}${FLAG_KEY}|${FLAG_NAME}|${FLAG_PHASE}\n"
  fi

  # Show flag details
  echo -e "${BOLD}Flag:${NC}        $FLAG_KEY"
  echo -e "${BOLD}Name:${NC}        $FLAG_NAME"
  echo -e "${BOLD}Description:${NC} ${DIM}$FLAG_DESC${NC}"
  echo -e "${BOLD}Current:${NC}     $STATE_DISPLAY"
  echo ""

  # Determine action
  ACTION=""
  if [ "$ENABLE_ALL" = true ]; then
    ACTION="enable"
  elif [ "$DISABLE_ALL" = true ]; then
    ACTION="disable"
  elif [ "$AUTO_YES" = false ]; then
    # Interactive prompt
    echo -e "${YELLOW}What would you like to do?${NC}"
    echo -e "   ${GREEN}e${NC} = Enable    ${RED}d${NC} = Disable    ${YELLOW}s${NC} = Skip    ${CYAN}a${NC} = Enable all remaining    ${MAGENTA}q${NC} = Quit"
    echo -ne "${YELLOW}Choice: ${NC}"
    read -r CHOICE

    case $CHOICE in
      [eE])
        ACTION="enable"
        ;;
      [dD])
        ACTION="disable"
        ;;
      [sS])
        echo -e "${YELLOW}⏭️  Skipped${NC}"
        ((SKIPPED++))
        echo ""
        continue
        ;;
      [aA])
        ENABLE_ALL=true
        AUTO_YES=true
        ACTION="enable"
        echo -e "${GREEN}Enabling all remaining flags...${NC}"
        ;;
      [qQ])
        echo ""
        echo -e "${YELLOW}Quitting...${NC}"
        break
        ;;
      *)
        echo -e "${YELLOW}⏭️  Skipped (invalid input)${NC}"
        ((SKIPPED++))
        echo ""
        continue
        ;;
    esac
  fi

  # Execute action
  if [ -n "$ACTION" ]; then
    if [ "$ACTION" = "enable" ]; then
      ACTIVE_VALUE="true"
      ACTION_VERB="Enabling"
      ACTION_PAST="Enabled"
    else
      ACTIVE_VALUE="false"
      ACTION_VERB="Disabling"
      ACTION_PAST="Disabled"
    fi

    echo -ne "${CYAN}   $ACTION_VERB flag...${NC} "

    if [ "$DRY_RUN" = true ]; then
      echo -e "${YELLOW}[DRY RUN] Would be $ACTION_PAST${NC}"
      if [ "$ACTION" = "enable" ]; then
        ((ENABLED++))
      else
        ((DISABLED++))
      fi
    elif [ -n "$EXISTING_ID" ]; then
      # Update existing flag
      UPDATE_RESPONSE=$(curl -s -X PATCH "$POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/feature_flags/$EXISTING_ID/" \
        -H "Authorization: Bearer $POSTHOG_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"active\": $ACTIVE_VALUE, \"filters\": {\"groups\": [{\"properties\": [], \"rollout_percentage\": 100}]}}")

      if echo "$UPDATE_RESPONSE" | jq -e ".active == $ACTIVE_VALUE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${ACTION_PAST}${NC}"
        if [ "$ACTION" = "enable" ]; then
          ((ENABLED++))
        else
          ((DISABLED++))
        fi
      else
        echo -e "${RED}❌ Failed${NC}"
        ((FAILED++))
      fi
    else
      # Create new flag
      CREATE_RESPONSE=$(curl -s -X POST "$POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/feature_flags/" \
        -H "Authorization: Bearer $POSTHOG_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"key\": \"$FLAG_KEY\",
          \"name\": \"$FLAG_NAME\",
          \"active\": $ACTIVE_VALUE,
          \"filters\": {
            \"groups\": [{
              \"properties\": [],
              \"rollout_percentage\": 100
            }]
          }
        }")

      if echo "$CREATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Created & ${ACTION_PAST}${NC}"
        if [ "$ACTION" = "enable" ]; then
          ((ENABLED++))
        else
          ((DISABLED++))
        fi
      else
        echo -e "${RED}❌ Failed to create${NC}"
        ERROR_MSG=$(echo "$CREATE_RESPONSE" | jq -r '.detail // .error // "Unknown error"' 2>/dev/null)
        echo -e "${RED}   Error: $ERROR_MSG${NC}"
        ((FAILED++))
      fi
    fi
  fi
  echo ""

done < <(jq -c '.flags[]' "$CONFIG_FILE")

# Summary
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}   Summary${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   ${GREEN}✅ Enabled:${NC}  $ENABLED"
echo -e "   ${RED}🔴 Disabled:${NC} $DISABLED"
echo -e "   ${YELLOW}⏭️  Skipped:${NC} $SKIPPED"
echo -e "   ${RED}❌ Failed:${NC}   $FAILED"
echo ""

# Show flags by initial state
COUNT_ON=$(echo -e "$FLAGS_ALREADY_ON" | grep -c "|" 2>/dev/null || echo "0")
COUNT_OFF=$(echo -e "$FLAGS_ALREADY_OFF" | grep -c "|" 2>/dev/null || echo "0")
COUNT_NEW=$(echo -e "$FLAGS_NOT_CREATED" | grep -c "|" 2>/dev/null || echo "0")

# Ensure counts are valid integers
COUNT_ON=${COUNT_ON//[^0-9]/}
COUNT_OFF=${COUNT_OFF//[^0-9]/}
COUNT_NEW=${COUNT_NEW//[^0-9]/}
: ${COUNT_ON:=0}
: ${COUNT_OFF:=0}
: ${COUNT_NEW:=0}

if [ "$COUNT_ON" -gt 0 ]; then
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}   Flags Already ON ($COUNT_ON)${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "$FLAGS_ALREADY_ON" | while IFS='|' read -r key name phase; do
    if [ -n "$key" ]; then
      PHASE_NAME=$(jq -r ".phases[\"$phase\"] // \"\"" "$CONFIG_FILE")
      echo -e "   ${GREEN}✅${NC} $key"
      echo -e "      ${DIM}$name (Phase $phase: $PHASE_NAME)${NC}"
    fi
  done
  echo ""
fi

if [ "$COUNT_OFF" -gt 0 ]; then
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}${BOLD}   Flags Currently OFF ($COUNT_OFF)${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "$FLAGS_ALREADY_OFF" | while IFS='|' read -r key name phase; do
    if [ -n "$key" ]; then
      PHASE_NAME=$(jq -r ".phases[\"$phase\"] // \"\"" "$CONFIG_FILE")
      echo -e "   ${RED}🔴${NC} $key"
      echo -e "      ${DIM}$name (Phase $phase: $PHASE_NAME)${NC}"
    fi
  done
  echo ""
fi

if [ "$COUNT_NEW" -gt 0 ]; then
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}${BOLD}   Flags Not Yet Created ($COUNT_NEW)${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "$FLAGS_NOT_CREATED" | while IFS='|' read -r key name phase; do
    if [ -n "$key" ]; then
      PHASE_NAME=$(jq -r ".phases[\"$phase\"] // \"\"" "$CONFIG_FILE")
      echo -e "   ${YELLOW}🆕${NC} $key"
      echo -e "      ${DIM}$name (Phase $phase: $PHASE_NAME)${NC}"
    fi
  done
  echo ""
fi

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}${BOLD}This was a dry run. No changes were made.${NC}"
  echo -e "${YELLOW}Remove --dry-run to apply changes.${NC}"
elif [ $((ENABLED + DISABLED)) -gt 0 ]; then
  echo -e "${GREEN}${BOLD}🎉 Done! Refresh your browser to see the changes.${NC}"
  echo ""
  echo -e "${CYAN}Tip: You may need to clear your browser cache or wait a few seconds${NC}"
  echo -e "${CYAN}     for PostHog to propagate the feature flag changes.${NC}"
fi
echo ""
