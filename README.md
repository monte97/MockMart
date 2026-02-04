# MockMart

E-commerce demo application instrumented with OpenTelemetry for observability workshops and demonstrations.

## Architecture

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

**Services:**
- **Shop UI** - Static frontend (nginx)
- **Shop API** - Express.js backend with OpenTelemetry instrumentation
- **Notification Service** - Express.js microservice for order notifications
- **Keycloak** - Identity and access management
- **Grafana LGTM** - Logs, metrics, traces visualization (Loki + Tempo + Prometheus)
- **PostgreSQL** - Orders database + Keycloak database

## Quick Start

```bash
cd demo
make up
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Shop UI | http://localhost | - |
| Shop API | http://localhost/api/products | - |
| Grafana | http://localhost/grafana | (anonymous) |
| Keycloak Admin | http://localhost/auth/admin | admin / admin |

## Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@techstore.com | admin123 | Admin |
| mario.rossi@example.com | mario123 | User |
| blocked@example.com | blocked123 | Blocked |

## Make Commands

```bash
make help          # Show all commands
make up            # Start all services
make down          # Stop all services
make logs          # Follow all logs
make health        # Check services health
make traffic       # Generate test traffic
make scenario-1    # Run Silent Failure scenario
make scenario-2    # Run Latency Spike scenario
```

## OpenTelemetry

All Node.js services are instrumented with:
- `@opentelemetry/auto-instrumentations-node`
- Traces exported via OTLP to Grafana Tempo
- Logs exported via OTLP to Grafana Loki

Explore traces and logs in Grafana at http://localhost/grafana

## License

MIT
