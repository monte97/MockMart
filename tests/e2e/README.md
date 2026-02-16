# MockMart E2E Tests

Test End-to-End per [MockMart](../MockMart/) con integrazione OpenTelemetry per trace correlation e visual testing.

## Prerequisiti

- Node.js >= 18
- MockMart running (`cd ../MockMart && make up`)

## Quick Start

```bash
# Installa dipendenze
npm install
npx playwright install

# Avvia MockMart (in altro terminale)
cd ../MockMart && make up

# Esegui test
npm test

# Esegui in UI mode (debug)
npm run test:ui
```

## Struttura

```
mockmart-e2e/
├── tests/
│   ├── checkout.spec.ts        # Test checkout flow (Parte 1)
│   └── visual-checkout.spec.ts # Visual regression (Parte 3)
├── fixtures/
│   ├── auth.ts                 # Autenticazione Keycloak
│   └── trace-collector.ts      # Trace correlation (Parte 2)
├── utils/
│   └── grafana-link.ts         # Link a Grafana traces
└── playwright.config.ts
```

## Articoli Correlati

Questa demo accompagna la serie di articoli:

1. [Testare un E-commerce a Microservizi](../../articles/tutorials/draft/playwright-mockmart-series/01-primi-test/)
2. [Quando il Test Fallisce ma il Bug è nel Backend](../../articles/tutorials/draft/playwright-mockmart-series/02-trace-correlation/)
3. [Screenshot Testing su Stati Complessi](../../articles/tutorials/draft/playwright-mockmart-series/03-visual-testing/)

## Configurazione

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `BASE_URL` | `http://localhost` | URL base MockMart |
| `GRAFANA_URL` | `http://localhost/grafana` | URL Grafana per trace links |

## Comandi

```bash
npm test              # Esegui tutti i test
npm run test:ui       # UI mode interattivo
npm run test:headed   # Browser visibile
npm run test:debug    # Debug mode
npm run report        # Apri report HTML
```
