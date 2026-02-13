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

Only port 80 is exposed on the host. All access goes through the nginx gateway.

```
Gateway (nginx:80) — single entry point
├── /            → shop-ui (React SPA)
├── /api/        → shop-api (Node.js/Express)
├── /auth/       → keycloak
├── /grafana/    → grafana
├── /services/notification/  → notification-service
├── /services/payment/       → payment-service
├── /services/inventory/     → inventory-service
├── /services/collector/metrics → otel-collector (data-management/keycloak-pii only)
└── /health/{service}        → health endpoints for all services

shop-api → postgres (orders DB)
shop-api → payment-service      # Fan-out
shop-api → inventory-service    # Fan-out
shop-api → notification-service # M2M via Client Credentials
```

**Authentication Flow:**
1. Frontend uses Keycloak OIDC with Authorization Code + PKCE
2. Backend validates JWT via JWKS (jose library)
3. M2M calls use Client Credentials flow (shop-api → services)

## Key Services

| Service | Internal Port | External Access | Entry Point |
|---------|---------------|-----------------|-------------|
| shop-ui | 3000 | `http://localhost` | `src/main.jsx` |
| shop-api | 3001 | `http://localhost/api/` | `server.js` |
| notification | 3009 | `http://localhost/services/notification/` | `server.js` |
| payment | 3010 | `http://localhost/services/payment/` | `server.js` |
| inventory | 3011 | `http://localhost/services/inventory/` | `server.js` |
| keycloak | 8080 | `http://localhost/auth/` | Realm: `techstore` |
| grafana | 3000 | `http://localhost/grafana/` | — |
| postgres | 5432 | internal only | DB: `orders`, User: `demo/demo123` |

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
- Keycloak URL derived from `window.location.origin` (works with any hostname/port)
- API calls through `src/services/api.js`
- Vite proxy configured for `/api` routes in dev mode

**Node.js Services (shop-api, notification, payment, inventory):**
- OTEL auto-instrumentation loaded via `--require ./instrumentation.js`
- Pino logger with trace correlation in `lib/logger.js`
- JWT validation middleware in `middleware/auth.js`
- Service tokens for M2M in `lib/service-token.js`
- Config endpoints for scenarios: `/config/simulate-slow`, `/config/reset`
- Swagger docs at `http://localhost/api/api-docs`

**Environment Variables (shop-api):**
- `PAYMENT_SERVICE_URL=http://payment-service:3010`
- `INVENTORY_SERVICE_URL=http://inventory-service:3011`
- `NOTIFICATION_SERVICE_URL=http://notification-service:3009`
- `KEYCLOAK_PUBLIC_URL=http://localhost` (JWT issuer validation via gateway)
- `KEYCLOAK_AUTH_PATH=/auth`

**Keycloak Configuration:**
- Realm config: `services/keycloak/realm-config.json`
- Auth path: `/auth` (included in issuer URLs)
- Custom claim: `canCheckout` controls checkout access
- Roles: `admin`, `user` (mapped to `roles` claim, not `realm_access.roles`)

**Nginx Gateway (`services/gateway/nginx.conf`):**
- Static upstreams for core services (shop-ui, shop-api, keycloak, grafana, notification, payment, inventory)
- Docker DNS resolver (`127.0.0.11`) for optional observability services (collector, tempo, prometheus, loki)
- Health endpoints at `/health/{service}` for all services

## Test Users

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| admin | admin123 | admin | Full access + product CRUD |
| mario | mario123 | user | Standard user |
| blocked | blocked123 | user | canCheckout=false |

## Common Issues

**401 on API calls:** Check that `KEYCLOAK_AUTH_PATH=/auth` is set. Token issuer must match `http://localhost/auth/realms/techstore`.

**Null user_id in orders:** Ensure realm-config.json includes `oidc-sub-mapper` in protocolMappers.

**Admin link not showing:** Roles come from `tokenParsed.roles` (custom mapper), not `realm_access.roles`.

**Payment/Inventory timeout:** Services need 10-15s to start. Run `make health` to verify.

**Tail sampling not working:** Only available with `make up-data-management`. Verify with `make check-sampling`.

**Health check shows unhealthy after startup:** Tempo/Loki need ~30s to start. Wait and retry `make health-data-management`.

## Demo Scenarios

```bash
make traffic      # 50 baseline requests
make scenario-1   # Silent failure: notification error
make scenario-2   # Latency spike: slow template
make scenario-3   # Fan-out debug: parallel service delays
make scenario-4   # Data management: tail sampling + retention (requires up-data-management)
make scenario-5   # PII filtering: Keycloak trace sanitization (requires up-keycloak-pii)
```

Scenario 3 tests Payment/Inventory delays with configurable latency. Script outputs direct Grafana trace links for comparison.

Scenario 4 demonstrates tail sampling (90% drop rate) and retention (5 min in demo). Requires `make up-data-management` stack.

View traces in Grafana: `http://localhost/grafana` → Explore → Tempo
