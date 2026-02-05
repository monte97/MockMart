const express = require('express');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose');

// Logger with OpenTelemetry - sends logs via OTLP with trace correlation
const logger = require('./lib/logger');

const app = express();
const PORT = process.env.PORT || 3010;

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
      subject: payload.sub,
      userId: payload.sub
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
let simulateFailure = false;
let simulateSlow = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment' });
});

/**
 * POST /config/simulate-failure
 * Enable failure simulation for next payment
 */
app.post('/config/simulate-failure', (req, res) => {
  simulateFailure = true;
  console.log('SIMULATION: Failure mode enabled for next payment');
  res.json({ success: true, message: 'Failure simulation enabled' });
});

/**
 * POST /config/simulate-slow
 * Enable slow response simulation for next payment
 */
app.post('/config/simulate-slow', (req, res) => {
  simulateSlow = true;
  console.log('SIMULATION: Slow mode enabled for next payment');
  res.json({ success: true, message: 'Slow simulation enabled' });
});

/**
 * POST /config/reset
 * Reset all simulations
 */
app.post('/config/reset', (req, res) => {
  simulateFailure = false;
  simulateSlow = false;
  console.log('SIMULATION: All simulations reset');
  res.json({ success: true, message: 'Simulations reset' });
});

/**
 * Generate a random transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `txn_${timestamp}_${randomPart}`;
}

/**
 * Simulate external payment gateway call
 * Returns random delay between min and max ms
 */
async function simulateGatewayCall(minMs = 50, maxMs = 100) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

/**
 * POST /api/payments/process
 * Process a payment
 *
 * Protected endpoint - requires valid JWT token
 *
 * Request body:
 *   - orderId: string (required)
 *   - amount: number (required)
 *   - paymentMethod: string (required) - e.g., 'credit_card', 'paypal', 'bank_transfer'
 *   - userId: string (optional, defaults to JWT subject)
 *
 * Response:
 *   - success: boolean
 *   - transactionId: string
 *   - processingTime: number (ms)
 */
app.post('/api/payments/process', requireAuth, async (req, res) => {
  const { orderId, amount, paymentMethod, userId: bodyUserId } = req.body;
  const userId = bodyUserId || req.auth.userId;

  const auth = req.auth;
  const callingService = auth.callingService;

  // Validate required fields
  // orderId is optional - may not exist yet for pre-authorization flows
  const paymentRef = orderId || `pre-auth-${Date.now()}`;

  if (amount === undefined || amount === null) {
    logger.warn({ paymentRef, userId }, 'Payment request missing amount');
    return res.status(400).json({
      success: false,
      error: 'Missing required field: amount'
    });
  }

  if (!paymentMethod) {
    logger.warn({ paymentRef, userId }, 'Payment request missing paymentMethod');
    return res.status(400).json({
      success: false,
      error: 'Missing required field: paymentMethod'
    });
  }

  // Log request received
  logger.info({
    paymentRef,
    userId,
    amount,
    paymentMethod,
    callingService
  }, 'Received payment processing request');

  // SCENARIO 1: Simulate failure
  if (simulateFailure) {
    simulateFailure = false;
    logger.error({
      paymentRef,
      userId,
      amount,
      paymentMethod,
      reason: 'Gateway declined transaction'
    }, 'Payment processing failed');

    return res.status(402).json({
      success: false,
      error: 'Payment declined',
      message: 'The payment gateway declined the transaction',
      paymentRef
    });
  }

  // SCENARIO 2: Simulate slow response
  let processingTime;
  if (simulateSlow) {
    simulateSlow = false;
    logger.warn({ paymentRef }, 'Payment gateway responding slowly...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    processingTime = 2000 + await simulateGatewayCall(10, 20);
  } else {
    // Normal processing - simulate gateway call
    logger.info({ paymentRef, paymentMethod }, 'Contacting payment gateway...');
    processingTime = await simulateGatewayCall(50, 100);
  }

  const transactionId = generateTransactionId();

  logger.info({
    paymentRef,
    userId,
    amount,
    paymentMethod,
    transactionId,
    processingTime
  }, 'Payment processed successfully');

  res.json({
    success: true,
    transactionId,
    processingTime,
    paymentRef,
    amount,
    paymentMethod,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/payments/status/:transactionId
 * Get payment status (mock endpoint for demo)
 *
 * Protected endpoint
 */
app.get('/api/payments/status/:transactionId', requireAuth, (req, res) => {
  const { transactionId } = req.params;

  logger.info({ transactionId }, 'Payment status check');

  // Mock response - always return completed for demo purposes
  res.json({
    transactionId,
    status: 'completed',
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
  console.log(`\nPayment Service running on http://localhost:${PORT}`);
  console.log(`Protected by Keycloak JWT (realm: ${KEYCLOAK_REALM})`);
  console.log(`JWKS URL: ${KEYCLOAK_JWKS_URL}\n`);
});
