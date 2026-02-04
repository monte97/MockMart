.PHONY: help up down restart logs logs-api logs-notification logs-grafana logs-keycloak health \
        scenario-1 scenario-2 traffic grafana shop keycloak clean status init-keycloak \
        start-ui stop-ui restart-ui rebuild-ui logs-ui \
        start-api stop-api restart-api rebuild-api \
        start-notification stop-notification restart-notification rebuild-notification \
        start-keycloak stop-keycloak restart-keycloak rebuild-keycloak \
        start-grafana stop-grafana restart-grafana \
        start-gateway stop-gateway restart-gateway rebuild-gateway \
        start-postgres stop-postgres restart-postgres \
        start-keycloak-postgres stop-keycloak-postgres restart-keycloak-postgres

# Default target
help:
	@echo "📚 OpenTelemetry Correlation Demo - Available Commands"
	@echo ""
	@echo "🚀 Stack Management:"
	@echo "  make up              - Start all services"
	@echo "  make down            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make clean           - Stop and remove volumes"
	@echo "  make status          - Show running containers"
	@echo "  make init-keycloak   - Initialize Keycloak realm"
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
	@echo -n "  Keycloak:            "
	@curl -sf http://localhost:8080/health/ready > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Grafana LGTM:        "
	@curl -s http://localhost:3005/api/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Shop API:            "
	@curl -s http://localhost:3001/api/products > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  Notification Service: "
	@curl -s http://localhost:3009/health > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  PostgreSQL (orders): "
	@docker exec postgres-orders pg_isready -U demo -d orders > /dev/null 2>&1 && echo "✅ Healthy" || echo "❌ Unhealthy"
	@echo -n "  PostgreSQL (keycloak): "
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
