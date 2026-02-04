/**
 * JWT Authentication Middleware for Shop API
 * Validates JWT tokens from Keycloak using JWKS
 */

const { createRemoteJWKSet, jwtVerify } = require('jose');

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

/**
 * Get JWKS (JSON Web Key Set) from Keycloak
 * Lazily initialized and cached
 */
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
 * Middleware to require authentication
 * Validates JWT token and adds user info to req.user
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
      // Allow some clock skew
      clockTolerance: 30
    });

    // Extract user information from token
    // Note: sub claim may be missing in some Keycloak configurations, use email as fallback
    const userId = payload.sub || payload.email || payload.preferred_username;

    req.user = {
      id: userId,
      email: payload.email,
      name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      firstName: payload.given_name,
      lastName: payload.family_name,
      username: payload.preferred_username,
      // Extract roles from token
      roles: payload.realm_access?.roles || payload.roles || [],
      // Extract canCheckout from custom claim (as string from Keycloak attributes)
      canCheckout: payload.canCheckout === 'true' || payload.canCheckout === true,
      // Store raw token payload for advanced use cases
      tokenPayload: payload
    };


    // Store raw token for M2M forwarding
    req.accessToken = token;

    next();
  } catch (error) {
    console.error('JWT validation failed:', error.message);

    // Provide specific error messages
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }

    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token signature verification failed'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Middleware to optionally authenticate
 * If token is present and valid, adds user info to req.user
 * If no token or invalid token, continues without user info
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: KEYCLOAK_ISSUER,
      clockTolerance: 30
    });

    const userId = payload.sub || payload.email || payload.preferred_username;

    req.user = {
      id: userId,
      email: payload.email,
      name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      firstName: payload.given_name,
      lastName: payload.family_name,
      username: payload.preferred_username,
      roles: payload.realm_access?.roles || payload.roles || [],
      canCheckout: payload.canCheckout === 'true' || payload.canCheckout === true,
      tokenPayload: payload
    };

    req.accessToken = token;
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    console.warn('Optional auth: Invalid token provided, continuing without authentication');
  }

  next();
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login first'
    });
  }

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  extractToken,
  getJWKS
};
