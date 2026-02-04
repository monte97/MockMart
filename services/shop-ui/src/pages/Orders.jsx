import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import OrderCard from '../components/OrderCard'
import { fetchOrders } from '../services/api'
import './Orders.css'

function Orders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { fetchWithAuth } = useCart()

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true)
        const data = await fetchOrders(fetchWithAuth)
        // Sort by date (newest first)
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setOrders(data)
      } catch (err) {
        setError('Errore nel caricamento degli ordini')
        console.error('Error loading orders:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [fetchWithAuth])

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="mt-2">Caricamento ordini...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h1 className="mb-3">I miei Ordini</h1>
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="container">
        <h1 className="mb-3">I miei Ordini</h1>
        <div className="card empty-orders">
          <div className="empty-orders-icon">{String.fromCodePoint(0x1F4E6)}</div>
          <h2>Nessun ordine trovato</h2>
          <p>Non hai ancora effettuato acquisti</p>
          <Link to="/" className="btn btn-primary mt-3">
            Inizia a fare shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="mb-3">I miei Ordini</h1>
      <div className="orders-container">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

export default Orders
