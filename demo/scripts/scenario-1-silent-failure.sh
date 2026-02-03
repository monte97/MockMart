#!/bin/bash

echo "🎬 Scenario 1: Silent Failure Demo"
echo "=================================="
echo ""

# Enable timeout simulation
echo "1️⃣  Enabling timeout simulation..."
curl -s -X POST http://localhost:3009/config/reset > /dev/null
curl -s -X POST http://localhost:3009/config/simulate-timeout > /dev/null
echo "✅ Timeout mode enabled"
echo ""

# Trigger checkout (will timeout but return 200)
echo "2️⃣  Triggering checkout (will fail silently)..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"alice",
    "productId":"123",
    "shippingAddress":{
      "firstName":"Alice",
      "lastName":"Smith",
      "address":"123 Main St",
      "city":"Rome",
      "zipCode":"00100",
      "phone":"555-1234"
    },
    "paymentMethod":"credit-card"
  }')

echo "Response: $RESPONSE"
echo ""

ORDER_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

echo "📊 Results:"
echo "  - Checkout returned: ✅ 200 OK"
echo "  - Order saved in DB: ✅ Yes (ID: $ORDER_ID)"
echo "  - Notification sent: ❌ NO (timeout)"
echo ""
echo "🔍 Next steps:"
echo "  1. Open Grafana: http://localhost:3005"
echo "  2. Go to Explore → Tempo"
echo "  3. Search: {service.name=\"shop-api\"} | order_id=\"$ORDER_ID\""
echo "  4. Observe span 'HTTP POST /send' with ERROR status"
echo ""
