export async function fetchCategories(fetchWithAuth) {
  const response = await fetchWithAuth('/api/categories')
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

export async function fetchProducts(fetchWithAuth, params = {}) {
  const queryParams = new URLSearchParams()
  if (params.search) queryParams.append('search', params.search)
  if (params.category) queryParams.append('category', params.category)
  if (params.sort) queryParams.append('sort', params.sort)

  const response = await fetchWithAuth(`/api/products?${queryParams}`)
  if (!response.ok) throw new Error('Failed to fetch products')
  return response.json()
}

export async function fetchProduct(fetchWithAuth, productId) {
  const response = await fetchWithAuth(`/api/products/${productId}`)
  if (!response.ok) throw new Error('Failed to fetch product')
  return response.json()
}

export async function createProduct(fetchWithAuth, productData) {
  const response = await fetchWithAuth('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create product')
  }
  return response.json()
}

export async function updateProduct(fetchWithAuth, productId, productData) {
  const response = await fetchWithAuth(`/api/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update product')
  }
  return response.json()
}

export async function deleteProduct(fetchWithAuth, productId) {
  const response = await fetchWithAuth(`/api/products/${productId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete product')
  }
  return true
}

export async function fetchOrders(fetchWithAuth) {
  const response = await fetchWithAuth('/api/orders')
  if (!response.ok) throw new Error('Failed to fetch orders')
  return response.json()
}

export async function placeOrder(fetchWithAuth, orderData) {
  const response = await fetchWithAuth('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(orderData)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to place order')
  }
  return response.json()
}

// Utility functions
export function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

export function getProductIcon(category) {
  const icons = {
    electronics: String.fromCodePoint(0x1F4BB),
    accessories: String.fromCodePoint(0x1F50C),
    audio: String.fromCodePoint(0x1F3A7),
    storage: String.fromCodePoint(0x1F4BE)
  }
  return icons[category] || String.fromCodePoint(0x1F4E6)
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}
