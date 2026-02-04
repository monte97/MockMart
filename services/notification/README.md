# Notification Service

Microservizio minimale per gestire notifiche ordini nel sistema TechStore.

**Porta**: 3009

## Scopo

Riceve notifiche da shop-api quando vengono creati nuovi ordini.

**Nota**: La versione base usa webhook semplici. Per autenticazione avanzata con Keycloak e Service Account, vedi `_other/docs/KEYCLOAK_SETUP.md`.

## Endpoints

### POST /api/notifications/order

Riceve notifica di nuovo ordine creato.

**Autenticazione:** Nessuna (versione base). Per setup con autenticazione Keycloak vedi `_other/docs/`

**Request:**
```json
{
  "orderId": 123,
  "userId": "uuid-user",
  "userEmail": "mario.rossi@example.com",
  "userName": "Mario Rossi",
  "total": 299.99,
  "items": [
    {
      "productId": 1,
      "productName": "Laptop",
      "quantity": 1,
      "price": 299.99
    }
  ],
  "timestamp": "2026-01-28T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "notificationId": "notif-1706437800000-123",
  "message": "Order notification sent",
  "timestamp": "2026-01-28T10:30:00Z"
}
```

**Comportamento:**
- Valida token con Keycloak
- Riconosce se il token è di un service account
- Logga i dettagli della notifica su console
- Simula invio email (solo log)

### GET /api/notifications/stats

Statistiche servizio (per testing).

**Response:**
```json
{
  "service": "notification",
  "uptime": 3600,
  "notificationsSent": 42,
  "timestamp": "2026-01-28T10:30:00Z"
}
```

### GET /health

Health check (non protetto).

**Response:**
```json
{
  "status": "ok",
  "service": "notification"
}
```

## Webhook Semplice (Versione Base)

Shop-api invia notifiche via HTTP POST senza autenticazione:

```bash
curl -X POST http://notification-service:3009/api/notifications/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 123,
    "userEmail": "mario.rossi@example.com",
    "userName": "Mario Rossi",
    "total": 299.99,
    "items": [...]
  }'
```

**Nota:** Per setup avanzato con autenticazione Keycloak (Service Account, JWT validation), vedi `_other/docs/SERVICE_ACCOUNT_GUIDE.md`.

## Log Output

Esempio di log quando riceve una notifica:

```
📧 ===== NEW ORDER NOTIFICATION =====
Order ID: 1
User: Mario Rossi (mario.rossi@example.com)
Total: €299.99
Items count: 2

Items:
  - Laptop x1 @ €899.99
  - Mouse x2 @ €29.99

🔔 Simulating email notification...
To: mario.rossi@example.com
Subject: Order Confirmation #1
Body: Thank you for your order! We will process it soon.
===================================
```

## Testing

### Test base

1. Avvia i servizi:
```bash
docker compose up -d
```

2. Completa un checkout su http://localhost:3000

3. Controlla i log:
```bash
docker logs -f notification-service
```

### Test manuale con curl

```bash
curl -X POST http://localhost:3009/api/notifications/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 999,
    "userId": "test-user",
    "userEmail": "test@example.com",
    "userName": "Test User",
    "total": 100.00,
    "items": [{"productName": "Test Product", "quantity": 1, "price": 100.00}]
  }'
```

## Possibili Estensioni

1. **Database persistente** - Salvare notifiche in DB
2. **Email reale** - Integrare con SendGrid/AWS SES
3. **Retry logic** - Tentare di nuovo se l'invio fallisce
4. **Queue system** - Usare RabbitMQ/Kafka per notifiche asincrone
5. **Multiple channels** - SMS, push notifications, webhook
6. **Templates** - Template engine per email personalizzate
