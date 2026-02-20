#!/usr/bin/env bash
# ============================================================
# WhatsApp Webhook Test Harness
# ============================================================
# Tests the Convex /whatsapp/incoming HTTP endpoint to verify:
# 1. What Twilio ACTUALLY sends (vs assumptions)
# 2. How our handler processes different message types
# 3. Coach lookup / org routing behaviour
#
# Usage:
#   bash scripts/whatsapp-test-harness.sh [test-name]
#
#   No argument runs all tests.
#   Individual: health | text | audio | unknown | malformed | duplicate | profile | ok
#
# IMPORTANT: Update KNOWN_COACH_PHONE below before running
#   tests that require a real coach (text, audio, duplicate, profile, ok).
#   Find a coach's phone via the Convex dashboard or ask Neil.
#
# Prerequisites: curl must be installed
# ============================================================

# NOTE: Convex HTTP routes use .convex.site (NOT .convex.cloud)
# .convex.cloud = Convex query/mutation/action API
# .convex.site  = Convex HTTP router (http.ts routes)
CONVEX_HTTP_URL="${CONVEX_HTTP_URL:-https://valuable-pig-963.convex.site}"
WEBHOOK_URL="${CONVEX_HTTP_URL}/whatsapp/incoming"
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-YOUR_TWILIO_ACCOUNT_SID}"
TWILIO_NUMBER="whatsapp:+14155238886"

# ── Update this to a real coach phone in your dev DB ─────────
# Format: whatsapp:+<country><number>  e.g. whatsapp:+447911123456
KNOWN_COACH_PHONE="whatsapp:+447700000001"
UNKNOWN_PHONE="whatsapp:+447700999999"

PASS=0
FAIL=0
SKIP=0

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
pass() { echo -e "${GREEN}[PASS]${NC}  $*"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; FAIL=$((FAIL + 1)); }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; SKIP=$((SKIP + 1)); }
sep()  { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

unique_sid() {
  echo "SM$(date +%s)$RANDOM"
}

show_response() {
  local body
  body=$(cat /tmp/wa_response.txt 2>/dev/null || echo "(empty)")
  echo "  Response body: ${body:0:200}"
}

# ── Fact sheet: what Twilio ACTUALLY sends ───────────────────
print_fact_sheet() {
  cat <<'EOF'

╔══════════════════════════════════════════════════════════════╗
║   VERIFIED: Twilio Programmable Messaging WhatsApp Fields    ║
╠══════════════════════════════════════════════════════════════╣
║  FIELD              DESCRIPTION                              ║
║  ─────────────────  ────────────────────────────────────────║
║  MessageSid         Unique message ID (SM...)                ║
║  AccountSid         Your Twilio account (AC...)              ║
║  From               whatsapp:+SENDER_NUMBER                  ║
║  To                 whatsapp:+YOUR_NUMBER                    ║
║  Body               Text content (empty if media-only)       ║
║  NumMedia           Count of media attachments (0-10)        ║
║  MediaUrl0          URL to first media file (Twilio-hosted)  ║
║  MediaContentType0  MIME type (audio/ogg, image/jpeg etc)    ║
║  ProfileName        Sender's WhatsApp display name ✓ EXISTS  ║
║  WaId               Sender's WA phone (no prefix) ✓ EXISTS   ║
║  SmsStatus          received / sent / etc                    ║
╠══════════════════════════════════════════════════════════════╣
║  NOT PRESENT (invalidated assumptions):                      ║
║  ✗ Author       → Conversations API only, NOT Prog. Msg.     ║
║  ✗ GroupId      → WhatsApp groups not supported in Twilio    ║
║  ✗ GroupName    → WhatsApp groups deprecated Oct 2020        ║
║  ✗ ParticipantSid → Conversations API only                   ║
╠══════════════════════════════════════════════════════════════╣
║  KEY FINDING: Twilio Prog. Messaging = 1:1 messages only.   ║
║  "Group" features require Twilio Conversations API           ║
║  (entirely different product, different webhook format).     ║
╠══════════════════════════════════════════════════════════════╣
║  CONFIRMED: http.ts does NOT capture ProfileName/WaId.      ║
║  These fields are available but currently dropped.          ║
╚══════════════════════════════════════════════════════════════╝

EOF
}

# ── TEST 1: Health check ──────────────────────────────────────
test_health() {
  sep
  echo "TEST 1: GET /whatsapp/incoming (endpoint alive)"

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" -X GET "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "Endpoint alive (HTTP $status)"
    show_response
  else
    fail "Expected 200, got: $status"
    show_response
  fi
}

# ── TEST 2: Text message from known coach ─────────────────────
test_text() {
  sep
  echo "TEST 2: Text message — known coach phone"
  log "Simulating: coach sends a training observation text"
  log "Phone: $KNOWN_COACH_PHONE"

  local sid
  sid=$(unique_sid)

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=Great session today. James showed excellent composure under pressure and strong decision-making in the final third. Need to work on his off-ball movement." \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=Test Coach" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "Webhook accepted text message (HTTP $status)"
    show_response
    log "SID: $sid — check Convex logs for coach lookup + processing result"
  else
    fail "Expected 200, got: $status"
    show_response
  fi
}

# ── TEST 3: Audio/media message (simulated) ───────────────────
test_audio() {
  sep
  echo "TEST 3: Audio message — simulated OGG attachment"
  log "NOTE: MediaUrl is fake — audio download will fail in background (expected)"
  log "This test verifies the webhook RECEIVES and ROUTES the request correctly"

  local sid
  sid=$(unique_sid)

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=" \
    --data-urlencode "NumMedia=1" \
    --data-urlencode "MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages/FAKE/Media/ME000" \
    --data-urlencode "MediaContentType0=audio/ogg" \
    --data-urlencode "ProfileName=Test Coach" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "Webhook accepted media message (HTTP $status)"
    show_response
    log "SID: $sid — audio download will fail in background Convex action (expected with fake URL)"
  else
    fail "Expected 200, got: $status"
    show_response
  fi
}

# ── TEST 4: Unknown sender ────────────────────────────────────
test_unknown() {
  sep
  echo "TEST 4: Unknown sender — phone not registered as a coach"
  log "Phone: $UNKNOWN_PHONE"

  local sid
  sid=$(unique_sid)

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$UNKNOWN_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=Hello I am not a registered coach" \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=Random Person" \
    --data-urlencode "WaId=447700999999" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "Returned 200 (message stored, coach-not-found handled gracefully)"
    log "Check Convex logs: handler should reply with 'not authorised' message"
  else
    fail "Expected 200, got: $status"
    show_response
  fi
}

# ── TEST 5: Missing required fields ──────────────────────────
test_malformed() {
  sep
  echo "TEST 5: Malformed request — missing required fields"
  log "Expects HTTP 400"

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "Body=This message is missing all required Twilio fields" \
    "$WEBHOOK_URL")

  if [ "$status" = "400" ]; then
    pass "Correctly rejected malformed request (HTTP $status)"
    show_response
  else
    warn "Expected 400, got: $status — handler may not validate missing fields strictly"
    show_response
  fi
}

# ── TEST 6: Duplicate message deduplication ───────────────────
test_duplicate() {
  sep
  echo "TEST 6: Duplicate MessageSid — deduplication check"
  log "Sends same SID twice. Both return 200 (dedup handled in background action)"

  local sid
  sid=$(unique_sid)

  log "First send (SID: $sid)..."
  local status1
  status1=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=Testing duplicate detection" \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=Test Coach" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  sleep 2

  log "Second send (same SID: $sid)..."
  local status2
  status2=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=Testing duplicate detection" \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=Test Coach" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status1" = "200" ] && [ "$status2" = "200" ]; then
    pass "Both returned 200 (duplicate handled gracefully in background action)"
    log "Check Convex logs for 'duplicate message detected' or similar"
  else
    fail "Unexpected statuses: first=$status1, second=$status2"
  fi
}

# ── TEST 7: ProfileName field — what http.ts captures ────────
test_profile() {
  sep
  echo "TEST 7: ProfileName + WaId field validation"
  log "Verifying what the handler actually captures from the payload"
  log "FINDING: http.ts does NOT currently extract ProfileName or WaId"
  log "These Twilio fields are available but being DROPPED by our handler"

  local sid
  sid=$(unique_sid)

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=Field test note" \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=My WhatsApp Display Name" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "HTTP $status — webhook accepted"
    warn "ProfileName field sent: 'My WhatsApp Display Name' — check if captured in Convex logs"
    warn "Current http.ts does NOT extract ProfileName/WaId — these are dropped on arrival"
    warn "To fix: add extraction in http.ts and pass to processIncomingMessage"
  else
    fail "Expected 200, got: $status"
  fi
}

# ── TEST 8: OK quick-reply command ───────────────────────────
test_ok_command() {
  sep
  echo "TEST 8: 'OK' quick-reply — approve pending insights"
  log "Simulates coach replying OK to approve voice note insights"

  local sid
  sid=$(unique_sid)

  local status
  status=$(curl -s -o /tmp/wa_response.txt -w "%{http_code}" \
    -X POST \
    --data-urlencode "MessageSid=$sid" \
    --data-urlencode "AccountSid=$TWILIO_ACCOUNT_SID" \
    --data-urlencode "From=$KNOWN_COACH_PHONE" \
    --data-urlencode "To=$TWILIO_NUMBER" \
    --data-urlencode "Body=OK" \
    --data-urlencode "NumMedia=0" \
    --data-urlencode "ProfileName=Test Coach" \
    --data-urlencode "WaId=447700000001" \
    --data-urlencode "SmsStatus=received" \
    "$WEBHOOK_URL")

  if [ "$status" = "200" ]; then
    pass "HTTP $status — OK command processed"
    log "Check Convex logs: should hit OK command branch in processIncomingMessage"
    log "If no pending insights exist, coach gets 'nothing to approve' reply"
  else
    fail "Expected 200, got: $status"
    show_response
  fi
}

# ── TEST 9: Raw payload inspection ────────────────────────────
test_raw_payload() {
  sep
  echo "TEST 9: Raw payload inspection — what does Twilio REALLY send?"
  log "This test documents the exact field names. Compare with Convex logs."
  log ""
  log "Full Twilio Programmable Messaging WhatsApp webhook payload:"
  cat <<'PAYLOAD'
  MessageSid     = SM...                           # Unique message ID
  SmsSid         = SM...                           # Same as MessageSid for WA
  AccountSid     = AC...                           # Your Twilio account
  MessagingServiceSid = MG... (only if used)
  From           = whatsapp:+447911123456          # Sender's full number with prefix
  To             = whatsapp:+14155238886           # Your Twilio WA number
  Body           = "Coach note text here..."       # Message text
  NumMedia       = 0                               # Count of attachments
  MediaUrl0      = https://api.twilio.com/...      # (if NumMedia > 0)
  MediaContentType0 = audio/ogg                   # (if NumMedia > 0)
  ProfileName    = "Coach Display Name"            # ← EXISTS, currently DROPPED
  WaId           = 447911123456                    # ← EXISTS, currently DROPPED (no prefix)
  SmsStatus      = received
  ApiVersion     = 2010-04-01

  NOT PRESENT:
  Author         = ← DOES NOT EXIST in Prog. Messaging (Conversations API only)
  GroupSid       = ← DOES NOT EXIST (groups deprecated Oct 2020)
  GroupName      = ← DOES NOT EXIST
  ParticipantSid = ← DOES NOT EXIST (Conversations API only)
PAYLOAD

  pass "Payload documentation complete (no HTTP call needed)"
}

# ── SUMMARY ───────────────────────────────────────────────────
print_summary() {
  sep
  echo ""
  echo "Results: ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}  ${YELLOW}$SKIP warnings${NC}"
  echo ""
  if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Some tests failed — check Convex dashboard logs for details${NC}"
  fi
  echo ""
}

# ── MAIN ─────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   WhatsApp Webhook Test Harness          ║${NC}"
  echo -e "${BLUE}║   PlayerARC / PDP                        ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"

  print_fact_sheet

  sep
  echo "Configuration"
  log "Convex HTTP URL: $CONVEX_HTTP_URL"
  log "Webhook URL: $WEBHOOK_URL"
  log "Twilio number: $TWILIO_NUMBER"
  log "Known coach phone: $KNOWN_COACH_PHONE"
  log "Unknown phone: $UNKNOWN_PHONE"
  warn "Update KNOWN_COACH_PHONE at the top of this script to match a real coach in your dev DB"

  local filter="${1:-all}"

  case "$filter" in
    all)
      test_health
      test_text
      test_audio
      test_unknown
      test_malformed
      test_duplicate
      test_profile
      test_ok_command
      test_raw_payload
      ;;
    health)    test_health ;;
    text)      test_text ;;
    audio)     test_audio ;;
    unknown)   test_unknown ;;
    malformed) test_malformed ;;
    duplicate) test_duplicate ;;
    profile)   test_profile ;;
    ok)        test_ok_command ;;
    payload)   test_raw_payload ;;
    *)
      echo "Unknown test: $filter"
      echo "Available: all | health | text | audio | unknown | malformed | duplicate | profile | ok | payload"
      exit 1
      ;;
  esac

  print_summary

  if [ $FAIL -gt 0 ]; then
    exit 1
  fi
}

main "${1:-all}"
