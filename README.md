# MockMart

E-commerce demo application instrumented with OpenTelemetry for observability workshops and demonstrations.

## Features

### Architecture

- **Microservices**: Frontend (React SPA), Backend API (Node.js), Notification Service
- **Modern Frontend**: React 18 + Vite + React Router v6
- **OpenTelemetry Ready**: Distributed tracing, metrics, and logging with LGTM Stack
- **Containerized**: Docker Compose for simplified orchestration
- **API-first**: Integrated Swagger UI for interactive documentation

### Authentication with Keycloak

- **Keycloak Integration**: Centralized identity provider (realm: `techstore`)
- **Frontend**: React Context + keycloak-js with Authorization Code + PKCE
- **Backend**: JWT validation via JWKS (jose library)
- **M2M**: Client Credentials for shop-api to notification communication
- **ABAC**: `canCheckout` attribute for checkout access control
- **RBAC**: Admin role for product management (CRUD)

### E-commerce Functionality

- Product catalog with search and filters
- Cart management and checkout
- Authentication system with Keycloak
- Order management and history
- Admin panel for product CRUD (admin role required)
- Order notifications via webhook with M2M token

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Gateway (nginx:80)                      │
└──────────┬──────────────┬──────────────┬──────────────┬─────────┘
           │              │              │              │
     ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
     │  Shop UI  │  │ Shop API  │  │ Keycloak  │  │ Grafana │
     │  :3000    │  │  :3001    │  │  :8080    │  │  :3005  │
     └───────────┘  └─────┬─────┘  └───────────┘  └─────────┘
                          │
                    ┌─────▼─────┐
                    │Notification│
                    │  :3009    │
                    └───────────┘
```

## Quick Start

```bash
# Start all services (recommended)
make up

# Or manually:
docker compose up -d

# Check services health
make health
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Shop UI | http://localhost | - |
| Shop API | http://localhost/api/products | - |
| Swagger UI | http://localhost:3001/api-docs | - |
| Grafana | http://localhost/grafana | (anonymous) |
| Keycloak Admin | http://localhost/auth/admin | admin / admin |

## Test Users

| Username | Password | Role | Checkout |
|----------|----------|------|----------|
| admin | admin123 | Admin | Enabled |
| mario | mario123 | User | Enabled |
| blocked | blocked123 | User | Blocked |

## Make Commands

```bash
# General
make help          # Show all commands
make up            # Start all services
make down          # Stop all services
make restart       # Restart all services
make clean         # Stop and remove volumes
make status        # Show running containers
make logs          # Follow all logs
make health        # Check services health

# Individual services (start, stop, restart, rebuild, logs)
make start-ui      # Start shop-ui
make rebuild-api   # Rebuild and restart shop-api
make logs-notification  # Follow notification logs
# Available: ui, api, notification, keycloak, gateway, grafana, postgres

# Scenarios
make traffic       # Generate test traffic
make scenario-1    # Run Silent Failure scenario
make scenario-2    # Run Latency Spike scenario
```

## API Endpoints

Full interactive documentation available at **Swagger UI**: http://localhost:3001/api-docs

### Products
- `GET /api/products` - List products (supports filters: ?category=, ?search=, ?sort=)
- `GET /api/products/:id` - Product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Authentication (via Keycloak)
- Login/Logout handled via redirect to Keycloak
- `GET /api/user/profile` - Current user info (requires Bearer token)

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add product to cart
- `PUT /api/cart/:productId` - Update quantity
- `DELETE /api/cart/:productId` - Remove product

### Orders
- `POST /api/checkout` - Complete order (triggers notification)
- `GET /api/orders` - User's order list
- `GET /api/orders/:id` - Order details

## Authentication Flow

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

## OpenTelemetry

All Node.js services have OTEL auto-instrumentation sending telemetry to Grafana LGTM:
- **Traces**: Distributed tracing with context propagation (W3C Trace Context)
- **Logs**: Automatically correlated to traces
- **Metrics**: RED metrics (Rate, Errors, Duration)

Explore traces and logs in Grafana at http://localhost/grafana

## Project Structure

```
MockMart/
├── services/
│   ├── shop-api/              # Backend API (Node.js/Express)
│   │   ├── middleware/auth.js # JWT validation middleware
│   │   ├── lib/service-token.js # Client Credentials flow
│   │   ├── instrumentation.js # OpenTelemetry setup
│   │   └── server.js          # Express application
│   │
│   ├── shop-ui/               # Frontend (React SPA)
│   │   ├── src/
│   │   │   ├── contexts/      # AuthContext, CartContext
│   │   │   ├── components/    # Header, ProductCard, etc.
│   │   │   ├── pages/         # Home, Cart, Checkout, Orders, Admin
│   │   │   ├── hooks/         # useAuth
│   │   │   ├── services/      # API client
│   │   │   ├── App.jsx        # Router setup
│   │   │   └── main.jsx       # Entry point
│   │   ├── vite.config.js     # Vite configuration
│   │   └── Dockerfile         # Multi-stage build (Node + Nginx)
│   │
│   ├── notification/          # Notification service (Node.js)
│   │   ├── instrumentation.js # OpenTelemetry setup
│   │   └── server.js          # JWT validation + M2M
│   │
│   ├── keycloak/
│   │   └── realm-config.json  # Realm techstore configuration
│   │
│   └── gateway/
│       └── nginx.conf         # Nginx reverse proxy config
│
├── scripts/                   # Demo scripts
│   ├── scenario-1-silent-failure.sh
│   ├── scenario-2-latency-spike.sh
│   └── generate-traffic.sh
│
├── docker-compose.yml         # Full orchestration
├── Makefile                   # Quick commands
└── init-db.sql               # Orders database schema
```

## Keycloak Configuration

**Configured clients:**
- `shop-ui`: Public client, PKCE enabled, for frontend
- `shop-api`: Confidential client, service account enabled, for M2M

**Scopes:**
- `techstore-scope`: Includes custom claims (email, name, canCheckout, roles)

**User Attributes:**
- `canCheckout`: Controls whether the user can complete checkout

## Demo Scenarios

```bash
make scenario-1   # Silent Failure: notification fails silently
make scenario-2   # Latency Spike: checkout slow for some users
make traffic      # Generate baseline traffic
```

See `QUICKSTART.md` for scenario details and how to debug them with Grafana.

## POC Notes

This project is a **Proof of Concept** designed for:
- Demonstrating distributed tracing with OpenTelemetry
- Testing Keycloak integration with OAuth2/OIDC
- Simulating debug scenarios (silent failures, latency spikes)
- Providing a quick development/demo environment

**Not production-ready:**
- Session storage in memory (not scalable)
- No rate limiting or circuit breaker
- Hardcoded secrets (demo only)
- Single replica per service

## License

MIT
