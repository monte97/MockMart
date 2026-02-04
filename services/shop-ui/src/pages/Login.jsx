import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

function Login() {
  const { isAuthenticated, isLoading, login, keycloak } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/')
      return
    }

    if (!isLoading && keycloak && !isAuthenticated) {
      login()
    }
  }, [isLoading, isAuthenticated, keycloak, login, navigate])

  return (
    <div className="container">
      <div className="login-container">
        <h2>Accedi al tuo account</h2>

        <div className="loading-spinner"></div>
        <p id="loginStatus">
          {isLoading ? 'Inizializzazione...' : 'Reindirizzamento a Keycloak...'}
        </p>

        <div className="credentials-info">
          <h3>Account di prova:</h3>
          <ul>
            <li><strong>admin@techstore.com</strong> / admin123 (Admin)</li>
            <li><strong>mario.rossi@example.com</strong> / mario123 (User)</li>
            <li><strong>blocked@example.com</strong> / blocked123 (Blocked)</li>
          </ul>
        </div>

        <Link to="/" className="back-link">
          Torna alla homepage
        </Link>
      </div>
    </div>
  )
}

export default Login
