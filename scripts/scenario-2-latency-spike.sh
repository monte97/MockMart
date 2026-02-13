#!/bin/bash

echo "🎬 Scenario 2: Latency Spike Demo"
echo "================================="
echo ""

KEYCLOAK_URL="http://localhost"
API_URL="http://localhost"
NOTIFICATION_URL="http://localhost/services/notification"
REALM="techstore"
CLIENT_ID="shop-ui"

# Function to do a checkout
do_checkout() {
  local TOKEN=$1
  local COOKIE_FILE=$2
  local USER_NAME=$3

  # Add item to cart
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"productId":1,"quantity":1}' > /dev/null

  # Checkout
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/checkout" \
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
    }' > /dev/null
}

# Authenticate as luigi (will be slow)
echo "1️⃣  Authenticating users..."
LUIGI_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=${CLIENT_ID}&username=luigi&password=luigi123" | jq -r '.access_token')

if [ "$LUIGI_TOKEN" == "null" ] || [ -z "$LUIGI_TOKEN" ]; then
  echo "❌ Luigi authentication failed. Did you restart Keycloak after adding the user?"
  echo "   Run: docker compose restart keycloak"
  exit 1
fi

# Get Luigi's UUID from token
LUIGI_UUID=$(echo $LUIGI_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.sub')
echo "✅ Luigi authenticated (UUID: ${LUIGI_UUID:0:8}...)"

# Authenticate as mario (will be fast)
MARIO_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=${CLIENT_ID}&username=mario&password=mario123" | jq -r '.access_token')

if [ "$MARIO_TOKEN" == "null" ] || [ -z "$MARIO_TOKEN" ]; then
  echo "❌ Mario authentication failed."
  exit 1
fi
echo "✅ Mario authenticated"
echo ""

# Reset and configure slow template for Luigi
echo "2️⃣  Configuring slow template for Luigi (premium user)..."
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
curl -s -X POST "$NOTIFICATION_URL/config/slow-template" \
  -H "Content-Type: application/json" \
  -d "{\"userIds\":[\"$LUIGI_UUID\"]}" > /dev/null
echo "✅ Slow template enabled for Luigi"
echo ""

# Create cookie files
LUIGI_COOKIE=$(mktemp)
MARIO_COOKIE=$(mktemp)
trap "rm -f $LUIGI_COOKIE $MARIO_COOKIE" EXIT

# Generate traffic
echo "3️⃣  Generating traffic..."
echo ""

# 3 checkouts as Mario (fast)
echo "   Mario (basic template - fast):"
for i in {1..3}; do
  echo -n "     Checkout $i... "
  START=$(date +%s%3N)
  do_checkout "$MARIO_TOKEN" "$MARIO_COOKIE" "mario"
  END=$(date +%s%3N)
  DURATION=$((END - START))
  echo "✅ ${DURATION}ms"
  sleep 0.5
done

echo ""

# 3 checkouts as Luigi (slow)
echo "   Luigi (premium template - slow):"
for i in {1..3}; do
  echo -n "     Checkout $i... "
  START=$(date +%s%3N)
  do_checkout "$LUIGI_TOKEN" "$LUIGI_COOKIE" "luigi"
  END=$(date +%s%3N)
  DURATION=$((END - START))
  echo "⏳ ${DURATION}ms"
  sleep 0.5
done

echo ""
echo "📊 Expected pattern in Grafana:"
echo "  - Mario checkouts: ~300ms (basic template)"
echo "  - Luigi checkouts: ~3300ms (premium template)"
echo ""
echo "🔍 Next steps:"
echo "  1. Open Grafana: http://localhost/grafana"
echo "  2. Go to Explore → Tempo"
echo "  3. Query slow traces: { resource.service.name = \"shop-api\" && duration > 2s }"
echo "  4. Compare with fast: { resource.service.name = \"shop-api\" && duration < 500ms }"
echo "  5. Click on spans to see 'notification.template' attribute"
echo ""

# Reset
echo "4️⃣  Resetting notification service..."
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
echo "✅ Normal mode restored"
