#!/bin/bash

# Scenario 5: PII Filtering with OpenTelemetry Collector
#
# This scenario demonstrates:
# - PII exposure risk when instrumenting services
# - OTel Collector as a filtering gatekeeper
# - Defense in depth: Collector as additional security layer
#
# Requires: make up-keycloak-pii-unsafe (starts with unsafe config)

set -e

KEYCLOAK_URL="http://localhost:8080"
API_URL="http://localhost:3001"
GRAFANA_URL="http://localhost:3005"
REALM="techstore"
CLIENT_ID="shop-ui"
COMPOSE_FILE="docker-compose.keycloak-pii.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SCENARIO 5: PII Filtering with OpenTelemetry Collector${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "This scenario demonstrates:"
echo "  - PII exposure risk when instrumenting third-party services"
echo "  - How to use OTel Collector as a filtering gatekeeper"
echo "  - Defense in depth: Collector as additional security layer"
echo ""

# Check if stack is running
check_stack() {
  if ! curl -s http://localhost:13133/ready > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Stack not running. Please start with: make up-keycloak-pii-unsafe${NC}"
    exit 1
  fi
}

# Get trace ID from Tempo for the most recent checkout
get_latest_trace_id() {
  local MAX_RETRIES=10
  local RETRY=0

  while [ $RETRY -lt $MAX_RETRIES ]; do
    sleep 2
    local TRACE_ID=$(curl -s "${GRAFANA_URL}/api/datasources/proxy/uid/tempo/api/search?q=%7Bname%3D%22POST%20%2Fapi%2Fcheckout%22%7D&limit=1" 2>/dev/null | jq -r '.traces[0].traceID // "not-found"')

    if [ "$TRACE_ID" != "not-found" ] && [ -n "$TRACE_ID" ]; then
      echo "$TRACE_ID"
      return
    fi

    RETRY=$((RETRY + 1))
  done

  echo "not-found"
}

# Authenticate user
authenticate() {
  local USERNAME=$1
  local PASSWORD=$2

  TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=${CLIENT_ID}&username=${USERNAME}&password=${PASSWORD}" | jq -r '.access_token')

  if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo ""
    return 1
  fi

  echo "$TOKEN"
}

# Do checkout and return order ID
do_checkout() {
  local TOKEN=$1
  local COOKIE_FILE=$(mktemp)

  # Add item to cart
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"productId":1,"quantity":1}' > /dev/null

  # Checkout
  local RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "shippingAddress":{
        "firstName":"Mario",
        "lastName":"Rossi",
        "address":"Via Roma 1",
        "city":"Rome",
        "zipCode":"00100",
        "phone":"555-1234"
      },
      "paymentMethod":"credit-card"
    }')

  rm -f "$COOKIE_FILE"

  local ORDER_ID=$(echo "$RESPONSE" | jq -r '.order.id // "unknown"')
  echo "$ORDER_ID"
}

# Check current collector config
get_current_config() {
  # Check which config is mounted by looking at collector logs
  local CONFIG=$(docker exec otel-collector cat /etc/otel-collector-config.yaml 2>/dev/null | head -5 | grep -o 'SAFE\|UNSAFE' || echo "unknown")
  echo "$CONFIG"
}

check_stack

echo -e "${YELLOW}───────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}  PHASE 1: UNSAFE CONFIG (PII Exposed)${NC}"
echo -e "${YELLOW}───────────────────────────────────────────────────────────────${NC}"
echo ""

# Verify unsafe config is active
CURRENT_CONFIG=$(docker exec otel-collector cat /etc/otel-collector-config.yaml 2>/dev/null | head -3)
if echo "$CURRENT_CONFIG" | grep -q "SAFE"; then
  echo -e "${YELLOW}⚠️  Safe config detected. Switching to unsafe for demo...${NC}"
  OTEL_CONFIG=otel-collector-unsafe.yaml docker compose -f "$COMPOSE_FILE" up -d otel-collector
  sleep 5
fi

echo -e "1️⃣  ${BLUE}Authenticating user mario...${NC}"
TOKEN=$(authenticate "mario" "mario123")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed. Is Keycloak running?${NC}"
  exit 1
fi

echo -e "   ${GREEN}✅ Token obtained${NC}"
echo ""

echo -e "2️⃣  ${BLUE}Executing checkout (this generates PII in traces)...${NC}"
ORDER_ID=$(do_checkout "$TOKEN")
echo -e "   ${GREEN}✅ Order #${ORDER_ID} created${NC}"

# Wait for trace to be ingested
echo -e "   ${BLUE}Waiting for trace ingestion...${NC}"
sleep 3
TRACE_ID_UNSAFE=$(get_latest_trace_id)
echo -e "   🔗 Trace ID: ${TRACE_ID_UNSAFE}"
echo ""

echo -e "${RED}⚠️  PII EXPOSED in this trace:${NC}"
echo -e "   ${RED}• enduser.id: mario.rossi@example.com${NC}"
echo -e "   ${RED}• http.url: may contain ?username=...${NC}"
echo -e "   ${RED}• db.statement: may contain WHERE email = '...'${NC}"
echo -e "   ${RED}• Log attributes: email, userEmail visible${NC}"
echo ""

echo -e "📊 View in Grafana: ${BLUE}${GRAFANA_URL}/explore?left=%5B%22now-5m%22,%22now%22,%22tempo%22,%7B%22query%22:%22${TRACE_ID_UNSAFE}%22%7D%5D${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "👆 ${YELLOW}Open Grafana and examine the trace attributes.${NC}"
echo -e "   ${YELLOW}Look for PII in span attributes and logs.${NC}"
echo ""
read -p "Press ENTER to apply PII filtering and continue..."
echo ""

echo -e "${YELLOW}───────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}  SWITCHING TO SAFE CONFIG${NC}"
echo -e "${YELLOW}───────────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "🔄 ${BLUE}Restarting collector with PII filtering enabled...${NC}"

# Switch to safe config by restarting collector with new config
OTEL_CONFIG=otel-collector-config.yaml docker compose -f "$COMPOSE_FILE" up -d otel-collector

echo -e "   ${BLUE}Waiting for collector to be ready...${NC}"
sleep 5

# Verify collector is healthy
if curl -s http://localhost:13133/ready > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ Collector restarted with PII filtering${NC}"
else
  echo -e "   ${RED}❌ Collector not ready. Check logs with: docker logs otel-collector${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}───────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}  PHASE 2: SAFE CONFIG (PII Filtered)${NC}"
echo -e "${GREEN}───────────────────────────────────────────────────────────────${NC}"
echo ""

echo -e "3️⃣  ${BLUE}Executing same checkout with filtering enabled...${NC}"

# Re-authenticate (token may have expired)
TOKEN=$(authenticate "mario" "mario123")
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Re-authentication failed.${NC}"
  exit 1
fi

ORDER_ID_SAFE=$(do_checkout "$TOKEN")
echo -e "   ${GREEN}✅ Order #${ORDER_ID_SAFE} created${NC}"

# Wait for trace to be ingested
echo -e "   ${BLUE}Waiting for trace ingestion...${NC}"
sleep 3
TRACE_ID_SAFE=$(get_latest_trace_id)
echo -e "   🔗 Trace ID: ${TRACE_ID_SAFE}"
echo ""

echo -e "${GREEN}✅ PII FILTERED in this trace:${NC}"
echo -e "   ${GREEN}• enduser.id: sha256:7d4f8c2a... (hashed)${NC}"
echo -e "   ${GREEN}• http.url with sensitive params: [DELETED]${NC}"
echo -e "   ${GREEN}• db.statement with email: [DELETED]${NC}"
echo -e "   ${GREEN}• Log email/password attributes: [DELETED]${NC}"
echo ""

echo -e "📊 View in Grafana: ${BLUE}${GRAFANA_URL}/explore?left=%5B%22now-5m%22,%22now%22,%22tempo%22,%7B%22query%22:%22${TRACE_ID_SAFE}%22%7D%5D${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  COMPARISON SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Attribute              │ UNSAFE              │ SAFE"
echo "───────────────────────┼─────────────────────┼─────────────────────"
echo "enduser.id             │ mario.rossi@exam... │ sha256:7d4f8c2a..."
echo "http.request.body      │ password visible    │ [DELETED]"
echo "http.url (sensitive)   │ ?username=mario...  │ [DELETED]"
echo "db.statement (email)   │ WHERE email='...'   │ [DELETED]"
echo "Log: email attribute   │ visible             │ [DELETED]"
echo "───────────────────────┴─────────────────────┴─────────────────────"
echo ""
echo -e "🔗 ${BLUE}Compare traces in Grafana:${NC}"
echo -e "   UNSAFE: ${GRAFANA_URL}/explore?left=%5B%22now-15m%22,%22now%22,%22tempo%22,%7B%22query%22:%22${TRACE_ID_UNSAFE}%22%7D%5D"
echo -e "   SAFE:   ${GRAFANA_URL}/explore?left=%5B%22now-5m%22,%22now%22,%22tempo%22,%7B%22query%22:%22${TRACE_ID_SAFE}%22%7D%5D"
echo ""
echo -e "${GREEN}✅ Scenario 5 complete!${NC}"
echo ""
echo -e "${YELLOW}Key takeaways:${NC}"
echo "  1. Every service should protect user data at the source"
echo "  2. The Collector is an additional defense layer (defense in depth)"
echo "  3. Essential when instrumenting third-party services (Keycloak, Stripe, etc.)"
echo "  4. Use DELETE for sensitive data, HASH for correlation needs"
echo ""
