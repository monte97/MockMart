/**
 * Service Token Manager for M2M Communication
 * Uses OAuth2 Client Credentials flow to get tokens from Keycloak
 */

const https = require('https');
const http = require('http');

// Keycloak configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'shop-api';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'shop-api-secret';

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

// Token cache
let cachedToken = null;
let tokenExpiry = null;
// Refresh token 60 seconds before expiry
const EXPIRY_BUFFER_SECONDS = 60;

/**
 * Get a service token using Client Credentials flow
 * Caches the token and refreshes automatically when expired
 */
async function getServiceToken() {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const tokenResponse = await fetchToken();

    // Cache the token
    cachedToken = tokenResponse.access_token;
    // Set expiry with buffer
    const expiresIn = tokenResponse.expires_in || 300;
    tokenExpiry = now + (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;

    console.log(`Service token obtained, expires in ${expiresIn}s`);
    return cachedToken;
  } catch (error) {
    console.error('Failed to obtain service token:', error.message);
    throw new Error('Failed to obtain service token for M2M communication');
  }
}

/**
 * Fetch token from Keycloak using Client Credentials flow
 */
function fetchToken() {
  return new Promise((resolve, reject) => {
    const url = new URL(TOKEN_ENDPOINT);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: KEYCLOAK_CLIENT_ID,
      client_secret: KEYCLOAK_CLIENT_SECRET
    }).toString();

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error('Invalid JSON response from token endpoint'));
          }
        } else {
          reject(new Error(`Token request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Clear the token cache (useful for testing or forcing refresh)
 */
function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = null;
}

/**
 * Check if we have a valid cached token
 */
function hasValidToken() {
  const now = Date.now();
  return cachedToken && tokenExpiry && now < tokenExpiry;
}

module.exports = {
  getServiceToken,
  clearTokenCache,
  hasValidToken
};
