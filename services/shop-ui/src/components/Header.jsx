import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../contexts/CartContext'
import UserDropdown from './UserDropdown'

function Header() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const { totalItems } = useCart()

  const isAdmin = user?.role === 'admin'

  return (
    <header>
      <div className="container header-content">
        <Link to="/" className="logo">
          {String.fromCodePoint(0x1F6D2)} TechStore
        </Link>
        <nav>
          <Link to="/">Prodotti</Link>
          <span className="user-info">
            {isAuthenticated && user ? (
              <>
                <UserDropdown user={user} />
                <Link to="/orders">Ordini</Link>
                {isAdmin && <Link to="/admin-products">Admin</Link>}
                <button onClick={logout} className="btn btn-sm btn-outline">
                  Logout
                </button>
              </>
            ) : (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  login()
                }}
              >
                Login
              </a>
            )}
          </span>
          <Link to="/cart" className="cart-badge">
            {String.fromCodePoint(0x1F6D2)} Carrello
            {totalItems > 0 && (
              <span className="badge">{totalItems}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
