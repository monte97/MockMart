#!/bin/bash

echo "🎬 Scenario 1: Notification Failure Demo"
echo "========================================="
echo ""

KEYCLOAK_URL="http://localhost:8080"
API_URL="http://localhost:3001"
NOTIFICATION_URL="http://localhost:3009"
REALM="techstore"
CLIENT_ID="shop-ui"

# Authenticate
echo "1️⃣  Authenticating..."
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=password&client_id=${CLIENT_ID}&username=mario&password=mario123" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed. Is Keycloak running?"
  exit 1
fi
echo "✅ Authenticated as mario"
echo ""

# Enable invalid email simulation
echo "2️⃣  Enabling invalid email simulation on notification service..."
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
curl -s -X POST "$NOTIFICATION_URL/config/simulate-invalid-email" > /dev/null
echo "✅ Invalid email mode enabled"
echo ""

# Create cookie file for session
COOKIE_FILE=$(mktemp)
trap "rm -f $COOKIE_FILE" EXIT

# Add item to cart
echo "3️⃣  Adding item to cart..."
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/cart" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":1,"quantity":1}' > /dev/null
echo "✅ Item added to cart"
echo ""

# Trigger checkout (notification will fail with 400)
echo "4️⃣  Triggering checkout (notification will fail)..."
RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/checkout" \
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

ORDER_ID=$(echo "$RESPONSE" | jq -r '.order.id // .orderId // empty')

echo ""
echo "📊 Results:"
echo "  - Checkout returned: ✅ 200 OK"
if [ -n "$ORDER_ID" ]; then
  echo "  - Order saved in DB: ✅ Yes"
  echo "  - Order ID: $ORDER_ID"
else
  echo "  - Order response: $RESPONSE"
fi
echo "  - Notification sent: ❌ NO (invalid email error)"
echo ""
echo "🔍 Next steps:"
echo "  1. Open Grafana: http://localhost:3005"
echo "  2. Go to Explore → Tempo"
if [ -n "$ORDER_ID" ]; then
  echo "  3. Query TraceQL: { span.order_id = $ORDER_ID }"
fi
echo "  4. Observe the trace and find the failed notification span"
echo "  5. Click 'View Logs' to see the error details"
echo ""

# Reset simulation
echo "5️⃣  Resetting notification service..."
curl -s -X POST "$NOTIFICATION_URL/config/reset" > /dev/null
echo "✅ Normal mode restored"
