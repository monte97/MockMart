#!/bin/bash

echo "🎬 Scenario 4: Data Management Demo"
echo "===================================="
echo ""
echo "Questo scenario dimostra:"
echo "  - Tail sampling: 90% drop rate, 100% errori mantenuti"
echo "  - Retention: trace eliminate dopo 5 minuti"
echo ""

KEYCLOAK_URL="http://localhost"
API_URL="http://localhost"
NOTIFICATION_URL="http://localhost/services/notification"
PAYMENT_URL="http://localhost/services/payment"
COLLECTOR_URL="http://localhost/services/collector"
GRAFANA_URL="http://localhost/grafana"
REALM="techstore"
CLIENT_ID="shop-ui"

# Parse arguments
MODE="full"
if [ "$1" == "--error" ]; then
  MODE="error"
elif [ "$1" == "--slow" ]; then
  MODE="slow"
elif [ "$1" == "--traffic" ]; then
  MODE="traffic"
elif [ "$1" == "--check" ]; then
  MODE="check"
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage: $0 [--error|--slow|--traffic|--check|--help]"
  echo ""
  echo "  (no args)  Run full demo (traffic + error + slow + metrics)"
  echo "  --error    Generate single request that triggers an error"
  echo "  --slow     Generate single slow request (>1s)"
  echo "  --traffic  Generate 50 normal requests"
  echo "  --check    Check tail sampling metrics"
  echo ""
  exit 0
fi

# Function: authenticate
authenticate() {
  local user=$1
  local pass=$2
  TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=${CLIENT_ID}&username=${user}&password=${pass}" | jq -r '.access_token')

  if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed for $user. Is Keycloak running?"
    exit 1
  fi
  echo "$TOKEN"
}

# Function: checkout with trace ID capture
do_checkout() {
  local token=$1
  local cookie_file=$(mktemp)
  trap "rm -f $cookie_file" RETURN

  # Add to cart
  curl -s -c "$cookie_file" -b "$cookie_file" -X POST "$API_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d '{"productId":1,"quantity":1}' > /dev/null

  # Checkout and capture response headers for trace ID
  local response=$(curl -s -c "$cookie_file" -b "$cookie_file" -X POST "$API_URL/api/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
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

  echo "$response"
}

# Function: get collector metrics
get_metrics() {
  echo ""
  echo "📊 Tail Sampling Metrics:"
  echo "-------------------------"

  # Get metrics
  local metrics=$(curl -s "$COLLECTOR_URL/metrics" 2>/dev/null)

  if [ -z "$metrics" ]; then
    echo "❌ Cannot reach collector at $COLLECTOR_URL"
    echo "   Is the data-management stack running? (make up-data-management)"
    return 1
  fi

  # Parse key metrics
  local accepted=$(echo "$metrics" | grep "otelcol_receiver_accepted_spans_total" | grep "otlp" | awk '{sum+=$2} END {print sum}')
  local sampled=$(echo "$metrics" | grep 'otelcol_processor_tail_sampling_global_count_traces_sampled_total' | grep 'sampled="true"' | awk '{sum+=$2} END {print sum}')
  local not_sampled=$(echo "$metrics" | grep 'otelcol_processor_tail_sampling_global_count_traces_sampled_total' | grep 'sampled="false"' | awk '{sum+=$2} END {print sum}')
  local dropped=${not_sampled:-0}
  local exported=$(echo "$metrics" | grep "otelcol_exporter_sent_spans_total" | grep "otlp/tempo" | awk '{sum+=$2} END {print sum}')

  # Handle empty values
  accepted=${accepted:-0}
  sampled=${sampled:-0}
  dropped=${dropped:-0}
  exported=${exported:-0}

  local total_traces=$(( sampled + dropped ))

  echo "  Span ricevuti (accepted):    $accepted"
  echo "  Trace campionate (kept):     $sampled"
  echo "  Trace scartate (dropped):    $dropped"
  echo "  Span esportati (to Tempo):   $exported"

  if [ "$total_traces" -gt 0 ]; then
    local drop_rate=$(echo "scale=1; $dropped * 100 / $total_traces" | bc 2>/dev/null || echo "N/A")
    echo ""
    echo "  📉 Drop rate: ${drop_rate}%"
    echo ""
    if (( $(echo "$drop_rate > 80" | bc -l 2>/dev/null || echo 0) )); then
      echo "  ✅ Tail sampling funziona correttamente (target: ~90%)"
    elif [ "$drop_rate" != "N/A" ]; then
      echo "  ⚠️  Drop rate basso - genera più traffico normale"
    fi
  else
    echo ""
    echo "  ⚠️  Nessuna trace processata ancora. Genera traffico con: make traffic"
  fi
}

# ============================================
# MAIN EXECUTION
# ============================================

case $MODE in
  "check")
    get_metrics
    exit 0
    ;;

  "traffic")
    echo "1️⃣  Generating 50 normal requests..."
    echo "    (These will be sampled at 10%)"
    echo ""
    ./scripts/generate-traffic.sh 50
    echo ""
    get_metrics
    exit 0
    ;;

  "error")
    echo "1️⃣  Authenticating..."
    TOKEN=$(authenticate "mario" "mario123")
    echo "✅ Authenticated as mario"
    echo ""

    echo "2️⃣  Enabling error simulation..."
    curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
    curl -s -X POST "$NOTIFICATION_URL/config/simulate-invalid-email" > /dev/null
    echo "✅ Error mode enabled"
    echo ""

    echo "3️⃣  Triggering checkout (will fail)..."
    RESPONSE=$(do_checkout "$TOKEN")
    ORDER_ID=$(echo "$RESPONSE" | jq -r '.order.id // .orderId // empty')
    echo "✅ Checkout completed with notification error"
    echo ""

    echo "4️⃣  Resetting..."
    curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
    echo ""

    echo "📊 Result:"
    echo "  - Order ID: ${ORDER_ID:-N/A}"
    echo "  - Error trace: KEPT (100% - errors policy)"
    echo ""
    echo "🔍 Verify in Grafana:"
    echo "  Query: { status = error }"
    if [ -n "$ORDER_ID" ]; then
      echo "  Or: { span.order_id = $ORDER_ID }"
    fi
    exit 0
    ;;

  "slow")
    echo "1️⃣  Authenticating..."
    TOKEN=$(authenticate "mario" "mario123")
    echo "✅ Authenticated as mario"
    echo ""

    echo "2️⃣  Enabling slow mode (2s delay)..."
    curl -s -X POST "$PAYMENT_URL/config/reset" > /dev/null
    curl -s -X POST "$PAYMENT_URL/config/simulate-slow?delay=2000" > /dev/null
    echo "✅ Slow mode enabled"
    echo ""

    echo "3️⃣  Triggering checkout (will be slow)..."
    START=$(date +%s%N)
    RESPONSE=$(do_checkout "$TOKEN")
    END=$(date +%s%N)
    DURATION=$(( (END - START) / 1000000 ))
    ORDER_ID=$(echo "$RESPONSE" | jq -r '.order.id // .orderId // empty')
    echo "✅ Checkout completed in ${DURATION}ms"
    echo ""

    echo "4️⃣  Resetting..."
    curl -s -X POST "$PAYMENT_URL/config/reset" > /dev/null
    echo ""

    echo "📊 Result:"
    echo "  - Order ID: ${ORDER_ID:-N/A}"
    echo "  - Duration: ${DURATION}ms"
    echo "  - Slow trace: KEPT (100% - latency policy)"
    echo ""
    echo "🔍 Verify in Grafana:"
    echo "  Query: { duration > 1s }"
    if [ -n "$ORDER_ID" ]; then
      echo "  Or: { span.order_id = $ORDER_ID }"
    fi
    exit 0
    ;;

  "full")
    # Full demo: baseline + error + slow + metrics comparison

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STEP 1: Baseline Metrics"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    get_metrics
    BASELINE_ACCEPTED=$(curl -s "$COLLECTOR_URL/metrics" | grep "otelcol_receiver_accepted_spans_total" | grep "otlp" | awk '{sum+=$2} END {print sum}')
    BASELINE_ACCEPTED=${BASELINE_ACCEPTED:-0}
    echo ""

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STEP 2: Generate Normal Traffic (50 requests)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "These requests will be sampled at 10%..."
    echo ""
    ./scripts/generate-traffic.sh 50 2>/dev/null
    echo ""
    sleep 2  # Wait for processing

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STEP 3: Generate Error Request"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "This request will be KEPT (100% - errors policy)..."
    echo ""
    TOKEN=$(authenticate "mario" "mario123")
    curl -s -X POST "$NOTIFICATION_URL/config/simulate-invalid-email" > /dev/null
    ERROR_RESPONSE=$(do_checkout "$TOKEN")
    ERROR_ORDER_ID=$(echo "$ERROR_RESPONSE" | jq -r '.order.id // .orderId // empty')
    curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
    echo "✅ Error request completed (Order ID: ${ERROR_ORDER_ID:-N/A})"
    echo ""
    sleep 1

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STEP 4: Generate Slow Request"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "This request will be KEPT (100% - latency policy)..."
    echo ""
    curl -s -X POST "$PAYMENT_URL/config/simulate-slow?delay=2000" > /dev/null
    START=$(date +%s%N)
    SLOW_RESPONSE=$(do_checkout "$TOKEN")
    END=$(date +%s%N)
    DURATION=$(( (END - START) / 1000000 ))
    SLOW_ORDER_ID=$(echo "$SLOW_RESPONSE" | jq -r '.order.id // .orderId // empty')
    curl -s -X POST "$PAYMENT_URL/config/reset" > /dev/null
    echo "✅ Slow request completed in ${DURATION}ms (Order ID: ${SLOW_ORDER_ID:-N/A})"
    echo ""
    sleep 2  # Wait for processing

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STEP 5: Final Metrics"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    get_metrics
    echo ""

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "SUMMARY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Tail Sampling Results:"
    echo "  - 50 normal requests → ~5 traces kept (10%)"
    echo "  - 1 error request    → 1 trace kept (100%)"
    echo "  - 1 slow request     → 1 trace kept (100%)"
    echo ""
    echo "🔍 Verify in Grafana ($GRAFANA_URL):"
    echo ""
    echo "  1. Error trace (should exist):"
    echo "     Query: { status = error }"
    [ -n "$ERROR_ORDER_ID" ] && echo "     Or: { span.order_id = $ERROR_ORDER_ID }"
    echo ""
    echo "  2. Slow trace (should exist):"
    echo "     Query: { duration > 1s }"
    [ -n "$SLOW_ORDER_ID" ] && echo "     Or: { span.order_id = $SLOW_ORDER_ID }"
    echo ""
    echo "  3. Normal traces (only ~10% should exist):"
    echo "     Query: { resource.service.name = \"shop-api\" }"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "RETENTION TEST"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "La retention nella demo e' configurata a 5 minuti."
    echo "Dopo 5 minuti, le trace di questo test non saranno piu' visibili."
    echo ""
    echo "Per verificare:"
    echo "  1. Cerca ora una trace: { span.order_id = $ERROR_ORDER_ID }"
    echo "  2. Aspetta 5+ minuti"
    echo "  3. Cerca di nuovo: la trace non sara' piu' trovata"
    echo ""
    ;;
esac
