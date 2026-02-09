# OpenTelemetry Correlation Demo

Demonstrates distributed tracing, log correlation, and performance debugging using OpenTelemetry and Grafana LGTM stack.

## Architecture

```
Client
  ↓
shop-api (Node.js/Express)
  ├─→ Postgres (orders database)
  └─→ notification-service (Node.js)
       ↓
  All telemetry → LGTM Stack (Grafana/Tempo/Loki/Mimir)
```

## Quick Start

### 1. Start All Services

```bash
docker compose up -d
```

**Services:**
- Grafana UI: http://localhost:3000
- shop-api: http://localhost:3001
- notification-service: http://localhost:3009
- Postgres: localhost:5432

### 2. Verify Stack is Running

```bash
docker compose ps
# All services should show "healthy"

docker compose logs grafana | grep "HTTP Server Listen"
# Should show Grafana is ready
```

### 3. Generate Some Traffic

```bash
./scripts/generate-traffic.sh 20
```

### 4. View Traces in Grafana

1. Open http://localhost:3000
2. Navigate to **Explore**
3. Select **Tempo** data source
4. Query: `{service.name="shop-api"}`
5. Observe distributed traces across services

## Demo Scenarios

### Scenario 1: Silent Failure (Timeout)

**Problem:** Checkout returns 200 OK but notification is never sent.

**Run:**
```bash
./scripts/scenario-1-silent-failure.sh
```

**Debug in Grafana:**
1. Copy the order ID from script output
2. Grafana → Explore → Tempo
3. Query: `{service.name="shop-api"} | order_id="<ORDER_ID>"`
4. Observe trace showing:
   - ✅ `POST /checkout` - 200 OK
   - ✅ `pg.query INSERT` - Success
   - ❌ `HTTP POST /send` - ERROR (timeout)

**Time to debug:**
- Without OTel: 20-30 minutes (grep logs, guess what happened)
- With OTel: 2 minutes (direct root cause in trace)

### Scenario 2: Latency Spike (p99 Performance)

**Problem:** Some users report slow checkout (3+ seconds).

**Run:**
```bash
./scripts/scenario-2-latency-spike.sh
```

**Debug in Grafana:**
1. Grafana → Explore → Tempo
2. Query: `{service.name="shop-api"} | duration > 3s`
3. Click on a slow trace
4. Observe span breakdown:
   - `POST /checkout`: 3.5s total
   - `pg.query INSERT`: 190ms ✅
   - `HTTP POST /send`: 3.2s ❌ (bottleneck!)
5. Check span attributes for `notification.template="order_confirmation_premium"`

**Root cause:** Premium template rendering is slow for specific users.

## OpenTelemetry Configuration

### Auto-Instrumentation

Both services use automatic instrumentation:

**shop-api/instrumentation.js:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

**Automatically captures:**
- ✅ HTTP requests/responses (Express, Axios)
- ✅ Database queries (pg)
- ✅ Context propagation (W3C Trace Context headers)
- ✅ Error spans

### Environment Variables

```yaml
OTEL_SERVICE_NAME: shop-api
OTEL_EXPORTER_OTLP_ENDPOINT: http://grafana:4317
```

## Database Schema

```sql
-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);
```

## Simulation Endpoints

Notification service provides config endpoints for demo scenarios:

```bash
# Enable timeout (scenario 1)
curl -X POST http://localhost:3009/config/simulate-timeout

# Enable slow template for specific users (scenario 2)
curl -X POST http://localhost:3009/config/slow-template \
  -H "Content-Type: application/json" \
  -d '{"userIds":["alice","user5"]}'

# Reset all simulations
curl -X POST http://localhost:3009/config/reset
```

## Troubleshooting

### No traces in Grafana

1. Check LGTM is running: `docker compose logs grafana`
2. Check services can reach LGTM: `docker compose logs shop-api | grep "OpenTelemetry"`
3. Verify network: `docker compose exec shop-api ping grafana`

### Database connection errors

```bash
docker compose logs postgres | grep "ready to accept"
docker compose exec postgres psql -U demo -d orders -c "\dt"
```

### Notification service doesn't respond

Check Keycloak token (may need to disable for demo):
```bash
docker compose logs notification-service
```

## Tech Stack

- **OpenTelemetry JS SDK**: v0.45.1
- **Grafana LGTM Bundle**: latest (includes Tempo, Loki, Mimir)
- **Node.js**: v18+
- **PostgreSQL**: 15
- **Docker Compose**: v2+

## Key Metrics

**Trace propagation:**
- Automatic via W3C Trace Context headers
- `traceparent` header: `00-<trace-id>-<span-id>-01`

**Database visibility:**
- Connection pool metrics
- Query duration breakdown
- Transaction tracing

**Error tracking:**
- Span status: `ERROR`
- Error attributes: `error.message`, `error.type`
