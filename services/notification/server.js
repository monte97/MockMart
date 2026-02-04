const express = require('express');
const session = require('express-session');
const { createRemoteJWKSet, jwtVerify } = require('jose');

const app = express();
const PORT = process.env.PORT || 3009;

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

// Simulation state for demo scenarios
let simulateTimeout = false;
let slowTemplateUsers = new Set();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'notification-service-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification' });
});

/**
 * POST /config/simulate-timeout
 * Enable timeout simulation for next request
 */
app.post('/config/simulate-timeout', (req, res) => {
  simulateTimeout = true;
  console.log('SIMULATION: Timeout mode enabled for next request');
  res.json({ success: true, message: 'Timeout simulation enabled' });
});

/**
 * POST /config/reset
 * Reset all simulations
 */
app.post('/config/reset', (req, res) => {
  simulateTimeout = false;
  slowTemplateUsers.clear();
  console.log('SIMULATION: All simulations reset');
  res.json({ success: true, message: 'Simulations reset' });
});

/**
 * POST /config/slow-template
 * Mark specific users for slow template rendering
 */
app.post('/config/slow-template', (req, res) => {
  const { userIds } = req.body;
  if (Array.isArray(userIds)) {
    userIds.forEach(id => slowTemplateUsers.add(id));
    console.log(`SIMULATION: Slow template enabled for users: ${userIds.join(', ')}`);
  }
  res.json({ success: true, affected: userIds });
});

/**
 * POST /api/notifications/order
 * Receives notification of a new order
 *
 * Protected endpoint - requires valid JWT token from shop-api service account
 */
app.post('/api/notifications/order', requireAuth, async (req, res) => {
  const { orderId, userId, userEmail, userName, total, items, timestamp } = req.body;

  const auth = req.auth;
  const isServiceAccount = auth.isServiceAccount;
  const callingService = auth.callingService;

  // Verify this is from a service account (M2M call from shop-api)
  if (!isServiceAccount) {
    console.log('Rejected notification: Not a service account token');
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint only accepts service account tokens'
    });
  }

  // Optionally verify the calling service is shop-api
  if (callingService !== 'shop-api') {
    console.log(`Rejected notification: Unexpected calling service: ${callingService}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint only accepts calls from shop-api service'
    });
  }

  // SCENARIO 1: Simulate timeout (silent failure)
  if (simulateTimeout) {
    console.log('SIMULATING TIMEOUT - Request will hang...');
    // Reset flag after triggering once
    simulateTimeout = false;
    // Never respond - will cause timeout in shop-api
    return;
  }

  // SCENARIO 2: Simulate slow template rendering (latency spike)
  const isSlowTemplate = slowTemplateUsers.has(String(userId));
  const templateType = isSlowTemplate ? 'order_confirmation_premium' : 'order_confirmation_basic';
  const renderDelay = isSlowTemplate ? 3000 : 50; // 3s vs 50ms

  console.log('\n===== NEW ORDER NOTIFICATION =====');
  console.log(`Auth: Service Account (from: ${callingService})`);
  console.log(`Token subject: ${auth.subject}`);
  console.log(`Order ID: ${orderId}`);
  console.log(`User: ${userName} (${userEmail})`);
  console.log(`User ID: ${userId}`);
  console.log(`Total: EUR ${total}`);
  console.log(`Items count: ${items ? items.length : 0}`);
  console.log(`Template: ${templateType} (render time: ${renderDelay}ms)`);

  if (items && items.length > 0) {
    console.log('\nItems:');
    items.forEach(item => {
      console.log(`  - ${item.productName} x${item.quantity} @ EUR ${item.price}`);
    });
  }

  // Simulate template rendering
  if (isSlowTemplate) {
    console.log(`Rendering ${templateType}...`);
  }

  await new Promise(resolve => setTimeout(resolve, renderDelay));

  if (isSlowTemplate) {
    console.log(`Template rendering took ${renderDelay}ms`);
  }

  console.log('\nSimulating email notification...');
  console.log(`To: ${userEmail}`);
  console.log(`Subject: Order Confirmation #${orderId}`);
  console.log('Body: Thank you for your order! We will process it soon.');
  console.log('===================================\n');

  const notificationId = `notif-${Date.now()}-${orderId}`;

  res.json({
    success: true,
    notificationId: notificationId,
    template: templateType,
    renderTime: renderDelay,
    message: 'Order notification sent',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/notifications/stats
 * Returns simple stats (for testing)
 *
 * Protected endpoint
 */
app.get('/api/notifications/stats', requireAuth, (req, res) => {
  res.json({
    service: 'notification',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nNotification Service running on http://localhost:${PORT}`);
  console.log(`Protected by Keycloak JWT (realm: ${KEYCLOAK_REALM})`);
  console.log(`JWKS URL: ${KEYCLOAK_JWKS_URL}\n`);
});
