#!/bin/bash

# Simple traffic generator for demo
COUNT=${1:-100}

echo "🚀 Generating $COUNT checkout requests..."

for i in $(seq 1 $COUNT); do
  curl -s -X POST http://localhost:3001/api/checkout \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\":\"user$i\",
      \"productId\":\"$((RANDOM % 10 + 1))\",
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

  if [ $((i % 10)) -eq 0 ]; then
    echo "  Progress: $i/$COUNT"
  fi

  sleep 0.05
done

wait
echo "✅ Complete: $COUNT requests sent"
