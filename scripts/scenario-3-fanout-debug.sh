#!/bin/bash

echo "🎬 Scenario 3: Fan-out Debug Demo"
echo "=================================="
echo ""
echo "This scenario demonstrates debugging a slow checkout"
echo "when multiple services are involved (fan-out pattern)."
echo ""

KEYCLOAK_URL="http://localhost"
API_URL="http://localhost"
PAYMENT_URL="http://localhost/services/payment"
INVENTORY_URL="http://localhost/services/inventory"
NOTIFICATION_URL="http://localhost/services/notification"
GRAFANA_URL="http://localhost/grafana"
REALM="techstore"
CLIENT_ID="shop-ui"

# Function to get the most recent checkout trace ID from Tempo
# Waits for a new trace (different from the previous one)
get_latest_trace_id() {
  local PREV_TRACE=$1
  local MAX_RETRIES=5
  local RETRY=0

  while [ $RETRY -lt $MAX_RETRIES ]; do
    sleep 2  # Wait for trace to be ingested
    local TRACE_ID=$(curl -s "${GRAFANA_URL}/api/datasources/proxy/uid/tempo/api/search?q=%7Bname%3D%22POST%20%2Fapi%2Fcheckout%22%7D&limit=1" | jq -r '.traces[0].traceID // "not-found"')

    # If no previous trace or trace is different, return it
    if [ -z "$PREV_TRACE" ] || [ "$TRACE_ID" != "$PREV_TRACE" ]; then
      echo "$TRACE_ID"
      return
    fi

    RETRY=$((RETRY + 1))
  done

  echo "not-found"
}

# Function to do a checkout and return duration
do_checkout() {
  local TOKEN=$1
  local COOKIE_FILE=$2
  local USER_NAME=$3

  # Add item to cart
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"productId":1,"quantity":1}' > /dev/null

  # Checkout and measure time
  local START=$(date +%s%3N)
  local RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "shippingAddress":{
        "firstName":"Test",
        "lastName":"User",
        "address":"Via Roma 1",
        "city":"Rome",
        "zipCode":"00100",
        "phone":"555-1234"
      },
      "paymentMethod":"credit-card"
    }')
  local END=$(date +%s%3N)
  local DURATION=$((END - START))

  echo "$DURATION"
}

# Authenticate
echo "1️⃣  Authenticating..."
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=${CLIENT_ID}&username=mario&password=mario123" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed. Is Keycloak running?"
  exit 1
fi

# Get Mario's UUID from token for slow-template configuration
MARIO_UUID=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.sub')
echo "✅ Authenticated as mario (UUID: ${MARIO_UUID:0:8}...)"
echo ""

# Reset all services
echo "2️⃣  Resetting all services to normal mode..."
curl -s -X POST "$PAYMENT_URL/config/reset" > /dev/null
curl -s -X POST "$INVENTORY_URL/config/reset" > /dev/null
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
echo "✅ All services reset"
echo ""

# Create cookie file
COOKIE_FILE=$(mktemp)
trap "rm -f $COOKIE_FILE" EXIT

# Initialize previous trace ID
PREV_TRACE=""

# Baseline checkout
echo "3️⃣  Baseline checkout (all services normal)..."
BASELINE=$(do_checkout "$TOKEN" "$COOKIE_FILE" "mario")
TRACE_BASELINE=$(get_latest_trace_id "$PREV_TRACE")
PREV_TRACE=$TRACE_BASELINE
echo "   ⏱️  Baseline: ${BASELINE}ms"
echo "   🔗 Trace: ${TRACE_BASELINE}"
echo ""

# Test with slow payment
echo "4️⃣  Checkout with SLOW PAYMENT SERVICE (2s delay)..."
curl -s -X POST "$PAYMENT_URL/config/simulate-slow" > /dev/null
SLOW_PAYMENT=$(do_checkout "$TOKEN" "$COOKIE_FILE" "mario")
TRACE_PAYMENT=$(get_latest_trace_id "$PREV_TRACE")
PREV_TRACE=$TRACE_PAYMENT
echo "   ⏱️  With slow payment: ${SLOW_PAYMENT}ms"
echo "   🔗 Trace: ${TRACE_PAYMENT}"
curl -s -X POST "$PAYMENT_URL/config/reset" > /dev/null
echo ""

# Test with slow inventory
echo "5️⃣  Checkout with SLOW INVENTORY SERVICE (1.5s delay)..."
curl -s -X POST "$INVENTORY_URL/config/simulate-slow" > /dev/null
SLOW_INVENTORY=$(do_checkout "$TOKEN" "$COOKIE_FILE" "mario")
TRACE_INVENTORY=$(get_latest_trace_id "$PREV_TRACE")
PREV_TRACE=$TRACE_INVENTORY
echo "   ⏱️  With slow inventory: ${SLOW_INVENTORY}ms"
echo "   🔗 Trace: ${TRACE_INVENTORY}"
curl -s -X POST "$INVENTORY_URL/config/reset" > /dev/null
echo ""

# Test with slow notification
echo "6️⃣  Checkout with SLOW NOTIFICATION SERVICE (3s delay)..."
curl -s -X POST "$NOTIFICATION_URL/config/slow-template" \
  -H "Content-Type: application/json" \
  -d "{\"userIds\":[\"$MARIO_UUID\"]}" > /dev/null
SLOW_NOTIFICATION=$(do_checkout "$TOKEN" "$COOKIE_FILE" "mario")
TRACE_NOTIFICATION=$(get_latest_trace_id "$PREV_TRACE")
echo "   ⏱️  With slow notification: ${SLOW_NOTIFICATION}ms"
echo "   🔗 Trace: ${TRACE_NOTIFICATION}"
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
echo ""

# Summary
echo "📊 Results Summary:"
echo "==================="
echo ""
echo "   Scenario           | Duration | Trace ID"
echo "   -------------------|----------|----------------------------------"
echo "   Baseline (normal)  | ${BASELINE}ms     | ${TRACE_BASELINE}"
echo "   + Slow Payment     | ${SLOW_PAYMENT}ms | ${TRACE_PAYMENT}"
echo "   + Slow Inventory   | ${SLOW_INVENTORY}ms | ${TRACE_INVENTORY}"
echo "   + Slow Notification| ${SLOW_NOTIFICATION}ms | ${TRACE_NOTIFICATION}"
echo ""
echo "🔗 Direct links to traces in Grafana:"
echo ""
echo "   Baseline:     ${GRAFANA_URL}/explore?schemaVersion=1&panes=%7B%22abc%22:%7B%22datasource%22:%22tempo%22,%22queries%22:%5B%7B%22query%22:%22${TRACE_BASELINE}%22%7D%5D%7D%7D"
echo "   Slow Payment: ${GRAFANA_URL}/explore?schemaVersion=1&panes=%7B%22abc%22:%7B%22datasource%22:%22tempo%22,%22queries%22:%5B%7B%22query%22:%22${TRACE_PAYMENT}%22%7D%5D%7D%7D"
echo "   Slow Inventory: ${GRAFANA_URL}/explore?schemaVersion=1&panes=%7B%22abc%22:%7B%22datasource%22:%22tempo%22,%22queries%22:%5B%7B%22query%22:%22${TRACE_INVENTORY}%22%7D%5D%7D%7D"
echo "   Slow Notification: ${GRAFANA_URL}/explore?schemaVersion=1&panes=%7B%22abc%22:%7B%22datasource%22:%22tempo%22,%22queries%22:%5B%7B%22query%22:%22${TRACE_NOTIFICATION}%22%7D%5D%7D%7D"
echo ""
echo "🔍 Debug Challenge:"
echo "   Without distributed tracing, you see: 'Checkout is slow'"
echo "   With distributed tracing, you see WHICH service added the latency."
echo ""
echo "💡 Key insight:"
echo "   The trace waterfall shows a fan-out pattern:"
echo ""
echo "   POST /api/checkout"
echo "   ├─ POST /api/inventory/check    (~30ms or 1500ms if slow)"
echo "   ├─ POST /api/payments/process   (~70ms or 2000ms if slow)"
echo "   ├─ POST /api/inventory/reserve  (~20ms)"
echo "   ├─ pg.query INSERT              (~15ms)"
echo "   └─ POST /api/notifications      (~50ms or 3000ms if slow)"
echo ""
