# OpenTelemetry Correlation Demo - Quick Start

Demo pratica per l'articolo: **"Debug Cross-Service in 2 Minuti: OpenTelemetry Distributed Tracing con LGTM Stack"**

Questa demo include un'applicazione e-commerce completa con:
- **Keycloak** per autenticazione OAuth2/OIDC
- **OpenTelemetry** per distributed tracing
- **Grafana LGTM** per visualizzazione (Loki, Grafana, Tempo, Mimir)

---

## 🚀 Setup Rapido (5 Minuti)

### Prerequisiti
- Docker e Docker Compose installati
- Make (opzionale ma raccomandato)
- 8GB RAM liberi
- Porte disponibili: 3000, 3001, 3005, 3009, 5432, 5433, 8080

### Avvio

```bash
# Clone repository
git clone https://github.com/monte97/otel-workshop
cd otel-workshop/drafts/01_correlation_OK/demo

# Avvia stack completo
make up

# Verifica che tutto sia healthy
make health
```

**Output atteso:**
```
🏥 Health Status:
  Keycloak:             ✅ Healthy
  Grafana LGTM:         ✅ Healthy
  Shop API:             ✅ Healthy
  Notification Service: ✅ Healthy
  PostgreSQL (orders):  ✅ Healthy
  PostgreSQL (keycloak):✅ Healthy
```

> **Nota:** Il primo avvio potrebbe richiedere 2-3 minuti per scaricare le immagini Docker e inizializzare Keycloak.

---

## 🌐 Accesso ai Servizi

| Servizio | URL | Descrizione |
|----------|-----|-------------|
| **Shop UI** | http://localhost:3000 | Frontend e-commerce |
| **Shop API** | http://localhost:3001/api/products | REST API |
| **Keycloak Admin** | http://localhost:8080/admin | Identity Provider (admin/admin) |
| **Grafana** | http://localhost:3005 | LGTM Stack (Tempo, Loki, Mimir) |
| **Notification** | http://localhost:3009/health | Notification service |

**Credenziali utenti:**
- `admin@techstore.com` / `admin123` (Admin)
- `mario.rossi@example.com` / `mario123` (User)
- `blocked@example.com` / `blocked123` (Checkout bloccato)

**Quick access:**
```bash
make grafana   # Apre Grafana nel browser
make shop      # Apre Shop UI nel browser
make keycloak  # Apre Keycloak Admin nel browser
```

---

## 🔐 Test Autenticazione

### Login via Frontend

1. Apri http://localhost:3000
2. Click "Login" → Redirect a Keycloak
3. Inserisci credenziali (es. `mario.rossi@example.com` / `mario123`)
4. Redirect automatico a Shop UI con utente loggato

### Test via cURL

```bash
# Ottieni token per Mario
TOKEN=$(curl -s -X POST \
  "http://localhost:8080/realms/techstore/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=shop-ui" \
  -d "username=mario" \
  -d "password=mario123" \
  -d "scope=openid techstore-scope" | jq -r '.access_token')

# Verifica profilo
curl -s http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Output atteso:**
```json
{
  "id": "...",
  "email": "mario.rossi@example.com",
  "username": "mario",
  "name": "Mario Rossi",
  "canCheckout": true,
  "role": "user"
}
```

### Test Checkout Bloccato

```bash
# Token per utente bloccato
BLOCKED_TOKEN=$(curl -s -X POST \
  "http://localhost:8080/realms/techstore/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=shop-ui" \
  -d "username=blocked" \
  -d "password=blocked123" \
  -d "scope=openid techstore-scope" | jq -r '.access_token')

# Verifica canCheckout=false
curl -s http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer $BLOCKED_TOKEN" | jq '.canCheckout'
# Output: false
```

---

## 🧪 Scenari Dimostrativi

### Scenario 1: Silent Failure (Timeout)

Simula un ordine che viene salvato ma la notifica fallisce silenziosamente:

```bash
make scenario-1
```

**Cosa succede:**
1. Notification service viene configurato per andare in timeout
2. Viene creato un checkout
3. API risponde 200 OK (ordine salvato)
4. Notifica NON viene inviata (timeout)

**Debug con OpenTelemetry:**
1. Apri Grafana: http://localhost:3005
2. Vai a Explore → Tempo
3. Query: `{service.name="shop-api"}`
4. Cerca span ERROR su "HTTP POST /send"
5. Click "View Logs" → Vedi correlazione automatica

**Tempo debug:** ~2 minuti invece di 20-30 minuti senza trace.

---

### Scenario 2: Latency Spike (Template Lento)

Simula checkout lento solo per alcuni utenti (template premium):

```bash
make scenario-2
```

**Cosa succede:**
1. Template "premium" configurato come lento (3s rendering)
2. Vengono generate 50 richieste con utenti diversi
3. Solo utenti "alice", "user5", "user15", "user25" sono lenti

**Debug con OpenTelemetry:**
1. Apri Grafana: http://localhost:3005
2. Query: `{service.name="shop-api"} | duration > 3s`
3. Confronta trace lente vs veloci
4. Analizza span attributes → `notification.template: "premium"`
5. Identifica bottleneck: template rendering 3s

**Risultato:** Identificato p99 latency spike in 15 minuti.

---

## 📋 Comandi Makefile

### Stack Management

```bash
make up       # Avvia tutti i servizi
make down     # Ferma tutti i servizi
make restart  # Riavvia servizi
make clean    # Ferma e rimuove volumi
make status   # Mostra container status
```

### Logs

```bash
make logs              # Follow tutti i logs
make logs-api          # Solo shop-api
make logs-notification # Solo notification-service
make logs-grafana      # Solo Grafana LGTM
make logs-keycloak     # Solo Keycloak
```

### Scenari

```bash
make scenario-1  # Silent Failure (timeout)
make scenario-2  # Latency Spike (slow template)
make traffic     # Genera traffico baseline (50 req)
```

### Health Check

```bash
make health  # Verifica stato servizi
```

**Output:**
```
🏥 Health Status:
  Keycloak:             ✅ Healthy
  Grafana LGTM:         ✅ Healthy
  Shop API:             ✅ Healthy
  Notification Service: ✅ Healthy
  PostgreSQL (orders):  ✅ Healthy
  PostgreSQL (keycloak):✅ Healthy
```

### Browser Access

```bash
make grafana   # Apre http://localhost:3005
make shop      # Apre http://localhost:3000
make keycloak  # Apre http://localhost:8080/admin
```

---

## 🔍 Query Grafana Utili

### Tempo (Distributed Tracing)

Apri: http://localhost:3005 → Explore → Tempo

**Query base:**
```
{service.name="shop-api"}
```

**Filtra per errori:**
```
{service.name="shop-api"} && status=error
```

**Filtra per latency:**
```
{service.name="shop-api"} | duration > 1s
```

**Cerca per order ID:** (sostituisci `123` con ID reale)
```
{service.name="shop-api"} | order_id="123"
```

### Loki (Logs)

Apri: http://localhost:3005 → Explore → Loki

**Logs di shop-api:**
```
{container="shop-api"}
```

**Logs con errori:**
```
{container="shop-api"} |= "ERROR"
```

**Logs correlati a trace:** (sostituisci trace_id)
```
{container="shop-api"} | json | trace_id="abc123..."
```

---

## 🧹 Cleanup

```bash
# Stop services
make down

# Remove volumes (attenzione: cancella DB!)
make clean
```

---

## 📊 Architettura

```
┌─────────────┐
│  Client     │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────────┐
│  Shop UI (Nginx + keycloak-js)          │
│  http://localhost:3000                  │
│  Authorization Code + PKCE              │
└──────┬─────────────────┬────────────────┘
       │                 │
       │                 v
       │          ┌────────────────────┐
       │          │  Keycloak          │
       │          │  http://localhost:8080
       │          │  Realm: techstore  │
       │          └──────┬─────────────┘
       │                 │ JWT Tokens
       v                 v
┌─────────────────────────────────────────┐
│  Shop API (Node.js + Express + jose)    │
│  http://localhost:3001                  │
│  + JWT Validation via JWKS              │
│  + OpenTelemetry Auto-Instrumentation   │
└──────┬──────────────────┬───────────────┘
       │                  │ Client Credentials (M2M)
       v                  v
┌──────────────┐   ┌────────────────────┐
│ PostgreSQL   │   │ Notification       │
│ (orders DB)  │   │ Service (Node.js)  │
│ :5432        │   │ :3009              │
│              │   │ JWT Validation     │
└──────────────┘   └──────┬─────────────┘
                          │
       ┌──────────────────┘
       │
       v
┌─────────────────────────────────────────┐
│  Grafana LGTM Stack                     │
│  http://localhost:3005                  │
│  - Tempo (traces)                       │
│  - Loki (logs)                          │
│  - Mimir (metrics)                      │
│  - OTLP Receiver (:4317, :4318)         │
└─────────────────────────────────────────┘
```

**Authentication Flow:**
- Frontend → Keycloak: Authorization Code + PKCE
- Frontend → Shop API: Bearer JWT token
- Shop API → Notification: Service Account token (Client Credentials)

**Context Propagation:**
- Shop API → Notification: W3C Trace Context headers (`traceparent`, `tracestate`)
- Shop API → PostgreSQL: trace_id iniettato automaticamente
- Ogni span/log condivide lo stesso `trace_id`

---

## 🐛 Troubleshooting

### Porta già in uso

**Errore:**
```
Error: bind: address already in use
```

**Soluzione:**
```bash
# Trova processo che usa porta 3000/3005/3001
lsof -i :3000
lsof -i :3005

# Kill processo oppure cambia porta in docker-compose.yml
```

### Container non healthy

**Verifica:**
```bash
make health
docker compose ps
docker compose logs <service-name>
```

**Reset completo:**
```bash
make clean
make up
```

### Grafana non mostra trace

**Checklist:**
1. Servizi healthy? → `make health`
2. Traffico generato? → `make traffic`
3. Aspetta 10-15 secondi per flush trace
4. Query corretta? → `{service.name="shop-api"}`

### Keycloak login fallisce

**Errore: "Invalid redirect URI"**
```bash
# Verifica che shop-ui usi http://localhost:3000
# Il redirect URI deve matchare esattamente la configurazione client
```

**Errore: "Token validation failed"**
```bash
# Verifica che Keycloak sia raggiungibile
curl http://localhost:8080/realms/techstore/.well-known/openid-configuration

# Restart services se necessario
docker compose restart shop-api notification-service
```

**Errore: "Realm not found"**
```bash
# Keycloak potrebbe non aver importato il realm
# Reset completo:
make clean
make up
```

### Checkout fallisce con "Missing required fields"

Il checkout richiede `shippingAddress` e `paymentMethod` nel body:
```bash
curl -X POST http://localhost:3001/api/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {"street": "Via Roma 1", "city": "Milano", "zipCode": "20100", "country": "Italy"},
    "paymentMethod": "credit_card"
  }'
```

---

## 📚 Risorse

- **Articolo completo**: [Link all'articolo pubblicato]
- **Repository**: https://github.com/monte97/otel-workshop
- **OpenTelemetry Docs**: https://opentelemetry.io
- **Grafana LGTM**: https://grafana.com/oss/lgtm-stack

---

## 🤝 Feedback

Hai trovato bug? Hai suggerimenti?

- **Issues**: https://github.com/monte97/otel-workshop/issues
- **LinkedIn**: https://linkedin.com/in/monte97
- **GitHub**: https://github.com/monte97

---

**Buon debugging! 🚀**
