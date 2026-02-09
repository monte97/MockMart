# MockMart

E-commerce demo application instrumented with OpenTelemetry for observability workshops and demonstrations.

## Quick Start

Choose the stack based on your needs:

```bash
# Base Stack - Workshop and simple demos
make up

# Data Management Stack - Production-like with tail sampling (90% data reduction)
make up-data-management

# OTEL Keycloak - Debug authentication with native Keycloak tracing
make up-otel-keycloak
```

```bash
# Check services health
make health
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Gateway (nginx:80)                            │
└────┬──────────────┬──────────────┬──────────────┬──────────────┬────────┘
     │              │              │              │              │
┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐   ┌─────▼─────┐
│ Shop UI │   │ Shop API  │  │ Keycloak  │  │ Grafana │   │  Swagger  │
│  :3000  │   │   :3001   │  │   :8080   │  │  :3005  │   │(API :3001)│
└─────────┘   └─────┬─────┘  └───────────┘  └─────────┘   └───────────┘
                    │
      ┌─────────────┼─────────────┬─────────────┐
      │             │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌────▼────┐
│  Payment  │ │ Inventory │ │Notification│ │PostgreSQL│
│   :3010   │ │   :3011   │ │   :3009   │ │  :5432  │
└───────────┘ └───────────┘ └───────────┘ └─────────┘
       └── Fan-out pattern (parallel calls) ──┘
```

## Access Points

| Service | URL | Stack | Credentials |
|---------|-----|-------|-------------|
| Shop UI | http://localhost | All | - |
| Shop API | http://localhost/api/products | All | - |
| Swagger UI | http://localhost:3001/api-docs | All | - |
| Grafana | http://localhost/grafana | All | (anonymous) |
| Keycloak Admin | http://localhost/auth/admin | All | admin / admin |
| Tempo | http://localhost:3200 | Data Mgmt | - |
| Prometheus | http://localhost:9090 | Data Mgmt | - |
| Loki | http://localhost:3100 | Data Mgmt | - |

## Test Users

| Username | Password | Role | Checkout |
|----------|----------|------|----------|
| admin | admin123 | Admin | Enabled |
| mario | mario123 | User | Enabled |
| blocked | blocked123 | User | Blocked |

---

## Base Stack

Standard configuration with Grafana LGTM (all-in-one observability).

### Services

| Service | Port | Description |
|---------|------|-------------|
| shop-ui | 3000 | React 18 + Vite SPA |
| shop-api | 3001 | Express API + OTEL |
| notification | 3009 | Order notifications |
| payment | 3010 | Payment processing |
| inventory | 3011 | Stock management |
| keycloak | 8080 | Identity provider |
| grafana | 3005 | Traces, Logs, Metrics |
| postgres | 5432 | Orders database |

### Make Commands

```bash
# Lifecycle
make up / down / restart / clean
make health / status / logs

# Individual services
make start-{ui,api,notification,payment,inventory}
make stop-{ui,api,notification,payment,inventory}
make restart-{ui,api,notification,payment,inventory}
make rebuild-{ui,api,notification,payment,inventory}
make logs-{ui,api,notification,payment,inventory}
```

### API Endpoints

Full interactive documentation at **Swagger UI**: http://localhost:3001/api-docs

#### Products
- `GET /api/products` - List products (filters: ?category=, ?search=, ?sort=)
- `GET /api/products/:id` - Product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

#### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add product
- `PUT /api/cart/:productId` - Update quantity
- `DELETE /api/cart/:productId` - Remove product

#### Orders
- `POST /api/checkout` - Complete order (triggers fan-out)
- `GET /api/orders` - User's order list
- `GET /api/orders/:id` - Order details

#### Authentication
- Login/Logout via Keycloak redirect
- `GET /api/user/profile` - Current user info (Bearer token)

### Authentication Flow

```
┌──────────────┐     (1) Authorization Code + PKCE     ┌──────────────┐
│   Shop UI    │ ◄────────────────────────────────────►│   Keycloak   │
│ (keycloak-js)│                                       │ (techstore)  │
└──────┬───────┘                                       └──────────────┘
       │                                                      ▲
       │ (2) Bearer JWT Token                                 │
       ▼                                                      │
┌──────────────┐     (3) Validate via JWKS                    │
│   Shop API   │ ─────────────────────────────────────────────┘
│    (jose)    │
└──────┬───────┘
       │ (4) Client Credentials (M2M)
       ▼
┌──────────────┐     (5) Validate Service Token
│ Notification │ ─────────────────────────────────────────────►
│   Service    │
└──────────────┘
```

**Details:**
1. Frontend uses Authorization Code + PKCE (no secret exposed)
2. Shop API receives JWT token in `Authorization: Bearer <token>` header
3. Shop API validates token via JWKS (RSA signature)
4. To call Notification, Shop API obtains a service token (Client Credentials)
5. Notification validates that the token comes from the `shop-api` service account

---

## Data Management Stack

Production-like observability with separated components and **tail sampling** (90% data reduction).

### Overview

Replaces `grafana` with individual components:
- **OTel Collector**: Tail sampling processor
- **Tempo**: Distributed tracing (7-day retention)
- **Prometheus**: Metrics + alerting (7-day retention)
- **Loki**: Log aggregation (7-day retention)

### Tail Sampling Policies

| Policy | Keep | Description |
|--------|------|-------------|
| errors | 100% | Traces with ERROR status |
| latency | 100% | Traces with duration > 1s |
| audit | 100% | Traces with `audit.event=true` |
| probabilistic | 10% | Random baseline sample |

### Additional Ports

| Service | Port | Description |
|---------|------|-------------|
| OTel Collector | 4317 | OTLP gRPC receiver |
| Tempo | 3200 | Trace query API |
| Prometheus | 9090 | Metrics & alerting |
| Loki | 3100 | Log query API |

### Make Commands

```bash
make up-data-management
make down-data-management
make clean-data-management
make health-data-management
make check-sampling          # Verify tail sampling metrics
make logs-collector
make logs-tempo
make logs-prometheus
```

### Configuration Files

```
otel-config/data-management/
├── otel-collector-config.yaml   # Tail sampling policies
├── tempo-config.yaml            # Trace storage
├── loki-config.yaml             # Log retention
├── prometheus.yaml              # Scrape configs
├── grafana-datasources.yaml     # Pre-configured sources
├── dashboards/                  # OTEL Collector dashboard
└── alerts/                      # Prometheus alert rules
```

---

## OTEL Keycloak Stack

Enables **native OpenTelemetry instrumentation** in Keycloak for debugging authentication flows.

### Features

- Distributed tracing of login/token flows
- Trace IDs in Keycloak console logs
- 100% sampling (`always_on`)
- Exports to `grafana:4317`

### Make Commands

```bash
make up-otel-keycloak
make down-otel-keycloak
```

### Configuration

Overlay file: `docker-compose.otel-keycloak.yml`

Key environment variables:
- `KC_TRACING_ENABLED=true`
- `KC_TRACING_ENDPOINT=http://grafana:4317`
- `KC_TRACING_SAMPLER_TYPE=always_on`
- `KC_LOG_TRACING_INCLUDE_TRACE_ID=true`

---

## Demo Scenarios

### Scenario 1: Silent Failure

Notification service fails silently (invalid email validation).

```bash
make scenario-1
```

**Debug with:** Grafana → Explore → Tempo → Find traces with errors

---

### Scenario 2: Latency Spike

Checkout slow for specific users (slow template rendering).

```bash
make scenario-2
```

**Debug with:** Grafana → Explore → Tempo → Sort by duration

---

### Scenario 3: Fan-out Debug

Advanced debugging of **parallel service calls** during checkout.

```bash
make scenario-3
```

**What it does:**
1. Baseline checkout (all services normal)
2. Checkout with slow payment (+2s)
3. Checkout with slow inventory (+1.5s)
4. Checkout with slow notification (+3s)

**Fan-out pattern visualized:**

```
POST /api/checkout
├── POST /api/inventory/check      ─┐
├── POST /api/payments/process      ├── parallel
├── POST /api/inventory/reserve    ─┘
├── INSERT orders (postgres)
└── POST /api/notifications
```

**Debug with:** Script outputs direct Grafana trace links. Compare waterfalls to identify bottleneck.

---

### Generate Traffic

```bash
make traffic    # 50 baseline requests
```

See `QUICKSTART.md` for detailed scenario walkthroughs.

---

## Project Structure

```
MockMart/
├── services/
│   ├── shop-api/              # Backend API (Node.js/Express)
│   │   ├── middleware/auth.js # JWT validation
│   │   ├── lib/
│   │   │   ├── service-token.js  # Client Credentials flow
│   │   │   └── logger.js         # Pino + OTEL
│   │   ├── instrumentation.js # OpenTelemetry setup
│   │   └── server.js
│   │
│   ├── shop-ui/               # Frontend (React 18 + Vite)
│   │   └── src/
│   │       ├── contexts/      # AuthContext, CartContext
│   │       ├── pages/         # Home, Cart, Checkout, Orders, Admin
│   │       └── services/api.js
│   │
│   ├── notification/          # Order notifications
│   ├── payment/               # Payment processing
│   ├── inventory/             # Stock management
│   ├── keycloak/              # Realm config
│   └── gateway/               # Nginx reverse proxy
│
├── scripts/
│   ├── scenario-1-silent-failure.sh
│   ├── scenario-2-latency-spike.sh
│   ├── scenario-3-fanout-debug.sh
│   └── generate-traffic.sh
│
├── otel-config/
│   └── data-management/
│       ├── otel-collector-config.yaml
│       ├── tempo-config.yaml
│       ├── loki-config.yaml
│       ├── prometheus.yaml
│       ├── grafana-datasources.yaml
│       ├── dashboards/
│       └── alerts/
│
├── docker-compose.yml                # Base stack
├── docker-compose.data-management.yml # Data management stack
├── docker-compose.otel-keycloak.yml  # Keycloak OTEL
├── Makefile
└── init-db.sql
```

## Keycloak Configuration

**Configured clients:**
- `shop-ui`: Public client, PKCE enabled, for frontend
- `shop-api`: Confidential client, service account enabled, for M2M

**Scopes:**
- `techstore-scope`: Includes custom claims (email, name, canCheckout, roles)

**User Attributes:**
- `canCheckout`: Controls whether the user can complete checkout

## POC Notes

This project is a **Proof of Concept** designed for:
- Demonstrating distributed tracing with OpenTelemetry
- Testing Keycloak integration with OAuth2/OIDC
- Simulating debug scenarios (silent failures, latency spikes, fan-out)
- Providing a quick development/demo environment

**Not production-ready:**
- Session storage in memory (not scalable)
- No rate limiting or circuit breaker
- Hardcoded secrets (demo only)
- Single replica per service

## License

MIT
