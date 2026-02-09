# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Base Stack - Workshop and simple demos
make up

# Data Management Stack - Production-like with tail sampling
make up-data-management

# OTEL Keycloak - Debug authentication with native tracing
make up-otel-keycloak

# Stop and cleanup
make down
make clean                   # Removes volumes (deletes DB data)

# Health check
make health

# Individual services: start, stop, restart, rebuild, logs
make rebuild-{ui,api,notification,payment,inventory}
make logs-{api,notification,payment,inventory}
```

## Architecture

```
Gateway (nginx:80)
├── /        → shop-ui (React SPA, :3000)
├── /api/    → shop-api (Node.js/Express, :3001)
├── /auth/   → keycloak (:8080)
└── /grafana/→ grafana (:3005)

shop-api → postgres (orders DB)
shop-api → payment-service (:3010)      # Fan-out
shop-api → inventory-service (:3011)    # Fan-out
shop-api → notification-service (:3009) # M2M via Client Credentials
```

**Authentication Flow:**
1. Frontend uses Keycloak OIDC with Authorization Code + PKCE
2. Backend validates JWT via JWKS (jose library)
3. M2M calls use Client Credentials flow (shop-api → services)

## Key Services

| Service | Port | Stack | Entry Point |
|---------|------|-------|-------------|
| shop-ui | 3000 | React 18 + Vite | `src/main.jsx` |
| shop-api | 3001 | Express + OTEL | `server.js` |
| notification | 3009 | Express + OTEL | `server.js` |
| payment | 3010 | Express + OTEL | `server.js` |
| inventory | 3011 | Express + OTEL | `server.js` |
| keycloak | 8080 | Keycloak 26.0 | Realm: `techstore` |
| postgres | 5432 | PostgreSQL 18 | DB: `orders`, User: `demo/demo123` |

## Stack Variants

| Command | Description | Use Case |
|---------|-------------|----------|
| `make up` | Base with grafana | Workshop, demos |
| `make up-data-management` | Separated OTEL stack | Tail sampling, production-like |
| `make up-otel-keycloak` | Keycloak native tracing | Auth debugging |

## Development Notes

**React Frontend (shop-ui):**
- State management via React Context (`AuthContext`, `CartContext`)
- Keycloak integration in `src/contexts/AuthContext.jsx`
- API calls through `src/services/api.js`
- Vite proxy configured for `/api` routes in dev mode

**Node.js Services (shop-api, notification, payment, inventory):**
- OTEL auto-instrumentation loaded via `--require ./instrumentation.js`
- Pino logger with trace correlation in `lib/logger.js`
- JWT validation middleware in `middleware/auth.js`
- Service tokens for M2M in `lib/service-token.js`
- Config endpoints for scenarios: `/config/simulate-slow`, `/config/reset`
- Swagger docs at `http://localhost:3001/api-docs`

**Environment Variables (shop-api):**
- `PAYMENT_SERVICE_URL=http://payment-service:3010`
- `INVENTORY_SERVICE_URL=http://inventory-service:3011`
- `NOTIFICATION_SERVICE_URL=http://notification-service:3009`
- `KEYCLOAK_AUTH_PATH=/auth`

**Keycloak Configuration:**
- Realm config: `services/keycloak/realm-config.json`
- Auth path: `/auth` (included in issuer URLs)
- Custom claim: `canCheckout` controls checkout access
- Roles: `admin`, `user` (mapped to `roles` claim, not `realm_access.roles`)

## Test Users

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| admin | admin123 | admin | Full access + product CRUD |
| mario | mario123 | user | Standard user |
| blocked | blocked123 | user | canCheckout=false |

## Common Issues

**401 on API calls:** Check that `KEYCLOAK_AUTH_PATH=/auth` is set. Token issuer must match `http://localhost:8080/auth/realms/techstore`.

**Null user_id in orders:** Ensure realm-config.json includes `oidc-sub-mapper` in protocolMappers.

**Admin link not showing:** Roles come from `tokenParsed.roles` (custom mapper), not `realm_access.roles`.

**Payment/Inventory timeout:** Services need 10-15s to start. Run `make health` to verify.

**Tail sampling not working:** Only available with `make up-data-management`. Verify with `make check-sampling`.

## Demo Scenarios

```bash
make traffic      # 50 baseline requests
make scenario-1   # Silent failure: notification error
make scenario-2   # Latency spike: slow template
make scenario-3   # Fan-out debug: parallel service delays
make scenario-4   # Data management: tail sampling + retention (requires up-data-management)
```

Scenario 3 tests Payment/Inventory delays with configurable latency. Script outputs direct Grafana trace links for comparison.

Scenario 4 demonstrates tail sampling (90% drop rate) and retention (5 min in demo). Requires `make up-data-management` stack.

View traces in Grafana: `http://localhost/grafana` → Explore → Tempo
