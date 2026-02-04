import { useState, useEffect, useCallback } from 'react'
import { useCart } from '../contexts/CartContext'
import Toast from '../components/Toast'
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  formatCurrency
} from '../services/api'
import './AdminProducts.css'

const CATEGORIES = ['electronics', 'home', 'sports', 'books']

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createData, setCreateData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    stock: '0'
  })

  const [editModal, setEditModal] = useState(null)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    stock: ''
  })

  const [deleteModal, setDeleteModal] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { fetchWithAuth } = useCart()

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchProducts(fetchWithAuth)
      setProducts(data)
    } catch (err) {
      setToast({ message: 'Errore nel caricamento dei prodotti', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleCreateSubmit = async (e) => {
    e.preventDefault()

    if (!createData.name || !createData.price || !createData.category) {
      setToast({ message: 'Nome, Prezzo e Categoria sono campi obbligatori.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      const newProduct = await createProduct(fetchWithAuth, {
        name: createData.name,
        description: createData.description,
        price: parseFloat(createData.price),
        category: createData.category,
        image: createData.image || undefined,
        stock: parseInt(createData.stock) || 0
      })
      setToast({ message: `Prodotto "${newProduct.name}" creato con successo!`, type: 'success' })
      setCreateData({ name: '', description: '', price: '', category: '', image: '', stock: '0' })
      setShowCreateForm(false)
      await loadProducts()
    } catch (err) {
      setToast({ message: err.message || 'Errore nella creazione del prodotto', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = async (productId) => {
    try {
      setIsLoading(true)
      const product = await fetchProduct(fetchWithAuth, productId)
      setEditData({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        category: product.category,
        image: product.image || '',
        stock: (product.stock || 0).toString()
      })
      setEditModal(product)
    } catch (err) {
      setToast({ message: 'Errore nel caricamento del prodotto', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await updateProduct(fetchWithAuth, editData.id, {
        name: editData.name,
        description: editData.description,
        price: parseFloat(editData.price),
        category: editData.category,
        image: editData.image,
        stock: parseInt(editData.stock) || 0
      })
      setToast({ message: 'Prodotto aggiornato con successo!', type: 'success' })
      setEditModal(null)
      await loadProducts()
    } catch (err) {
      setToast({ message: err.message || "Errore nell'aggiornamento del prodotto", type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (product) => {
    setDeleteModal(product)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return

    setIsSubmitting(true)
    try {
      await deleteProduct(fetchWithAuth, deleteModal.id)
      setToast({ message: 'Prodotto eliminato con successo!', type: 'success' })
      setDeleteModal(null)
      await loadProducts()
    } catch (err) {
      setToast({ message: err.message || "Errore nell'eliminazione del prodotto", type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div className="admin-header">
        <h1>Gestione Prodotti</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          data-testid="show-create-form"
        >
          {String.fromCodePoint(0x2795)} Nuovo Prodotto
        </button>
      </div>

      {showCreateForm && (
        <div className="admin-section">
          <h2>Crea Nuovo Prodotto</h2>
          <form onSubmit={handleCreateSubmit} className="product-form" noValidate>
            <div className="form-group">
              <label htmlFor="createName">Nome *</label>
              <input
                type="text"
                id="createName"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                required
                data-testid="create-name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="createPrice">Prezzo (EUR) *</label>
              <input
                type="number"
                id="createPrice"
                step="0.01"
                min="0"
                value={createData.price}
                onChange={(e) => setCreateData({ ...createData, price: e.target.value })}
                required
                data-testid="create-price"
              />
            </div>
            <div className="form-group">
              <label htmlFor="createCategory">Categoria *</label>
              <select
                id="createCategory"
                value={createData.category}
                onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                required
                data-testid="create-category"
              >
                <option value="">Seleziona categoria</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="createStock">Quantita disponibile</label>
              <input
                type="number"
                id="createStock"
                min="0"
                value={createData.stock}
                onChange={(e) => setCreateData({ ...createData, stock: e.target.value })}
                data-testid="create-stock"
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="createDescription">Descrizione</label>
              <textarea
                id="createDescription"
                rows="3"
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                data-testid="create-description"
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="createImage">URL Immagine</label>
              <input
                type="url"
                id="createImage"
                placeholder="https://..."
                value={createData.image}
                onChange={(e) => setCreateData({ ...createData, image: e.target.value })}
                data-testid="create-image"
              />
            </div>
            <div className="form-group form-group-full">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} data-testid="submit-create">
                {isSubmitting ? 'Creazione...' : 'Crea Prodotto'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCreateForm(false)}
                data-testid="cancel-create"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-section">
        <h2>Elenco Prodotti</h2>
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p className="mt-2">Caricamento...</p>
          </div>
        ) : (
          <table className="products-table" data-testid="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Immagine</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Prezzo</th>
                <th>Disponibilita</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} data-testid={`product-row-${product.id}`}>
                  <td>{product.id}</td>
                  <td>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-image-preview"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60x40?text=No+Image'
                        }}
                      />
                    ) : (
                      <div className="product-image-preview" style={{
                        background: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {String.fromCodePoint(0x1F4E6)}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{product.name}</strong>
                    <br />
                    <small style={{ color: 'var(--secondary-color)' }}>
                      {product.description ? product.description.substring(0, 50) + '...' : ''}
                    </small>
                  </td>
                  <td>
                    <span className="category-tag">{product.category}</span>
                  </td>
                  <td>
                    <strong>{formatCurrency(product.price)}</strong>
                  </td>
                  <td>
                    <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {product.stock > 0 ? `${String.fromCodePoint(0x2713)} ${product.stock} disponibili` : `${String.fromCodePoint(0x2717)} Esaurito`}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-sm btn-icon"
                        onClick={() => handleEditClick(product.id)}
                        data-testid={`edit-${product.id}`}
                      >
                        {String.fromCodePoint(0x270F)}{String.fromCodePoint(0xFE0F)}
                      </button>
                      <button
                        className="btn btn-sm btn-danger btn-icon"
                        onClick={() => handleDeleteClick(product)}
                        data-testid={`delete-${product.id}`}
                      >
                        {String.fromCodePoint(0x1F5D1)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editModal && (
        <div className="modal active" onClick={(e) => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal-content">
            <h2>Modifica Prodotto</h2>
            <form onSubmit={handleEditSubmit} className="product-form">
              <div className="form-group">
                <label htmlFor="editName">Nome</label>
                <input
                  type="text"
                  id="editName"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  data-testid="edit-name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editPrice">Prezzo (EUR)</label>
                <input
                  type="number"
                  id="editPrice"
                  step="0.01"
                  min="0"
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                  data-testid="edit-price"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editCategory">Categoria</label>
                <select
                  id="editCategory"
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  data-testid="edit-category"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editStock">Quantita disponibile</label>
                <input
                  type="number"
                  id="editStock"
                  min="0"
                  value={editData.stock}
                  onChange={(e) => setEditData({ ...editData, stock: e.target.value })}
                  data-testid="edit-stock"
                />
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="editDescription">Descrizione</label>
                <textarea
                  id="editDescription"
                  rows="3"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  data-testid="edit-description"
                />
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="editImage">URL Immagine</label>
                <input
                  type="url"
                  id="editImage"
                  value={editData.image}
                  onChange={(e) => setEditData({ ...editData, image: e.target.value })}
                  data-testid="edit-image"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditModal(null)}
                  data-testid="cancel-edit"
                >
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} data-testid="submit-edit">
                  {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modal active" onClick={(e) => e.target === e.currentTarget && setDeleteModal(null)}>
          <div className="modal-content">
            <h2>Conferma Eliminazione</h2>
            <p>
              Sei sicuro di voler eliminare il prodotto "<strong>{deleteModal.name}</strong>"?
            </p>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.875rem' }}>
              Questa azione non puo essere annullata.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteModal(null)}
                data-testid="cancel-delete"
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                data-testid="confirm-delete"
              >
                {isSubmitting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay active">
          <div>Caricamento...</div>
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

export default AdminProducts
