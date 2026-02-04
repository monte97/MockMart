import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { formatCurrency, getProductIcon } from '../services/api'

function ProductCard({ product, onAddSuccess }) {
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart } = useCart()

  const handleAddToCart = async () => {
    setIsAdding(true)
    const success = await addToCart(product.id)
    setIsAdding(false)
    if (success && onAddSuccess) {
      onAddSuccess()
    }
  }

  const icon = getProductIcon(product.category)

  return (
    <div className="product-card" data-testid={`product-${product.id}`}>
      <div className="product-image">{icon}</div>
      <div className="product-info">
        <span className="category-badge">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-footer">
          <div>
            <div className="product-price">{formatCurrency(product.price)}</div>
            <div className="product-stock">Stock: {product.stock}</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
            data-testid={`add-to-cart-${product.id}`}
          >
            {product.stock === 0 ? 'Esaurito' : isAdding ? 'Aggiungendo...' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
