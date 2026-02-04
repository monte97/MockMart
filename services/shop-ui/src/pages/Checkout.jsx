import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../contexts/CartContext'
import { formatCurrency, placeOrder } from '../services/api'
import './Checkout.css'

function Checkout() {
  const { user, isAuthenticated, login } = useAuth()
  const { cart, totalPrice, clearCart, fetchWithAuth } = useCart()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    phone: ''
  })
  const [paymentMethod, setPaymentMethod] = useState('credit-card')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(null)

  useEffect(() => {
    if (cart.length === 0 && !orderComplete) {
      navigate('/cart')
    }
  }, [cart, navigate, orderComplete])

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isAuthenticated) {
      login(window.location.href)
      return
    }

    const { firstName, lastName, address, city, zipCode, phone } = formData
    if (!firstName || !lastName || !address || !city || !zipCode || !phone) {
      setError('Compila tutti i campi obbligatori')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await placeOrder(fetchWithAuth, {
        shippingAddress: formData,
        paymentMethod
      })
      setOrderComplete(result.order)
      clearCart()
    } catch (err) {
      setError(err.message || 'Errore durante il checkout')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="container">
        <div className="card">
          <div className="success-message">
            <div className="success-icon">{String.fromCodePoint(0x2705)}</div>
            <h2>Ordine Completato!</h2>
            <p className="mt-2">Grazie per il tuo acquisto.</p>
            <p>
              Numero ordine:{' '}
              <strong data-testid="order-number">#{orderComplete.id}</strong>
            </p>
            <div className="mt-3">
              <Link to="/orders" className="btn btn-primary">
                Visualizza Ordini
              </Link>
              <Link to="/" className="btn btn-outline" style={{ marginLeft: '0.5rem' }}>
                Torna allo Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <h1 className="mb-3">Checkout</h1>
        <div className="alert alert-info">
          Devi effettuare il{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              login(window.location.href)
            }}
          >
            login
          </a>{' '}
          per completare l'acquisto.
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="mb-3">Checkout</h1>

      <div className="checkout-layout">
        <div>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="checkout-section">
            <h2>Indirizzo di Spedizione</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Nome *</label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    data-testid="first-name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Cognome *</label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    data-testid="last-name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="address">Indirizzo *</label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  data-testid="address"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Citta *</label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    data-testid="city"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="zipCode">CAP *</label>
                  <input
                    type="text"
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                    data-testid="zip-code"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefono *</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  data-testid="phone"
                />
              </div>
            </form>
          </div>

          <div className="checkout-section">
            <h2>Metodo di Pagamento</h2>
            <div className="payment-methods">
              <label
                className={`payment-method ${paymentMethod === 'credit-card' ? 'selected' : ''}`}
                data-testid="payment-credit-card"
              >
                <input
                  type="radio"
                  name="payment"
                  value="credit-card"
                  checked={paymentMethod === 'credit-card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{String.fromCodePoint(0x1F4B3)} Carta di Credito</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-color)' }}>
                    Visa, Mastercard, American Express
                  </div>
                </div>
              </label>
              <label
                className={`payment-method ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                data-testid="payment-paypal"
              >
                <input
                  type="radio"
                  name="payment"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{String.fromCodePoint(0x1F17F)}{String.fromCodePoint(0xFE0F)} PayPal</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-color)' }}>
                    Paga con il tuo account PayPal
                  </div>
                </div>
              </label>
              <label
                className={`payment-method ${paymentMethod === 'bank-transfer' ? 'selected' : ''}`}
                data-testid="payment-bank-transfer"
              >
                <input
                  type="radio"
                  name="payment"
                  value="bank-transfer"
                  checked={paymentMethod === 'bank-transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{String.fromCodePoint(0x1F3E6)} Bonifico Bancario</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-color)' }}>
                    Riceverai le istruzioni via email
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="order-summary">
          <h2>Riepilogo Ordine</h2>
          <div className="order-items">
            {cart.map((item) => (
              <div key={item.productId} className="order-item">
                <div>
                  <div className="order-item-name">{item.product.name}</div>
                  <div className="order-item-details">
                    {item.quantity} x {formatCurrency(item.product.price)}
                  </div>
                </div>
                <div style={{ fontWeight: 500 }}>
                  {formatCurrency(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotale</span>
            <span>{formatCurrency(totalPrice)}</span>
          </div>

          <div className="summary-row">
            <span>Spedizione</span>
            <span>Gratis</span>
          </div>

          <div className="summary-row total">
            <span>Totale</span>
            <span data-testid="order-total">{formatCurrency(totalPrice)}</span>
          </div>

          <button
            className="btn btn-primary btn-lg mt-3"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="place-order-button"
          >
            {isSubmitting ? 'Elaborazione...' : 'Conferma Ordine'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Checkout
