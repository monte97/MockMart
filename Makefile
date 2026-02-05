.PHONY: help up down restart logs logs-api logs-notification logs-payment logs-inventory logs-grafana logs-keycloak health \
        scenario-1 scenario-2 scenario-3 scenario-4 scenario-5 traffic grafana shop keycloak clean status init-keycloak \
        start-payment stop-payment restart-payment rebuild-payment \
        start-inventory stop-inventory restart-inventory rebuild-inventory \
        start-ui stop-ui restart-ui rebuild-ui logs-ui \
        start-api stop-api restart-api rebuild-api \
        start-notification stop-notification restart-notification rebuild-notification \
        start-keycloak stop-keycloak restart-keycloak rebuild-keycloak \
        start-grafana stop-grafana restart-grafana \
        start-gateway stop-gateway restart-gateway rebuild-gateway \
        start-postgres stop-postgres restart-postgres \
        start-keycloak-postgres stop-keycloak-postgres restart-keycloak-postgres \
        up-otel-keycloak down-otel-keycloak \
        up-data-management down-data-management clean-data-management check-sampling \
        health-data-management logs-collector logs-tempo logs-prometheus \
        up-keycloak-pii up-keycloak-pii-unsafe down-keycloak-pii clean-keycloak-pii \
        health-keycloak-pii switch-pii-safe switch-pii-unsafe logs-collector-pii

# Default target
help:
	@echo "📚 OpenTelemetry Correlation Demo - Available Commands"
	@echo ""
	@echo "🚀 Stack Management:"
	@echo "  make up                    - Start all services (grafana-lgtm)"
	@echo "  make up-otel-keycloak      - Start with Keycloak OTEL instrumentation"
	@echo "  make up-data-management    - Start with data management stack"
	@echo "  make down                  - Stop all services"
	@echo "  make clean                 - Stop and remove volumes"
	@echo "  make status                - Show running containers"
	@echo ""
	@echo "📊 Data Management Stack:"
	@echo "  make up-data-management    - Start (OTel Collector + Tempo + Prometheus + Loki + Grafana)"
	@echo "  make down-data-management  - Stop stack"
	@echo "  make clean-data-management - Stop + rimuovi volumes"
	@echo "  make health-data-management - Check health status"
	@echo "  make check-sampling        - Check tail sampling metrics"
	@echo "  make logs-collector        - Follow OTel Collector logs"
	@echo ""
	@echo "🔒 Keycloak PII Filtering Stack (Scenario 5):"
	@echo "  make up-keycloak-pii       - Start with PII filtering (safe)"
	@echo "  make up-keycloak-pii-unsafe - Start WITHOUT filtering (shows problem)"
	@echo "  make down-keycloak-pii     - Stop stack"
	@echo "  make scenario-5            - Run PII filtering demo"
	@echo "  make switch-pii-safe       - Hot-switch to safe config"
	@echo "  make switch-pii-unsafe     - Hot-switch to unsafe config"
	@echo ""
	@echo "📋 Logs:"
	@echo "  make logs            - Follow all logs"
	@echo "  make logs-api        - Follow shop-api logs"
	@echo "  make logs-notification - Follow notification-service logs"
	@echo "  make logs-grafana    - Follow grafana-lgtm logs"
	@echo "  make logs-keycloak   - Follow keycloak logs"
	@echo ""
	@echo "🧪 Scenarios:"
	@echo "  make scenario-1      - Run Silent Failure scenario"
	@echo "  make scenario-2      - Run Latency Spike scenario"
	@echo "  make scenario-3      - Run Fan-out Debug scenario (complex)"
	@echo "  make scenario-4      - Run Data Management demo (requires up-data-management)"
	@echo "  make scenario-5      - Run PII Filtering demo (requires up-keycloak-pii-unsafe)"
	@echo "  make traffic         - Generate baseline traffic (50 requests)"
	@echo ""
	@echo "🔧 Single Service Management:"
	@echo "  make [start|stop|restart|rebuild]-<service>"
	@echo "  Services: ui, api, notification, keycloak, grafana, gateway, postgres, keycloak-postgres"
	@echo "  Examples:"
	@echo "    make rebuild-ui    - Rebuild and restart shop-ui"
	@echo "    make restart-api   - Restart shop-api"
	@echo "    make logs-ui       - Follow shop-ui logs"
	@echo ""
	@echo "🌐 Access:"
	@echo "  make grafana         - Open Grafana UI (localhost:3005)"
	@echo "  make shop            - Open Shop UI (localhost:3000)"
	@echo "  make keycloak        - Open Keycloak Admin (localhost:8080/admin)"
	@echo ""
	@echo "🔍 Health:"
	@echo "  make health          - Check services health status"
	@echo ""
	@echo "🔐 Test Credentials:"
	@echo "  Keycloak Admin: admin/admin"
	@echo "  Shop Users:"
	@echo "    - admin@techstore.com / admin123 (Admin)"
	@echo "    - mario.rossi@example.com / mario123 (User)"
	@echo "    - blocked@example.com / blocked123 (Blocked User)"

# Stack management
up:
	@echo "🚀 Starting OpenTelemetry demo stack..."
	docker compose up -d
	@echo ""
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 15
	@make health
	@echo ""
	@echo "✅ Stack is ready!"
	@echo ""
	@echo "📍 Access points:"
	@echo "  - Shop UI:      http://localhost:3000"
	@echo "  - Shop API:     http://localhost:3001/api/products"
	@echo "  - Grafana UI:   http://localhost:3005"
	@echo "  - Keycloak:     http://localhost:8080 (admin/admin)"
	@echo "  - Notification: http://localhost:3009/health"
	@echo "  - Payment:      http://localhost:3010/health"
	@echo "  - Inventory:    http://localhost:3011/health"
	@echo ""
	@echo "🔐 Test credentials:"
	@echo "  - admin@techstore.com / admin123 (Admin)"
	@echo "  - mario.rossi@example.com / mario123 (User)"
	@echo "  - blocked@example.com / blocked123 (Blocked)"

down:
	@echo "🛑 Stopping all services..."
	docker compose down

restart:
	@echo "🔄 Restarting all services..."
	docker compose restart

clean:
	@echo "🧹 Stopping and removing all containers and volumes..."
	docker compose down -v
	@echo "✅ Clean complete"

status:
	@echo "📊 Container Status:"
	@docker compose ps

# Logs
logs:
	docker compose logs -f

logs-api:
	docker compose logs -f shop-api

logs-notification:
	docker compose logs -f notification-service

logs-grafana:
	docker compose logs -f grafana-lgtm

logs-keycloak:
	docker compose logs -f keycloak

# Keycloak initialization
init-keycloak:
	@echo "🔐 Initializing Keycloak realm..."
	@bash ./scripts/init-keycloak.sh

# Scenarios
scenario-1:
	@echo "🎬 Running Scenario 1: Silent Failure..."
	@bash ./scripts/scenario-1-silent-failure.sh

scenario-2:
	@echo "🎬 Running Scenario 2: Latency Spike..."
	@bash ./scripts/scenario-2-latency-spike.sh

scenario-3:
	@echo "🎬 Running Scenario 3: Fan-out Debug (Complex)..."
	@bash ./scripts/scenario-3-fanout-debug.sh

scenario-4:
	@echo "🎬 Running Scenario 4: Data Management Demo..."
	@echo "   (Requires: make up-data-management)"
	@bash ./scripts/scenario-4-data-management.sh

traffic:
	@echo "🚦 Generating baseline traffic..."
	@bash ./scripts/generate-traffic.sh

# Browser access
grafana:
	@echo "🌐 Opening Grafana UI..."
	@command -v xdg-open > /dev/null && xdg-open http://localhost:3005 || \
	 command -v open > /dev/null && open http://localhost:3005 || \
	 echo "Please open http://localhost:3005 in your browser"

shop:
	@echo "🛍️  Opening Shop UI..."
	@command -v xdg-open > /dev/null && xdg-open http://localhost:3000 || \
	 command -v open > /dev/null && open http://localhost:3000 || \
	 echo "Please open http://localhost:3000 in your browser"

keycloak:
	@echo "🔐 Opening Keycloak Admin Console..."
	@command -v xdg-open > /dev/null && xdg-open http://localhost:8080/admin || \
	 command -v open > /dev/null && open http://localhost:8080/admin || \
	 echo "Please open http://localhost:8080/admin in your browser"

# Health check
health:
	@echo "🏥 Health Status:"
	@echo -n "  Keycloak:             "
	@curl -sf http://localhost:8080/health/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Grafana LGTM:         "
	@curl -s http://localhost:3005/api/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Shop API:             "
	@curl -s http://localhost:3001/api/products > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Notification Service: "
	@curl -s http://localhost:3009/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Payment Service:      "
	@curl -s http://localhost:3010/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Inventory Service:    "
	@curl -s http://localhost:3011/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  PostgreSQL (orders):  "
	@docker exec postgres-orders pg_isready -U demo -d orders > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  PostgreSQL (keycloak):"
	@docker exec keycloak-postgres pg_isready -U keycloak -d keycloak > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"

# ============================================
# SINGLE SERVICE MANAGEMENT
# ============================================

# Shop UI
start-ui:
	@echo "🚀 Starting shop-ui..."
	docker compose up -d shop-ui

stop-ui:
	@echo "🛑 Stopping shop-ui..."
	docker compose stop shop-ui

restart-ui:
	@echo "🔄 Restarting shop-ui..."
	docker compose restart shop-ui

rebuild-ui:
	@echo "🔨 Rebuilding shop-ui..."
	docker compose up -d --build shop-ui

logs-ui:
	docker compose logs -f shop-ui

# Shop API
start-api:
	@echo "🚀 Starting shop-api..."
	docker compose up -d shop-api

stop-api:
	@echo "🛑 Stopping shop-api..."
	docker compose stop shop-api

restart-api:
	@echo "🔄 Restarting shop-api..."
	docker compose restart shop-api

rebuild-api:
	@echo "🔨 Rebuilding shop-api..."
	docker compose up -d --build shop-api

# Notification Service
start-notification:
	@echo "🚀 Starting notification-service..."
	docker compose up -d notification-service

stop-notification:
	@echo "🛑 Stopping notification-service..."
	docker compose stop notification-service

restart-notification:
	@echo "🔄 Restarting notification-service..."
	docker compose restart notification-service

rebuild-notification:
	@echo "🔨 Rebuilding notification-service..."
	docker compose up -d --build notification-service

# Keycloak
start-keycloak:
	@echo "🚀 Starting keycloak..."
	docker compose up -d keycloak

stop-keycloak:
	@echo "🛑 Stopping keycloak..."
	docker compose stop keycloak

restart-keycloak:
	@echo "🔄 Restarting keycloak..."
	docker compose restart keycloak

rebuild-keycloak:
	@echo "🔨 Rebuilding keycloak..."
	docker compose up -d --build keycloak

# Grafana LGTM
start-grafana:
	@echo "🚀 Starting grafana-lgtm..."
	docker compose up -d grafana-lgtm

stop-grafana:
	@echo "🛑 Stopping grafana-lgtm..."
	docker compose stop grafana-lgtm

restart-grafana:
	@echo "🔄 Restarting grafana-lgtm..."
	docker compose restart grafana-lgtm

# Gateway
start-gateway:
	@echo "🚀 Starting gateway..."
	docker compose up -d gateway

stop-gateway:
	@echo "🛑 Stopping gateway..."
	docker compose stop gateway

restart-gateway:
	@echo "🔄 Restarting gateway..."
	docker compose restart gateway

rebuild-gateway:
	@echo "🔨 Rebuilding gateway..."
	docker compose up -d --build gateway

# PostgreSQL (orders)
start-postgres:
	@echo "🚀 Starting postgres..."
	docker compose up -d postgres

stop-postgres:
	@echo "🛑 Stopping postgres..."
	docker compose stop postgres

restart-postgres:
	@echo "🔄 Restarting postgres..."
	docker compose restart postgres

# PostgreSQL (keycloak)
start-keycloak-postgres:
	@echo "🚀 Starting keycloak-postgres..."
	docker compose up -d keycloak-postgres

stop-keycloak-postgres:
	@echo "🛑 Stopping keycloak-postgres..."
	docker compose stop keycloak-postgres

restart-keycloak-postgres:
	@echo "🔄 Restarting keycloak-postgres..."
	docker compose restart keycloak-postgres

# Payment Service
start-payment:
	@echo "🚀 Starting payment-service..."
	docker compose up -d payment-service

stop-payment:
	@echo "🛑 Stopping payment-service..."
	docker compose stop payment-service

restart-payment:
	@echo "🔄 Restarting payment-service..."
	docker compose restart payment-service

rebuild-payment:
	@echo "🔨 Rebuilding payment-service..."
	docker compose up -d --build payment-service

logs-payment:
	docker compose logs -f payment-service

# Inventory Service
start-inventory:
	@echo "🚀 Starting inventory-service..."
	docker compose up -d inventory-service

stop-inventory:
	@echo "🛑 Stopping inventory-service..."
	docker compose stop inventory-service

restart-inventory:
	@echo "🔄 Restarting inventory-service..."
	docker compose restart inventory-service

rebuild-inventory:
	@echo "🔨 Rebuilding inventory-service..."
	docker compose up -d --build inventory-service

logs-inventory:
	docker compose logs -f inventory-service

# ============================================
# OTEL KEYCLOAK VARIANT
# ============================================

up-otel-keycloak:
	@echo "🚀 Starting stack with Keycloak OpenTelemetry instrumentation..."
	@echo "   (Uses Keycloak's native OTEL support - no Java agent needed)"
	docker compose -f docker-compose.yml -f docker-compose.otel-keycloak.yml up -d
	@echo ""
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 15
	@make health
	@echo ""
	@echo "✅ Stack is ready with Keycloak instrumentation!"
	@echo ""
	@echo "📍 Keycloak traces will appear in Grafana"
	@echo "   View in Grafana: http://localhost:3005 → Explore → Tempo"

down-otel-keycloak:
	@echo "🛑 Stopping all services (OTEL Keycloak variant)..."
	docker compose -f docker-compose.yml -f docker-compose.otel-keycloak.yml down

# ============================================
# DATA MANAGEMENT STACK (componenti separati)
# ============================================
# Stack completo con:
# - OTel Collector: tail sampling (90% riduzione)
# - Tempo: retention 7 giorni
# - Prometheus: alert rules + metriche collector
# - Loki: retention 7 giorni
# - Grafana: dashboard pre-configurata

up-data-management:
	@echo "🚀 Starting Data Management stack..."
	@echo ""
	@echo "📦 Componenti:"
	@echo "   - OTel Collector (tail sampling: 100% errors, 100% slow, 10% rest)"
	@echo "   - Tempo (retention: 7 giorni)"
	@echo "   - Prometheus (alert rules per collector health)"
	@echo "   - Loki (retention: 7 giorni)"
	@echo "   - Grafana (dashboard pre-configurata)"
	@echo ""
	docker compose -f docker-compose.data-management.yml up -d
	@echo ""
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 20
	@make health-data-management
	@echo ""
	@echo "✅ Stack Data Management pronto!"
	@echo ""
	@echo "📍 Access points:"
	@echo "   - Shop UI:       http://localhost:3000"
	@echo "   - Grafana:       http://localhost:3005"
	@echo "   - Prometheus:    http://localhost:9090"
	@echo "   - Tempo:         http://localhost:3200"
	@echo "   - Loki:          http://localhost:3100"
	@echo "   - Collector:     http://localhost:8888/metrics"
	@echo ""
	@echo "📊 Dashboard: Grafana → Data Management → OTel Collector"
	@echo "📈 Verifica: make check-sampling"

down-data-management:
	@echo "🛑 Stopping Data Management stack..."
	docker compose -f docker-compose.data-management.yml down

clean-data-management:
	@echo "🧹 Cleaning Data Management stack (include volumes)..."
	docker compose -f docker-compose.data-management.yml down -v
	@echo "✅ Clean complete"

check-sampling:
	@echo "📊 Checking tail sampling metrics..."
	@echo ""
	@echo "Span ricevuti:"
	@curl -s http://localhost:8888/metrics 2>/dev/null | grep "otelcol_receiver_accepted_spans" | head -5 || echo "  Collector non raggiungibile su :8888"
	@echo ""
	@echo "Span processati dal tail_sampling:"
	@curl -s http://localhost:8888/metrics 2>/dev/null | grep "otelcol_processor.*tail_sampling" | head -10 || echo "  Metriche tail_sampling non trovate"
	@echo ""
	@echo "💡 Genera traffico con: make traffic"
	@echo "   Poi ricontrolla: make check-sampling"

health-data-management:
	@echo "🏥 Health Status (Data Management Stack):"
	@echo -n "  OTel Collector:       "
	@curl -sf http://localhost:13133/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Tempo:                "
	@curl -sf http://localhost:3200/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Prometheus:           "
	@curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Loki:                 "
	@curl -sf http://localhost:3100/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Grafana:              "
	@curl -sf http://localhost:3005/api/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Keycloak:             "
	@curl -sf http://localhost:8080/health/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Shop API:             "
	@curl -s http://localhost:3001/api/products > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Notification Service: "
	@curl -s http://localhost:3009/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Payment Service:      "
	@curl -s http://localhost:3010/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Inventory Service:    "
	@curl -s http://localhost:3011/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"

logs-collector:
	docker compose -f docker-compose.data-management.yml logs -f otel-collector

logs-tempo:
	docker compose -f docker-compose.data-management.yml logs -f tempo

logs-prometheus:
	docker compose -f docker-compose.data-management.yml logs -f prometheus

# ============================================
# KEYCLOAK PII FILTERING STACK (Scenario 5)
# ============================================
# Stack per dimostrare PII filtering con OTel Collector:
# - Keycloak con tracing nativo
# - OTel Collector con config switchabile (safe/unsafe)
# - Stack completo: Tempo, Loki, Prometheus, Grafana

up-keycloak-pii:
	@echo "🔒 Starting Keycloak PII Filtering stack (SAFE config)..."
	@echo ""
	@echo "📦 Features:"
	@echo "   - Keycloak with native OpenTelemetry tracing"
	@echo "   - OTel Collector with PII filtering enabled"
	@echo "   - 6 filtering layers: DELETE, REDACT, HASH, SANITIZE, TRUNCATE, FILTER"
	@echo ""
	OTEL_CONFIG=otel-collector-config.yaml docker compose -f docker-compose.keycloak-pii.yml up -d
	@echo ""
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 20
	@make health-keycloak-pii
	@echo ""
	@echo "✅ Stack ready with PII filtering enabled!"
	@echo ""
	@echo "📍 Access points:"
	@echo "   - Shop UI:       http://localhost:3000"
	@echo "   - Grafana:       http://localhost:3005"
	@echo "   - Keycloak:      http://localhost:8080 (admin/admin)"
	@echo ""
	@echo "🧪 Run scenario: make scenario-5"

up-keycloak-pii-unsafe:
	@echo "⚠️  Starting Keycloak PII Filtering stack (UNSAFE config)..."
	@echo ""
	@echo "🚨 WARNING: PII filtering is DISABLED!"
	@echo "   This config is for demonstrating the problem."
	@echo "   DO NOT use in production!"
	@echo ""
	OTEL_CONFIG=otel-collector-unsafe.yaml docker compose -f docker-compose.keycloak-pii.yml up -d
	@echo ""
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 20
	@make health-keycloak-pii
	@echo ""
	@echo "⚠️  Stack ready WITHOUT PII filtering!"
	@echo ""
	@echo "📍 Access points:"
	@echo "   - Shop UI:       http://localhost:3000"
	@echo "   - Grafana:       http://localhost:3005"
	@echo "   - Keycloak:      http://localhost:8080 (admin/admin)"
	@echo ""
	@echo "🧪 Run scenario: make scenario-5"

down-keycloak-pii:
	@echo "🛑 Stopping Keycloak PII Filtering stack..."
	docker compose -f docker-compose.keycloak-pii.yml down

clean-keycloak-pii:
	@echo "🧹 Cleaning Keycloak PII Filtering stack (includes volumes)..."
	docker compose -f docker-compose.keycloak-pii.yml down -v
	@echo "✅ Clean complete"

health-keycloak-pii:
	@echo "🏥 Health Status (Keycloak PII Filtering Stack):"
	@echo -n "  OTel Collector:       "
	@curl -sf http://localhost:13133/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Tempo:                "
	@curl -sf http://localhost:3200/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Prometheus:           "
	@curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Loki:                 "
	@curl -sf http://localhost:3100/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Grafana:              "
	@curl -sf http://localhost:3005/api/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Keycloak:             "
	@curl -sf http://localhost:8080/health/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Shop API:             "
	@curl -s http://localhost:3001/api/products > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"

scenario-5:
	@echo "🎬 Running Scenario 5: PII Filtering..."
	@bash ./scripts/scenario-5-pii-filtering.sh

switch-pii-safe:
	@echo "🔄 Switching to SAFE config (PII filtering enabled)..."
	OTEL_CONFIG=otel-collector-config.yaml docker compose -f docker-compose.keycloak-pii.yml up -d otel-collector
	@sleep 5
	@echo "✅ Collector restarted with PII filtering"

switch-pii-unsafe:
	@echo "⚠️  Switching to UNSAFE config (PII filtering disabled)..."
	OTEL_CONFIG=otel-collector-unsafe.yaml docker compose -f docker-compose.keycloak-pii.yml up -d otel-collector
	@sleep 5
	@echo "⚠️  Collector restarted WITHOUT PII filtering"

logs-collector-pii:
	docker compose -f docker-compose.keycloak-pii.yml logs -f otel-collector
