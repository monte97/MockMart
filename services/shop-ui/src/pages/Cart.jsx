import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import CartItem from '../components/CartItem'
import { formatCurrency } from '../services/api'
import './Cart.css'

function Cart() {
  const { cart, isLoading, totalPrice } = useCart()
  const navigate = useNavigate()

  const goToCheckout = () => {
    navigate('/checkout')
  }

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="mt-2">Caricamento carrello...</p>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="container">
        <h1 className="mb-3">Il tuo Carrello</h1>
        <div className="card empty-cart">
          <div className="empty-cart-icon">{String.fromCodePoint(0x1F6D2)}</div>
          <h2>Il carrello e vuoto</h2>
          <p>Aggiungi prodotti dal nostro catalogo</p>
          <Link to="/" className="btn btn-primary mt-3">
            Vai allo Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="mb-3">Il tuo Carrello</h1>

      <div className="cart-layout">
        <div>
          <div className="cart-items">
            {cart.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </div>
        </div>

        <div className="cart-summary">
          <h2>Riepilogo</h2>

          <div className="summary-row">
            <span>Subtotale</span>
            <span data-testid="cart-subtotal">{formatCurrency(totalPrice)}</span>
          </div>

          <div className="summary-row">
            <span>Spedizione</span>
            <span>Gratis</span>
          </div>

          <div className="summary-row total">
            <span>Totale</span>
            <span data-testid="cart-total">{formatCurrency(totalPrice)}</span>
          </div>

          <button
            className="btn btn-primary btn-lg mt-3"
            style={{ width: '100%' }}
            onClick={goToCheckout}
            data-testid="checkout-button"
          >
            Procedi al Checkout
          </button>

          <Link
            to="/"
            className="btn btn-outline mt-2"
            style={{ width: '100%', display: 'block' }}
          >
            Continua lo Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cart
