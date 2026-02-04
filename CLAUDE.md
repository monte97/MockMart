# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Start all services (with health checks)
make up

# Stop all services
make down

# Clean restart (removes volumes - deletes DB data)
make clean && make up

# Check services health
make health

# Individual service management: start, stop, restart, rebuild, logs
make rebuild-ui          # Rebuild React app
make rebuild-api         # Rebuild Node.js API
make logs-api            # Follow shop-api logs
make logs-notification   # Follow notification logs
```

## Architecture

```
Gateway (nginx:80)
├── /        → shop-ui (React SPA, :3000)
├── /api/    → shop-api (Node.js/Express, :3001)
├── /auth/   → keycloak (:8080)
└── /grafana/→ grafana-lgtm (:3005)

shop-api → postgres (orders DB)
shop-api → notification-service (M2M via Client Credentials)
```

**Authentication Flow:**
1. Frontend uses Keycloak OIDC with Authorization Code + PKCE
2. Backend validates JWT via JWKS (jose library)
3. M2M calls use Client Credentials flow (shop-api → notification)

## Key Services

| Service | Port | Stack | Entry Point |
|---------|------|-------|-------------|
| shop-ui | 3000 | React 18 + Vite | `src/main.jsx` |
| shop-api | 3001 | Express + OpenTelemetry | `server.js` (via `instrumentation.js`) |
| notification | 3009 | Express + OpenTelemetry | `server.js` (via `instrumentation.js`) |
| keycloak | 8080 | Keycloak 26.0 | Realm: `techstore` |
| postgres | 5432 | PostgreSQL 18 | DB: `orders`, User: `demo/demo123` |

## Development Notes

**React Frontend (shop-ui):**
- State management via React Context (`AuthContext`, `CartContext`)
- Keycloak integration in `src/contexts/AuthContext.jsx`
- API calls through `src/services/api.js`
- Vite proxy configured for `/api` routes in dev mode

**Node.js Services (shop-api, notification):**
- OTEL auto-instrumentation loaded via `--require ./instrumentation.js`
- JWT validation middleware in `middleware/auth.js`
- Service tokens for M2M in `lib/service-token.js`
- Swagger docs at `http://localhost:3001/api-docs`

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

## Demo Scenarios

```bash
make traffic      # Generate 50 baseline requests
make scenario-1   # Silent failure: notification timeout
make scenario-2   # Latency spike: slow template for specific users
```

View traces in Grafana: `make grafana` → Explore → Tempo
