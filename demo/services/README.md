# Servizi Core

Questa directory contiene i servizi principali dell'applicazione e-commerce TechStore.

## Struttura

### `shop-api/`

**Backend API REST** per l'applicazione e-commerce.

- **Tecnologia**: Node.js + Express
- **Porta**: 3001
- **Responsabilità**:
  - Gestione prodotti (CRUD)
  - Autenticazione utenti (sessioni)
  - Gestione carrello
  - Processo di checkout
  - Creazione ordini
  - Invio notifiche a notification-service

**Endpoints principali**:
- `/api/products` - Catalogo prodotti
- `/api/auth/*` - Login/logout
- `/api/cart` - Gestione carrello
- `/api/checkout` - Completamento ordini
- `/api-docs` - Swagger UI

### `shop-ui/`

**Frontend statico** servito tramite Nginx.

- **Tecnologia**: Nginx + HTML/CSS/JavaScript
- **Porta**: 3000
- **Responsabilità**:
  - Servire file statici (HTML, CSS, JS, immagini)
  - Proxy richieste `/api/*` verso shop-api
  - Proxy `/api-docs` verso shop-api

**Proxy configuration**: Tutte le chiamate `/api/*` vengono inoltrate a `http://shop-api:3001`

### `notification/`

**Servizio di notifiche** per ordini.

- **Tecnologia**: Node.js + Express
- **Porta**: 3009
- **Responsabilità**:
  - Ricevere webhook da shop-api quando viene creato un ordine
  - Loggare notifiche (simulazione invio email)
  - Health check endpoint

**Endpoints**:
- `POST /api/notifications/order` - Ricevi notifica ordine
- `GET /health` - Health check

**Nota**: Versione base senza autenticazione. Per setup avanzato con Keycloak vedi `_other/docs/`


## Architettura

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP :3000
       ▼
┌─────────────┐
│  shop-ui    │ (Nginx)
│   :3000     │
└──────┬──────┘
       │ proxy /api/*
       ▼
┌─────────────┐      HTTP POST
│  shop-api   │──────────────────┐
│   :3001     │                  │
└─────────────┘                  ▼
                      ┌──────────────────┐
                      │  notification    │
                      │     :3009        │
                      └──────────────────┘
```

## Servizi Opzionali

Per servizi demo aggiuntivi (Keycloak, Observability Stack, Chain API, M2M API, ecc.), vedi la directory `_other/` nella root del progetto.
