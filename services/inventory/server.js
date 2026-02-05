const express = require('express');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose');

// Logger with OpenTelemetry - sends logs via OTLP with trace correlation
const logger = require('./lib/logger');

const app = express();
const PORT = process.env.PORT || 3011;

// Keycloak configuration
// KEYCLOAK_URL is used for internal communication (Docker DNS)
// KEYCLOAK_PUBLIC_URL is used for token issuer validation (matches what browser sees)
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_AUTH_PATH = process.env.KEYCLOAK_AUTH_PATH || '/auth';
const KEYCLOAK_ISSUER = `${KEYCLOAK_PUBLIC_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}`;
const KEYCLOAK_JWKS_URL = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// Cache JWKS for performance
let jwks = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(KEYCLOAK_JWKS_URL));
  }
  return jwks;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * JWT validation middleware
 * Validates JWT token from Keycloak
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No Bearer token provided'
    });
  }

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: KEYCLOAK_ISSUER,
      clockTolerance: 30
    });

    // Store token info for logging
    req.auth = {
      tokenPayload: payload,
      // Determine if this is a service account (no email, has azp/clientId)
      isServiceAccount: !payload.email && (payload.azp || payload.clientId),
      callingService: payload.azp || payload.clientId || 'unknown',
      subject: payload.sub
    };

    next();
  } catch (error) {
    console.error('JWT validation failed:', error.message);

    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please obtain a new token'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
}

// In-memory stock data (IDs match shop-api products)
const stockData = {
  1: { name: 'MacBook Pro 16"', stock: 50 },
  2: { name: 'iPhone 15 Pro', stock: 200 },
  3: { name: 'iPad Air', stock: 150 },
  4: { name: 'AirPods Pro', stock: 75 },
  5: { name: 'Apple Watch Series 9', stock: 30 },
  6: { name: 'Magic Keyboard', stock: 100 },
  7: { name: 'Studio Display', stock: 80 },
  8: { name: 'Mac Mini M2', stock: 120 },
  9: { name: 'HomePod Mini', stock: 60 },
  10: { name: 'AirTag 4 Pack', stock: 90 }
};

// Reservations storage
const reservations = new Map();

// Simulation state for demo scenarios
let simulateOutOfStock = false;
let simulateSlow = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory' });
});

/**
 * POST /config/simulate-out-of-stock
 * Enable out-of-stock simulation for next check
 */
app.post('/config/simulate-out-of-stock', (req, res) => {
  simulateOutOfStock = true;
  logger.info('SIMULATION: Out-of-stock mode enabled for next check');
  res.json({ success: true, message: 'Out-of-stock simulation enabled' });
});

/**
 * POST /config/simulate-slow
 * Enable slow operation simulation for next request
 */
app.post('/config/simulate-slow', (req, res) => {
  simulateSlow = true;
  logger.info('SIMULATION: Slow mode enabled for next operation');
  res.json({ success: true, message: 'Slow simulation enabled' });
});

/**
 * POST /config/reset
 * Reset all simulations
 */
app.post('/config/reset', (req, res) => {
  simulateOutOfStock = false;
  simulateSlow = false;
  logger.info('SIMULATION: All simulations reset');
  res.json({ success: true, message: 'Simulations reset' });
});

/**
 * POST /api/inventory/check
 * Check if items are in stock
 *
 * Accepts: { items: [{productId, quantity}] }
 * Returns: { available: boolean, items: [{productId, available, stock}] }
 */
app.post('/api/inventory/check', requireAuth, async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'items array is required'
    });
  }

  logger.info({
    itemsCount: items.length,
    callingService: req.auth.callingService
  }, 'Checking inventory availability');

  // SCENARIO: Simulate slow operation
  if (simulateSlow) {
    logger.warn('Processing inventory check - this may take a while...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    simulateSlow = false;
  }

  // SCENARIO: Simulate out of stock
  if (simulateOutOfStock) {
    simulateOutOfStock = false;
    logger.warn({ items }, 'Simulating out-of-stock condition');

    const itemResults = items.map(item => ({
      productId: item.productId,
      requestedQuantity: item.quantity,
      available: false,
      stock: 0,
      reason: 'Out of stock (simulated)'
    }));

    return res.json({
      available: false,
      items: itemResults,
      timestamp: new Date().toISOString()
    });
  }

  // Normal inventory check
  const itemResults = items.map(item => {
    const product = stockData[item.productId];
    const available = product && product.stock >= item.quantity;

    return {
      productId: item.productId,
      requestedQuantity: item.quantity,
      available,
      stock: product ? product.stock : 0,
      productName: product ? product.name : 'Unknown'
    };
  });

  const allAvailable = itemResults.every(item => item.available);

  logger.info({
    available: allAvailable,
    itemsChecked: items.length
  }, 'Inventory check completed');

  res.json({
    available: allAvailable,
    items: itemResults,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/inventory/reserve
 * Reserve items for an order
 *
 * Accepts: { orderId, items: [{productId, quantity}] }
 * Returns: { success, reservationId, items }
 */
app.post('/api/inventory/reserve', requireAuth, async (req, res) => {
  const { orderId, items } = req.body;

  if (!orderId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'orderId is required'
    });
  }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'items array is required'
    });
  }

  logger.info({
    orderId,
    itemsCount: items.length,
    callingService: req.auth.callingService
  }, 'Processing inventory reservation');

  // SCENARIO: Simulate slow operation
  if (simulateSlow) {
    logger.warn({ orderId }, 'Processing reservation - this may take a while...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    simulateSlow = false;
  }

  // Check availability first
  const unavailableItems = [];
  for (const item of items) {
    const product = stockData[item.productId];
    if (!product || product.stock < item.quantity) {
      unavailableItems.push({
        productId: item.productId,
        requestedQuantity: item.quantity,
        availableStock: product ? product.stock : 0
      });
    }
  }

  if (unavailableItems.length > 0) {
    logger.warn({
      orderId,
      unavailableItems
    }, 'Reservation failed - insufficient stock');

    return res.status(409).json({
      success: false,
      error: 'Insufficient stock',
      unavailableItems,
      timestamp: new Date().toISOString()
    });
  }

  // Decrement stock and create reservation
  const reservationId = `res-${Date.now()}-${orderId}`;
  const reservedItems = [];

  for (const item of items) {
    const product = stockData[item.productId];
    product.stock -= item.quantity;

    reservedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      productName: product.name,
      remainingStock: product.stock
    });
  }

  // Store reservation for potential release
  reservations.set(reservationId, {
    orderId,
    items: reservedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
    createdAt: new Date().toISOString()
  });

  logger.info({
    orderId,
    reservationId,
    itemsReserved: reservedItems.length
  }, 'Inventory reservation successful');

  res.json({
    success: true,
    reservationId,
    orderId,
    items: reservedItems,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/inventory/release
 * Release a reservation (for failed orders)
 *
 * Accepts: { reservationId }
 * Returns items to stock
 */
app.post('/api/inventory/release', requireAuth, async (req, res) => {
  const { reservationId } = req.body;

  if (!reservationId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'reservationId is required'
    });
  }

  logger.info({
    reservationId,
    callingService: req.auth.callingService
  }, 'Processing inventory release');

  // SCENARIO: Simulate slow operation
  if (simulateSlow) {
    logger.warn({ reservationId }, 'Processing release - this may take a while...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    simulateSlow = false;
  }

  const reservation = reservations.get(reservationId);

  if (!reservation) {
    logger.warn({ reservationId }, 'Reservation not found');
    return res.status(404).json({
      success: false,
      error: 'Reservation not found',
      reservationId
    });
  }

  // Return items to stock
  const releasedItems = [];
  for (const item of reservation.items) {
    const product = stockData[item.productId];
    if (product) {
      product.stock += item.quantity;
      releasedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        newStock: product.stock
      });
    }
  }

  // Remove reservation
  reservations.delete(reservationId);

  logger.info({
    reservationId,
    orderId: reservation.orderId,
    itemsReleased: releasedItems.length
  }, 'Inventory release successful');

  res.json({
    success: true,
    reservationId,
    orderId: reservation.orderId,
    releasedItems,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/inventory/stock
 * Get current stock levels (for debugging/admin)
 */
app.get('/api/inventory/stock', requireAuth, (req, res) => {
  const stockList = Object.entries(stockData).map(([productId, data]) => ({
    productId,
    name: data.name,
    stock: data.stock
  }));

  res.json({
    products: stockList,
    activeReservations: reservations.size,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ error: err.message }, 'Internal server error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nInventory Service running on http://localhost:${PORT}`);
  console.log(`Protected by Keycloak JWT (realm: ${KEYCLOAK_REALM})`);
  console.log(`JWKS URL: ${KEYCLOAK_JWKS_URL}\n`);
});
