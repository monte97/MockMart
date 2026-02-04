#!/bin/bash

echo "🎬 Scenario 2: Latency Spike Demo"
echo "================================="
echo ""

# Reset and configure slow template
echo "1️⃣  Configuring slow template for specific users..."
curl -s -X POST http://localhost:3009/config/reset > /dev/null
curl -s -X POST http://localhost:3009/config/slow-template \
  -H "Content-Type: application/json" \
  -d '{"userIds":["alice","user5","user15","user25"]}' > /dev/null
echo "✅ Slow template enabled for: alice, user5, user15, user25"
echo ""

# Generate mixed traffic
echo "2️⃣  Generating mixed traffic (50 requests)..."
for i in {1..50}; do
  USER_ID="user$i"
  if [ $i -eq 5 ] || [ $i -eq 15 ] || [ $i -eq 25 ]; then
    echo "  Request $i: $USER_ID (slow) ⏳"
  fi

  curl -s -X POST http://localhost:3001/api/checkout \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\":\"$USER_ID\",
      \"productId\":\"123\",
      \"shippingAddress\":{
        \"firstName\":\"User\",
        \"lastName\":\"$i\",
        \"address\":\"123 Main St\",
        \"city\":\"Rome\",
        \"zipCode\":\"00100\",
        \"phone\":\"555-1234\"
      },
      \"paymentMethod\":\"credit-card\"
    }" > /dev/null &

  # Small delay to avoid overwhelming
  sleep 0.1
done

wait
echo "✅ Traffic generation complete"
echo ""

echo "📊 Expected Results:"
echo "  - p50 latency: ~280ms (fast)"
echo "  - p99 latency: ~3400ms (slow template users)"
echo ""
echo "🔍 Next steps:"
echo "  1. Open Grafana: http://localhost:3005"
echo "  2. Go to Explore → Tempo"
echo "  3. Query: {service.name=\"shop-api\"} | duration > 3s"
echo "  4. Compare slow vs fast traces"
echo "  5. Check span attributes for 'notification.template'"
echo ""
