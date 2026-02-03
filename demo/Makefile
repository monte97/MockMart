.PHONY: help up down restart logs logs-api logs-notification logs-grafana logs-keycloak health \
        scenario-1 scenario-2 traffic grafana shop keycloak clean status init-keycloak

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
