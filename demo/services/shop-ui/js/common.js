// Common utilities and functions used across pages
// Keycloak integration for authentication

// Keycloak configuration
const KEYCLOAK_URL = 'http://localhost:8080';
const KEYCLOAK_REALM = 'techstore';
const KEYCLOAK_CLIENT_ID = 'shop-ui';

// Keycloak instance
let keycloak = null;
let keycloakInitialized = false;

/**
 * Initialize Keycloak
 * Uses check-sso to silently check if user is already logged in
 */
async function initKeycloak() {
  if (keycloakInitialized) {
    return keycloak;
  }

  keycloak = new Keycloak({
    url: KEYCLOAK_URL,
    realm: KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT_ID
  });

  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: false
    });

    keycloakInitialized = true;
    console.log('Keycloak initialized, authenticated:', authenticated);

    if (authenticated) {
      // Setup token refresh
      setupTokenRefresh();
    }

    return keycloak;
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    keycloakInitialized = false;
    return null;
  }
}

/**
 * Setup automatic token refresh
 * Refreshes token every 60 seconds if authenticated
 */
function setupTokenRefresh() {
  setInterval(async () => {
    if (keycloak && keycloak.authenticated) {
      try {
        const refreshed = await keycloak.updateToken(70); // Refresh if token expires in 70 seconds
        if (refreshed) {
          console.log('Token refreshed');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, user needs to re-login
        keycloak.login();
      }
    }
  }, 60000); // Check every 60 seconds
}

/**
 * Custom fetch wrapper to handle Keycloak authentication
 * Adds Authorization header with Bearer token if authenticated
 */
async function authenticatedFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  // Add Authorization header if authenticated
  if (keycloak && keycloak.authenticated && keycloak.token) {
    // Ensure token is fresh
    try {
      await keycloak.updateToken(30);
    } catch (error) {
      console.error('Token update failed before fetch:', error);
    }
    headers['Authorization'] = `Bearer ${keycloak.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'  // Include cookies for session (for cart)
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    // If we thought we were authenticated but got 401, redirect to login
    if (keycloak && keycloak.authenticated) {
      console.log('Got 401 while authenticated, redirecting to login');
      keycloak.login();
    }
  }

  return response;
}

/**
 * Check if user is authenticated and update UI
 */
async function checkAuth() {
  await initKeycloak();

  if (keycloak && keycloak.authenticated) {
    // Get user info from token
    const tokenParsed = keycloak.tokenParsed;
    const user = {
      id: tokenParsed.sub,
      email: tokenParsed.email,
      username: tokenParsed.preferred_username,
      name: tokenParsed.name || `${tokenParsed.given_name || ''} ${tokenParsed.family_name || ''}`.trim(),
      firstName: tokenParsed.given_name,
      lastName: tokenParsed.family_name,
      // Get roles from realm_access
      roles: tokenParsed.realm_access?.roles || [],
      // Get canCheckout from custom claim
      canCheckout: tokenParsed.canCheckout === 'true' || tokenParsed.canCheckout === true
    };

    // Determine role for UI
    user.role = user.roles.includes('admin') ? 'admin' : 'user';

    updateAuthUI(user);
    return user;
  } else {
    updateAuthUI(null);
    return null;
  }
}

/**
 * Update authentication UI elements
 */
function updateAuthUI(user) {
  const userGreeting = document.getElementById('userGreeting');
  const loginLink = document.getElementById('loginLink');
  const ordersLink = document.getElementById('ordersLink');
  const adminLink = document.getElementById('adminLink');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    if (userGreeting) {
      userGreeting.textContent = `Ciao, ${user.name || user.username}!`;
      userGreeting.classList.remove('hidden');
    }
    if (loginLink) loginLink.classList.add('hidden');
    if (ordersLink) ordersLink.classList.remove('hidden');

    // Check for admin role
    const isAdmin = user.role === 'admin';
    if (adminLink) {
      if (isAdmin) {
        adminLink.classList.remove('hidden');
      } else {
        adminLink.classList.add('hidden');
      }
    }

    if (logoutBtn) {
      logoutBtn.classList.remove('hidden');
      logoutBtn.removeEventListener('click', logoutHandler);
      logoutBtn.addEventListener('click', logoutHandler);
    }
  } else {
    if (userGreeting) userGreeting.classList.add('hidden');
    if (loginLink) loginLink.classList.remove('hidden');
    if (ordersLink) ordersLink.classList.add('hidden');
    if (adminLink) adminLink.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}

/**
 * Login handler - redirects to Keycloak login
 */
function loginHandler() {
  if (keycloak) {
    keycloak.login({
      redirectUri: window.location.origin + '/'
    });
  } else {
    console.error('Keycloak not initialized');
    window.location.href = '/login';
  }
}

/**
 * Logout handler - redirects to Keycloak logout
 */
function logoutHandler() {
  if (keycloak && keycloak.authenticated) {
    keycloak.logout({
      redirectUri: window.location.origin + '/'
    });
  } else {
    // Fallback: just redirect to home
    window.location.href = '/';
  }
}

/**
 * Get current user info from Keycloak token
 */
function getCurrentUser() {
  if (!keycloak || !keycloak.authenticated) {
    return null;
  }

  const tokenParsed = keycloak.tokenParsed;
  return {
    id: tokenParsed.sub,
    email: tokenParsed.email,
    username: tokenParsed.preferred_username,
    name: tokenParsed.name || `${tokenParsed.given_name || ''} ${tokenParsed.family_name || ''}`.trim(),
    firstName: tokenParsed.given_name,
    lastName: tokenParsed.family_name,
    roles: tokenParsed.realm_access?.roles || [],
    role: (tokenParsed.realm_access?.roles || []).includes('admin') ? 'admin' : 'user',
    canCheckout: tokenParsed.canCheckout === 'true' || tokenParsed.canCheckout === true
  };
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return keycloak && keycloak.authenticated;
}

/**
 * Update cart badge
 */
async function updateCartBadge() {
  try {
    const response = await authenticatedFetch('/api/cart');
    const cart = await response.json();

    const badge = document.getElementById('cartBadge');
    if (badge) {
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

      if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error updating cart badge:', error);
  }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString) {
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}

/**
 * Require authentication - redirects to Keycloak login if not authenticated
 */
async function requireAuthentication() {
  await initKeycloak();

  if (!keycloak || !keycloak.authenticated) {
    keycloak.login({
      redirectUri: window.location.href
    });
    return false;
  }
  return true;
}

// Initialize common functionality on page load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  updateCartBadge();

  // Setup login link to use Keycloak
  const loginLink = document.getElementById('loginLink');
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginHandler();
    });
  }
});
