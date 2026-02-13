#!/bin/bash

# Traffic generator for demo with Keycloak authentication
COUNT=${1:-50}
KEYCLOAK_URL="http://localhost"
API_URL="http://localhost"
REALM="techstore"
CLIENT_ID="shop-ui"

# Test users (from realm-config.json)
USERS=("mario:mario123" "admin:admin123")

echo "🔐 Authenticating users..."

# Get tokens for each user
declare -A TOKENS
for user_cred in "${USERS[@]}"; do
  USERNAME="${user_cred%%:*}"
  PASSWORD="${user_cred##*:}"

  TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/auth/realms/${REALM}/protocol/openid-connect/token" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=password&client_id=${CLIENT_ID}&username=${USERNAME}&password=${PASSWORD}" | jq -r '.access_token')

  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    TOKENS[$USERNAME]=$TOKEN
    echo "  ✅ $USERNAME authenticated"
  else
    echo "  ❌ Failed to authenticate $USERNAME"
  fi
done

if [ ${#TOKENS[@]} -eq 0 ]; then
  echo "❌ No users authenticated. Is Keycloak running?"
  exit 1
fi

# Convert to array for random selection
USER_NAMES=(${!TOKENS[@]})

echo ""
echo "🚀 Generating $COUNT checkout requests..."

# Create temp dir for cookies
COOKIE_DIR=$(mktemp -d)
trap "rm -rf $COOKIE_DIR" EXIT

for i in $(seq 1 $COUNT); do
  # Pick random user
  RANDOM_USER=${USER_NAMES[$RANDOM % ${#USER_NAMES[@]}]}
  TOKEN=${TOKENS[$RANDOM_USER]}

  # Random product (1-5)
  PRODUCT_ID=$((RANDOM % 5 + 1))
  QUANTITY=$((RANDOM % 3 + 1))

  # Cookie file for this request (maintains session)
  COOKIE_FILE="$COOKIE_DIR/cookies_$i.txt"

  # 1. Add to cart (creates session)
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/cart" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"productId\":$PRODUCT_ID,\"quantity\":$QUANTITY}" > /dev/null 2>&1

  # 2. Checkout (uses same session)
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST "$API_URL/api/checkout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"shippingAddress\":{\"firstName\":\"User\",\"lastName\":\"$i\",\"address\":\"Via Roma $i\",\"city\":\"Rome\",\"zipCode\":\"00100\",\"phone\":\"555-$((1000 + i))\"},\"paymentMethod\":\"credit-card\"}" > /dev/null 2>&1 &

  if [ $((i % 10)) -eq 0 ]; then
    echo "  Progress: $i/$COUNT"
    wait  # Wait for batch to complete
  fi

  sleep 0.02
done

wait
echo ""
echo "✅ Complete: $COUNT requests sent"
echo "📊 View traces in Grafana: http://localhost/grafana"
