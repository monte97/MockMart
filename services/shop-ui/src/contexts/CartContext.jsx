import { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react'
import { AuthContext } from './AuthContext'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const { getToken, isAuthenticated } = useContext(AuthContext)
  const getTokenRef = useRef(getToken)

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    let token = null
    if (typeof getTokenRef.current === 'function') {
      token = await getTokenRef.current()
    }
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  }, [])

  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setCart(data)
      }
    } catch (error) {
      console.error('Error loading cart:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    loadCart()
  }, [loadCart, isAuthenticated])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    try {
      const response = await fetchWithAuth('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      })
      if (response.ok) {
        await loadCart()
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding to cart:', error)
      return false
    }
  }, [fetchWithAuth, loadCart])

  const updateQuantity = useCallback(async (productId, newQuantity) => {
    if (newQuantity < 1) {
      return removeFromCart(productId)
    }
    try {
      const response = await fetchWithAuth(`/api/cart/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newQuantity })
      })
      if (response.ok) {
        await loadCart()
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating quantity:', error)
      return false
    }
  }, [fetchWithAuth, loadCart])

  const removeFromCart = useCallback(async (productId) => {
    try {
      const response = await fetchWithAuth(`/api/cart/${productId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await loadCart()
        return true
      }
      return false
    } catch (error) {
      console.error('Error removing from cart:', error)
      return false
    }
  }, [fetchWithAuth, loadCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

  const value = {
    cart,
    isLoading,
    totalItems,
    totalPrice,
    loadCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchWithAuth
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
