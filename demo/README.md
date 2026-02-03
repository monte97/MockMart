# TechStore - E-commerce POC

**Proof of Concept** di un'applicazione e-commerce con architettura a microservizi, **OpenTelemetry** e **Keycloak**.

## Caratteristiche

### 🏗️ Architettura

- **Microservizi separati**: Frontend (Nginx), Backend API (Node.js), Notification Service
- **OpenTelemetry ready**: Tracing distribuito, metriche e logging con LGTM Stack
- **Containerizzato**: Docker Compose per orchestrazione semplificata
- **API-first**: Swagger UI integrato per documentazione interattiva

### 🔐 Autenticazione con Keycloak

- **Keycloak Integration**: Identity provider centralizzato (realm: `techstore`)
- **Frontend**: keycloak-js con Authorization Code + PKCE (login sicuro senza secret)
- **Backend**: JWT validation via JWKS (jose library)
- **M2M**: Client Credentials per comunicazione shop-api → notification
- **ABAC**: Attributo `canCheckout` per controllo accesso al checkout

### 🛍️ Funzionalità E-commerce

- Catalogo prodotti con ricerca e filtri
- Gestione carrello e checkout
- Sistema autenticazione con Keycloak
- Gestione ordini
- Notifiche ordini via webhook con token M2M

## Quick Start

### Avvio Rapido

```bash
# Avvia lo stack completo (raccomandato)
make up

# Oppure manualmente:
docker compose up -d

# Verifica stato servizi
make health
```

**Endpoint disponibili:**

| Servizio | URL | Note |
|----------|-----|------|
| Shop UI | http://localhost:3000 | Frontend e-commerce |
| Shop API | http://localhost:3001/api/products | REST API |
| Swagger UI | http://localhost:3001/api-docs | Documentazione API |
| Keycloak Admin | http://localhost:8080/admin | Credenziali: admin/admin |
| Grafana LGTM | http://localhost:3005 | Traces, Logs, Metrics |
| Notification | http://localhost:3009/health | Health check |

**Credenziali utenti Keycloak:**

| Utente | Email | Password | Ruolo | Checkout |
|--------|-------|----------|-------|----------|
| Admin | admin@techstore.com | admin123 | admin | Abilitato |
| Mario | mario.rossi@example.com | mario123 | user | Abilitato |
| Blocked | blocked@example.com | blocked123 | user | Bloccato |

### Comandi Makefile

```bash
make up       # Avvia stack completo
make down     # Ferma tutti i servizi
make health   # Verifica stato servizi
make logs     # Visualizza tutti i log
make clean    # Ferma e rimuovi volumi
```

### Observability Stack

Lo stack LGTM (Loki, Grafana, Tempo, Mimir) è incluso nel docker-compose principale.

**Dashboard Grafana**: http://localhost:3005 (accesso anonimo)

L'immagine `grafana/otel-lgtm` include tutto lo stack observability in un singolo container con OTLP receiver su porte 4317 (gRPC) e 4318 (HTTP).

## API Endpoints

Documentazione completa e interattiva disponibile su **Swagger UI**: http://localhost:3001/api-docs

### Principali Endpoint

**Prodotti**
- `GET /api/products` - Lista prodotti (supporta filtri: ?category=, ?search=, ?sort=)
- `GET /api/products/:id` - Dettaglio prodotto
- `POST /api/products` - Crea prodotto
- `PUT /api/products/:id` - Aggiorna prodotto
- `DELETE /api/products/:id` - Elimina prodotto

**Autenticazione (via Keycloak)**
- Login/Logout gestito tramite redirect a Keycloak
- `GET /api/user/profile` - Info utente corrente (richiede Bearer token)

**Carrello**
- `GET /api/cart` - Ottieni carrello
- `POST /api/cart` - Aggiungi prodotto al carrello
- `PUT /api/cart/:productId` - Modifica quantità
- `DELETE /api/cart/:productId` - Rimuovi prodotto

**Ordini**
- `POST /api/checkout` - Completa ordine (trigger notifica)
- `GET /api/orders` - Lista ordini utente
- `GET /api/orders/:id` - Dettaglio ordine

## Architettura

### Servizi Core

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| **keycloak** | 8080 | Identity Provider (realm: techstore) |
| **keycloak-postgres** | 5433 | Database Keycloak |
| **shop-ui** | 3000 | Frontend e-commerce (Nginx + keycloak-js) |
| **shop-api** | 3001 | Backend API REST + Swagger UI (Node.js/Express + jose) |
| **notification-service** | 3009 | Gestione notifiche ordini (JWT validation) |
| **postgres-orders** | 5432 | Database ordini |
| **grafana-lgtm** | 3005 | Stack observability (Tempo, Loki, Mimir) |

### Flusso di Autenticazione

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

**Dettagli:**
1. Frontend usa Authorization Code + PKCE (nessun secret esposto)
2. Shop API riceve JWT token nell'header `Authorization: Bearer <token>`
3. Shop API valida il token via JWKS (firma RSA)
4. Per chiamare Notification, Shop API ottiene un service token (Client Credentials)
5. Notification valida che il token provenga dal service account `shop-api`

### Keycloak Configuration

**Clients configurati:**
- `shop-ui`: Public client, PKCE enabled, per frontend
- `shop-api`: Confidential client, service account enabled, per M2M

**Scopes:**
- `techstore-scope`: Include claims custom (email, name, canCheckout, roles)

**User Attributes:**
- `canCheckout`: Controlla se l'utente può completare il checkout

### OpenTelemetry Support

Tutti i servizi Node.js hanno auto-instrumentation OTEL attiva che invia telemetria a Grafana LGTM:
- **Traces**: Distributed tracing con context propagation (W3C Trace Context)
- **Logs**: Correlati automaticamente ai trace
- **Metrics**: RED metrics (Rate, Errors, Duration)

## Configurazione

Il progetto utilizza variabili d'ambiente definite in `.env`:

```env
SHOP_UI_PORT=3000        # Frontend
SHOP_API_PORT=3001       # Backend API
# ... altre configurazioni
```

Modifica il file `.env` per personalizzare le porte senza toccare `docker-compose.yml`.

## Struttura del Progetto

```
demo/
├── services/
│   ├── shop-api/              # Backend API (Node.js/Express)
│   │   ├── middleware/auth.js # JWT validation middleware
│   │   ├── lib/service-token.js # Client Credentials flow
│   │   ├── instrumentation.js # OpenTelemetry setup
│   │   └── server.js          # Express application
│   │
│   ├── shop-ui/               # Frontend (Nginx + HTML/CSS/JS)
│   │   ├── js/common.js       # Keycloak-js integration
│   │   └── *.html             # Pagine con auth
│   │
│   ├── notification/          # Servizio notifiche (Node.js)
│   │   ├── instrumentation.js # OpenTelemetry setup
│   │   └── server.js          # JWT validation + M2M
│   │
│   └── keycloak/
│       └── realm-config.json  # Realm techstore configuration
│
├── scripts/                   # Script demo
│   ├── scenario-1-silent-failure.sh
│   ├── scenario-2-latency-spike.sh
│   └── generate-traffic.sh
│
├── docker-compose.yml         # Orchestrazione completa
├── Makefile                   # Comandi rapidi
└── init-db.sql               # Schema database ordini
```

## Note sulla POC

Questo progetto è una **Proof of Concept** pensata per:
- Dimostrare distributed tracing con OpenTelemetry
- Testare integrazione Keycloak con OAuth2/OIDC
- Simulare scenari di debug (silent failures, latency spikes)
- Fornire un ambiente di sviluppo/demo rapido

**Non è production-ready:**
- Session storage in memoria (non scalabile)
- Nessun rate limiting o circuit breaker
- Secrets hardcoded (demo only)
- Single replica per servizio

## Scenari Demo

```bash
make scenario-1   # Silent Failure: notifica che fallisce silenziosamente
make scenario-2   # Latency Spike: checkout lento per alcuni utenti
make traffic      # Genera traffico baseline
```

Vedi `QUICKSTART.md` per dettagli sui scenari e come debuggarli con Grafana.

## Licenza

MIT