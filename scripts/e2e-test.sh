#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# e2e-test.sh — End-to-end smoke tests for the Roy AI Agency backend.
#
# Usage:
#   BASE_URL=http://localhost:3001 ./scripts/e2e-test.sh
#
# Environment:
#   BASE_URL   Backend origin (default: http://localhost:3001)
#
# Prerequisites:
#   - curl, jq installed
#   - Backend running at BASE_URL with seed data for agency@demo.com / demo123
#
# Exit code:
#   0  all tests passed (or skipped)
#   1  one or more tests failed
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass_count=0
fail_count=0
skip_count=0

pass()  { echo -e "  ${GREEN}[PASS]${RESET} $*"; ((pass_count++)); }
fail()  { echo -e "  ${RED}[FAIL]${RESET} $*"; ((fail_count++)); }
skip()  { echo -e "  ${YELLOW}[SKIP]${RESET} $*"; ((skip_count++)); }
info()  { echo -e "  ${CYAN}      ${RESET} $*"; }
header(){ echo -e "\n${BOLD}$*${RESET}"; }

# ── Dependency check ───────────────────────────────────────────────────────────
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}ERROR:${RESET} '$cmd' is required but not installed." >&2
    exit 1
  fi
done

echo -e "\n${BOLD}Roy AI Agency — E2E Test Suite${RESET}"
echo "  BASE_URL: ${BASE_URL}"
echo "  Date:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# ─────────────────────────────────────────────────────────────────────────────
# Shared curl wrapper
#   Usage: do_curl <METHOD> <PATH> [extra curl args...]
#   Stores response in: $BODY (JSON), $HTTP_STATUS, $HEADERS
# ─────────────────────────────────────────────────────────────────────────────
BODY=""
HTTP_STATUS=""
HEADERS=""

do_curl() {
  local method="$1"
  local path="$2"
  shift 2

  local tmp_headers
  tmp_headers=$(mktemp)

  local response
  response=$(curl -s -X "$method" \
    --dump-header "$tmp_headers" \
    -o - \
    "$BASE_URL$path" \
    "$@") || true

  BODY="$response"
  HEADERS=$(cat "$tmp_headers")
  HTTP_STATUS=$(grep -E "^HTTP/" "$tmp_headers" | tail -1 | awk '{print $2}')
  rm -f "$tmp_headers"
}

# ─────────────────────────────────────────────────────────────────────────────
# Flow 0 — Login
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 0 — Login"

do_curl POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agency@demo.com","password":"demo123"}'

AUTH_TOKEN=""
if [[ "$HTTP_STATUS" == "200" ]]; then
  AUTH_TOKEN=$(echo "$BODY" | jq -r '.token // empty' 2>/dev/null || true)
fi

if [[ "$HTTP_STATUS" == "200" && -n "$AUTH_TOKEN" && "$AUTH_TOKEN" != "null" ]]; then
  pass "POST /api/auth/login → 200, token extracted"
else
  fail "POST /api/auth/login → HTTP $HTTP_STATUS, no token. Response: $BODY"
  echo -e "\n${RED}Cannot continue without a valid auth token. Aborting.${RESET}"
  echo -e "\n${BOLD}Summary:${RESET} ${RED}${fail_count} failed${RESET}, ${GREEN}${pass_count} passed${RESET}, ${YELLOW}${skip_count} skipped${RESET}"
  exit 1
fi

AUTH_HDR=(-H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json")

# ─────────────────────────────────────────────────────────────────────────────
# Flow 1 — AI reply in Inbox (Conversations)
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 1 — AI Reply in Inbox (Conversations)"

do_curl GET "/api/conversations?page=1&limit=1" "${AUTH_HDR[@]}"

CONV_ID=""
if [[ "$HTTP_STATUS" == "200" ]]; then
  CONV_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null || true)
fi

if [[ -z "$CONV_ID" || "$CONV_ID" == "null" ]]; then
  skip "GET /api/conversations → no conversations found, skipping generate step"
else
  pass "GET /api/conversations → 200, first id: ${CONV_ID:0:8}…"

  # Check rate-limit headers if present
  RL_REMAINING=$(echo "$HEADERS" | grep -i "x-ratelimit-remaining" | awk '{print $2}' | tr -d '\r' || true)
  if [[ -n "$RL_REMAINING" ]]; then
    info "x-ratelimit-remaining: $RL_REMAINING"
  fi

  do_curl POST /api/conversations/generate-reply \
    "${AUTH_HDR[@]}" \
    -d "{\"conversationId\":\"${CONV_ID}\"}"

  HAS_REPLY=$(echo "$BODY" | jq 'has("reply")' 2>/dev/null || echo "false")

  if [[ "$HTTP_STATUS" == "200" && "$HAS_REPLY" == "true" ]]; then
    REPLY_STATUS=$(echo "$BODY" | jq -r '.replyStatus // "unknown"')
    CONFIDENCE=$(echo "$BODY" | jq -r '.confidence // "?"')
    pass "POST /api/conversations/generate-reply → 200, reply present (status=${REPLY_STATUS}, confidence=${CONFIDENCE})"
  else
    fail "POST /api/conversations/generate-reply → HTTP $HTTP_STATUS, reply key missing. Body: $BODY"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Flow 2 — AI reply in Comments
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 2 — AI Reply in Comments"

do_curl GET "/api/comments?page=1&limit=1" "${AUTH_HDR[@]}"

COMMENT_ID=""
if [[ "$HTTP_STATUS" == "200" ]]; then
  COMMENT_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null || true)
fi

if [[ -z "$COMMENT_ID" || "$COMMENT_ID" == "null" ]]; then
  skip "GET /api/comments → no comments found, skipping generate step"
else
  pass "GET /api/comments → 200, first id: ${COMMENT_ID:0:8}…"

  do_curl POST /api/comments/generate-reply \
    "${AUTH_HDR[@]}" \
    -d "{\"commentId\":\"${COMMENT_ID}\"}"

  HAS_REPLY=$(echo "$BODY" | jq 'has("reply")' 2>/dev/null || echo "false")

  if [[ "$HTTP_STATUS" == "200" && "$HAS_REPLY" == "true" ]]; then
    REPLY_STATUS=$(echo "$BODY" | jq -r '.replyStatus // "unknown"')
    CONFIDENCE=$(echo "$BODY" | jq -r '.confidence // "?"')
    pass "POST /api/comments/generate-reply → 200, reply present (status=${REPLY_STATUS}, confidence=${CONFIDENCE})"
  else
    fail "POST /api/comments/generate-reply → HTTP $HTTP_STATUS, reply key missing. Body: $BODY"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Flow 3 — Content post creation
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 3 — Content Post Creation"

# The content route is agency-only and requires x-client-id to scope to a client.
# First, fetch the agency's managed clients to get a real client id.
do_curl GET "/api/clients" "${AUTH_HDR[@]}"

CLIENT_ID=""
if [[ "$HTTP_STATUS" == "200" ]]; then
  CLIENT_ID=$(echo "$BODY" | jq -r '.[0].clientId // .data[0].clientId // empty' 2>/dev/null || true)
fi

CONTENT_HDR=("${AUTH_HDR[@]}")
if [[ -n "$CLIENT_ID" && "$CLIENT_ID" != "null" ]]; then
  CONTENT_HDR+=(-H "x-client-id: ${CLIENT_ID}")
  info "Using client id: ${CLIENT_ID:0:8}… for content creation"
fi

do_curl POST /api/content \
  "${CONTENT_HDR[@]}" \
  -d '{"content":"E2E test post","platforms":["instagram"],"scheduledAt":null}'

HAS_ID=$(echo "$BODY" | jq 'has("id")' 2>/dev/null || echo "false")

if [[ "$HTTP_STATUS" == "201" && "$HAS_ID" == "true" ]]; then
  POST_ID=$(echo "$BODY" | jq -r '.id')
  pass "POST /api/content → 201, post id: ${POST_ID:0:8}…"
elif [[ "$HTTP_STATUS" == "403" && -z "$CLIENT_ID" ]]; then
  # Agency has no clients yet — 403 is expected behaviour without x-client-id
  skip "POST /api/content → 403 (no managed clients in DB, x-client-id unavailable)"
else
  fail "POST /api/content → HTTP $HTTP_STATUS, id missing. Body: $BODY"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Flow 4 — Outreach create (email channel)
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 4 — Outreach Create"

# POST /api/outreach requires x-client-id for agency role users
OUTREACH_HDR=("${AUTH_HDR[@]}")
if [[ -n "$CLIENT_ID" && "$CLIENT_ID" != "null" ]]; then
  OUTREACH_HDR+=(-H "x-client-id: ${CLIENT_ID}")
  info "Using client id: ${CLIENT_ID:0:8}… for outreach creation"
fi

do_curl POST /api/outreach \
  "${OUTREACH_HDR[@]}" \
  -d '{
    "title": "E2E Test Email",
    "channel": "email",
    "messageBody": "Hello, this is an automated E2E test message.",
    "subject": "E2E Test",
    "audienceFilter": {"type": "all"}
  }'

HAS_ID=$(echo "$BODY" | jq 'has("id")' 2>/dev/null || echo "false")

if [[ "$HTTP_STATUS" == "201" && "$HAS_ID" == "true" ]]; then
  OUTREACH_ID=$(echo "$BODY" | jq -r '.id')
  pass "POST /api/outreach → 201, outreach id: ${OUTREACH_ID:0:8}…"
elif [[ "$HTTP_STATUS" == "403" && -z "$CLIENT_ID" ]]; then
  skip "POST /api/outreach → 403 (no managed clients in DB, x-client-id unavailable)"
else
  fail "POST /api/outreach → HTTP $HTTP_STATUS. Body: $BODY"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Flow 5 — Agency→Client data isolation
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 5 — Agency→Client Data Isolation"

# Request 1: no x-client-id (data scoped to agency's own account)
do_curl GET "/api/conversations?page=1&limit=10" "${AUTH_HDR[@]}"

if [[ "$HTTP_STATUS" != "200" ]]; then
  fail "GET /api/conversations (no x-client-id) → HTTP $HTTP_STATUS (expected 200)"
else
  TOTAL_NO_HEADER=$(echo "$BODY" | jq '.pagination.total // (.data | length)' 2>/dev/null || echo "0")
  pass "GET /api/conversations (no x-client-id) → 200, total: $TOTAL_NO_HEADER"

  # Request 2: with a fake UUID that is definitely not a managed client
  FAKE_CLIENT_ID="00000000-0000-4000-8000-000000000001"

  do_curl GET "/api/conversations?page=1&limit=10" \
    "${AUTH_HDR[@]}" \
    -H "x-client-id: ${FAKE_CLIENT_ID}"

  if [[ "$HTTP_STATUS" == "403" ]]; then
    # Expected: middleware rejects unknown client with 403
    pass "GET /api/conversations (fake x-client-id) → 403 (access denied, correct isolation)"
  elif [[ "$HTTP_STATUS" == "200" ]]; then
    TOTAL_FAKE=$(echo "$BODY" | jq '.pagination.total // (.data | length)' 2>/dev/null || echo "0")
    # If 200, the totals should differ OR both empty — data must be scoped
    if [[ "$TOTAL_FAKE" != "$TOTAL_NO_HEADER" || "$TOTAL_FAKE" == "0" ]]; then
      pass "GET /api/conversations (fake x-client-id) → 200, scoped total differs ($TOTAL_NO_HEADER vs $TOTAL_FAKE)"
    else
      fail "GET /api/conversations (fake x-client-id) → 200 but same total as no-header ($TOTAL_NO_HEADER) — isolation may be missing"
    fi
  else
    fail "GET /api/conversations (fake x-client-id) → HTTP $HTTP_STATUS (unexpected)"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Flow 6 — 401 auto-logout (invalid token)
# ─────────────────────────────────────────────────────────────────────────────
header "Flow 6 — 401 on Invalid Token"

do_curl GET /api/conversations \
  -H "Authorization: Bearer invalid_token_xyz" \
  -H "Content-Type: application/json"

if [[ "$HTTP_STATUS" == "401" ]]; then
  pass "GET /api/conversations (invalid token) → 401 Unauthorized"
else
  fail "GET /api/conversations (invalid token) → HTTP $HTTP_STATUS (expected 401). Body: $BODY"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo -e " ${BOLD}Test Summary${RESET}"
echo "─────────────────────────────────────────────────────────────────────────────"
echo -e "  ${GREEN}Passed:${RESET}  $pass_count"
echo -e "  ${RED}Failed:${RESET}  $fail_count"
echo -e "  ${YELLOW}Skipped:${RESET} $skip_count"
echo "─────────────────────────────────────────────────────────────────────────────"

if [[ "$fail_count" -gt 0 ]]; then
  echo -e "  ${RED}${BOLD}RESULT: FAILED${RESET}"
  exit 1
else
  echo -e "  ${GREEN}${BOLD}RESULT: ALL CHECKS PASSED${RESET}"
  exit 0
fi
