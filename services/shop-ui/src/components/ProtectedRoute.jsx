import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isLoading, user, login } = useAuth()

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="mt-2">Verifica autenticazione...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
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
          per accedere a questa pagina.
        </div>
      </div>
    )
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="container">
        <div className="alert alert-error">
          Non hai i permessi per accedere a questa pagina.
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
