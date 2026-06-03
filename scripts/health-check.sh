#!/usr/bin/env bash
# Uptime monitor for GET /health
# Usage: ./scripts/health-check.sh [BASE_URL]
# Designed to run as a cron job or be called by an uptime service.
# Exits 0 if healthy, 1 if degraded or unreachable.
#
# Example crontab (every 5 min, alert to Slack):
#   */5 * * * * /path/to/health-check.sh https://your-api.railway.app >> /var/log/health.log 2>&1

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3001}}"
HEALTH_URL="${BASE_URL}/health"
TIMEOUT_SECS=10
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

response=$(curl -sf --max-time "$TIMEOUT_SECS" \
  -w "\n%{http_code}" \
  "$HEALTH_URL" 2>/dev/null) || {
  echo -e "${RED}[${TS}] UNREACHABLE${NC}: ${HEALTH_URL} (curl failed)"
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -sf -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🔴 *Roy AI Agency backend is DOWN*\n\`${HEALTH_URL}\` is unreachable at ${TS}\"}" \
      >/dev/null 2>&1 || true
  fi
  exit 1
}

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

db_status=$(echo "$body" | grep -o '"db":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")

if [ "$http_code" = "200" ] && [ "$db_status" = "connected" ]; then
  echo -e "${GREEN}[${TS}] HEALTHY${NC}: HTTP ${http_code}, db=${db_status}"
  exit 0
elif [ "$http_code" = "200" ]; then
  echo -e "${YELLOW}[${TS}] DEGRADED${NC}: HTTP ${http_code}, db=${db_status}"
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -sf -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🟡 *Roy AI Agency backend DEGRADED*\nDB: ${db_status} at ${TS}\"}" \
      >/dev/null 2>&1 || true
  fi
  exit 1
else
  echo -e "${RED}[${TS}] DOWN${NC}: HTTP ${http_code}, db=${db_status}"
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -sf -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🔴 *Roy AI Agency backend DOWN*\nHTTP ${http_code} at ${TS}\"}" \
      >/dev/null 2>&1 || true
  fi
  exit 1
fi
