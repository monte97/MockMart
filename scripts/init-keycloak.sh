#!/bin/bash

# Keycloak Initialization Script
# This script waits for Keycloak to be ready and verifies the realm is imported

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${REALM:-techstore}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "============================================"
echo "Keycloak Initialization Script"
echo "============================================"
echo ""
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $REALM"
echo ""

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
retries=0
until curl -sf "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ $retries -ge $MAX_RETRIES ]; then
    echo "Keycloak did not become ready in time. Exiting."
    exit 1
  fi
  echo "  Attempt $retries/$MAX_RETRIES - Keycloak not ready yet, waiting ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "Keycloak is ready!"
echo ""

# Verify realm exists
echo "Verifying realm '$REALM' exists..."
REALM_CHECK=$(curl -sf "$KEYCLOAK_URL/realms/$REALM" 2>&1) || true

if echo "$REALM_CHECK" | grep -q "\"realm\":\"$REALM\""; then
  echo "Realm '$REALM' is available!"
else
  echo "WARNING: Realm '$REALM' might not be fully imported yet."
  echo "Please verify manually or wait a few seconds and try again."
fi

echo ""
echo "============================================"
echo "Keycloak Setup Complete!"
echo "============================================"
echo ""
echo "Access Points:"
echo "  - Admin Console: $KEYCLOAK_URL/admin"
echo "    Username: admin"
echo "    Password: admin"
echo ""
echo "  - Realm: $KEYCLOAK_URL/realms/$REALM"
echo ""
echo "Test Users:"
echo "  - admin@techstore.com / admin123 (Admin)"
echo "  - mario.rossi@example.com / mario123 (User)"
echo "  - blocked@example.com / blocked123 (Blocked User)"
echo ""
echo "Clients:"
echo "  - shop-ui: Public client for frontend (PKCE enabled)"
echo "  - shop-api: Confidential client for backend (Service Account enabled)"
echo ""
