import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { formatCurrency, getProductIcon } from '../services/api'

function CartItem({ item }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateQuantity, removeFromCart } = useCart()

  const handleUpdateQuantity = async (newQuantity) => {
    setIsUpdating(true)
    await updateQuantity(item.productId, newQuantity)
    setIsUpdating(false)
  }

  const handleRemove = async () => {
    setIsUpdating(true)
    await removeFromCart(item.productId)
    setIsUpdating(false)
  }

  const icon = getProductIcon(item.product.category)
  const itemTotal = item.product.price * item.quantity

  return (
    <div className="cart-item" data-testid={`cart-item-${item.productId}`}>
      <div className="cart-item-image">{icon}</div>
      <div className="cart-item-details">
        <h3>{item.product.name}</h3>
        <p className="cart-item-price">
          {formatCurrency(item.product.price)} x {item.quantity} = {formatCurrency(itemTotal)}
        </p>
      </div>
      <div className="cart-item-actions">
        <div className="quantity-controls">
          <button
            onClick={() => handleUpdateQuantity(item.quantity - 1)}
            disabled={isUpdating}
            data-testid={`decrease-${item.productId}`}
          >
            {String.fromCodePoint(0x2212)}
          </button>
          <span data-testid={`quantity-${item.productId}`}>{item.quantity}</span>
          <button
            onClick={() => handleUpdateQuantity(item.quantity + 1)}
            disabled={isUpdating}
            data-testid={`increase-${item.productId}`}
          >
            +
          </button>
        </div>
        <button
          className="btn btn-sm btn-danger"
          onClick={handleRemove}
          disabled={isUpdating}
          data-testid={`remove-${item.productId}`}
        >
          {String.fromCodePoint(0x1F5D1)} Rimuovi
        </button>
      </div>
    </div>
  )
}

export default CartItem
