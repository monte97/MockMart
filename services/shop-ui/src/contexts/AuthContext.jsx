import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import Keycloak from 'keycloak-js'

const KEYCLOAK_URL = `${window.location.origin}/auth`
const KEYCLOAK_REALM = 'techstore'
const KEYCLOAK_CLIENT_ID = 'shop-ui'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [keycloak, setKeycloak] = useState(null)
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const initializingRef = useRef(false)
  const keycloakRef = useRef(null)

  useEffect(() => {
    if (initializingRef.current) return
    initializingRef.current = true

    const initKeycloak = async () => {
      const kc = new Keycloak({
        url: KEYCLOAK_URL,
        realm: KEYCLOAK_REALM,
        clientId: KEYCLOAK_CLIENT_ID
      })

      try {
        const urlParams = new URLSearchParams(window.location.search)
        const hasAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('session_state')

        const authenticated = await kc.init({
          onLoad: hasAuthParams ? undefined : 'check-sso',
          pkceMethod: 'S256',
          checkLoginIframe: false
        })

        keycloakRef.current = kc
        setKeycloak(kc)
        setIsAuthenticated(authenticated)

        if (hasAuthParams && authenticated) {
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        if (authenticated) {
          const tokenParsed = kc.tokenParsed
          setUser({
            id: tokenParsed.sub,
            email: tokenParsed.email,
            username: tokenParsed.preferred_username,
            name: tokenParsed.name || `${tokenParsed.given_name || ''} ${tokenParsed.family_name || ''}`.trim(),
            firstName: tokenParsed.given_name,
            lastName: tokenParsed.family_name,
            roles: tokenParsed.roles || tokenParsed.realm_access?.roles || [],
            role: (tokenParsed.roles || tokenParsed.realm_access?.roles || []).includes('admin') ? 'admin' : 'user',
            canCheckout: tokenParsed.canCheckout === 'true' || tokenParsed.canCheckout === true
          })

          // Setup token refresh
          setInterval(async () => {
            if (kc.authenticated) {
              try {
                const refreshed = await kc.updateToken(70)
                if (refreshed) {
                  console.log('Token refreshed')
                }
              } catch (error) {
                console.error('Token refresh failed:', error)
                kc.login()
              }
            }
          }, 60000)
        }
      } catch (error) {
        console.error('Keycloak initialization failed:', error)
        keycloakRef.current = kc
        setKeycloak(kc)
      } finally {
        setIsLoading(false)
      }
    }

    initKeycloak()
  }, [])

  const login = useCallback((redirectUri) => {
    if (keycloak) {
      keycloak.login({
        redirectUri: redirectUri || window.location.origin + '/'
      })
    }
  }, [keycloak])

  const logout = useCallback(() => {
    if (keycloak && keycloak.authenticated) {
      keycloak.logout({
        redirectUri: window.location.origin + '/'
      })
    } else {
      window.location.href = '/'
    }
  }, [keycloak])

  const getToken = useCallback(async () => {
    const kc = keycloakRef.current
    if (!kc) {
      console.warn('getToken: keycloak not initialized')
      return null
    }
    if (!kc.authenticated) {
      console.warn('getToken: user not authenticated')
      return null
    }
    if (!kc.token) {
      console.warn('getToken: no token available')
      return null
    }
    try {
      await kc.updateToken(30)
      return kc.token
    } catch (error) {
      console.error('Token update failed:', error)
      return null
    }
  }, [])

  const value = {
    keycloak,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
