import { useState, useEffect, useCallback } from 'react'
import { useCart } from '../contexts/CartContext'
import ProductCard from '../components/ProductCard'
import Toast from '../components/Toast'
import { fetchCategories, fetchProducts } from '../services/api'
import './Home.css'

function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')

  const { fetchWithAuth } = useCart()

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories(fetchWithAuth)
      setCategories(data)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }, [fetchWithAuth])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchProducts(fetchWithAuth, { search, category, sort })
      setProducts(data)
    } catch (err) {
      setError('Errore nel caricamento dei prodotti')
      console.error('Error loading products:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, search, category, sort])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [loadProducts])

  const resetFilters = () => {
    setSearch('')
    setCategory('')
    setSort('')
  }

  const handleAddSuccess = () => {
    setToast({ message: 'Prodotto aggiunto al carrello!', type: 'success' })
  }

  return (
    <div className="container">
      <h1 className="mb-3">Catalogo Prodotti</h1>

      <div className="filters">
        <div className="filters-row">
          <div className="form-group">
            <label htmlFor="searchInput">Cerca prodotto</label>
            <input
              type="text"
              id="searchInput"
              placeholder="Cerca per nome o descrizione..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="categoryFilter">Categoria</label>
            <select
              id="categoryFilter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="category-filter"
            >
              <option value="">Tutte le categorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="sortFilter">Ordina per</label>
            <select
              id="sortFilter"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="sort-filter"
            >
              <option value="">Default</option>
              <option value="price-asc">Prezzo: crescente</option>
              <option value="price-desc">Prezzo: decrescente</option>
              <option value="name">Nome A-Z</option>
            </select>
          </div>
          <div className="form-group">
            <button onClick={resetFilters} className="btn btn-outline">
              Reset
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="mt-2">Caricamento prodotti...</p>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!isLoading && !error && products.length === 0 && (
        <div className="no-results">
          <h2>Nessun prodotto trovato</h2>
          <p>Prova a modificare i filtri di ricerca</p>
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddSuccess={handleAddSuccess}
            />
          ))}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default Home
