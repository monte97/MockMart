import { formatCurrency, formatDate } from '../services/api'

const paymentMethodLabels = {
  'credit-card': String.fromCodePoint(0x1F4B3) + ' Carta di Credito',
  'paypal': String.fromCodePoint(0x1F17F) + String.fromCodePoint(0xFE0F) + ' PayPal',
  'bank-transfer': String.fromCodePoint(0x1F3E6) + ' Bonifico Bancario'
}

function OrderCard({ order }) {
  const statusClass = order.status
  const statusText = order.status === 'pending' ? 'In elaborazione' : 'Completato'

  return (
    <div className="order-card" data-testid={`order-${order.id}`}>
      <div className="order-header">
        <div>
          <div className="order-number" data-testid={`order-number-${order.id}`}>
            Ordine #{order.id}
          </div>
          <div className="order-date">{formatDate(order.createdAt)}</div>
        </div>
        <div className={`order-status ${statusClass}`}>{statusText}</div>
      </div>

      <div className="order-items">
        {order.items.map((item, index) => (
          <div key={index} className="order-item">
            <div>
              <div>{item.productName}</div>
              <div className="order-item-details">
                {item.quantity} x {formatCurrency(item.price)}
              </div>
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatCurrency(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div className="shipping-address">
        <strong>{String.fromCodePoint(0x1F4CD)} Indirizzo di spedizione:</strong>
        {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
        {order.shippingAddress.address}<br />
        {order.shippingAddress.zipCode} {order.shippingAddress.city}<br />
        Tel: {order.shippingAddress.phone}
      </div>

      <div className="order-footer">
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-color)', marginBottom: '0.25rem' }}>
            Metodo di pagamento
          </div>
          <div>{paymentMethodLabels[order.paymentMethod]}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--secondary-color)', marginBottom: '0.25rem' }}>
            Totale
          </div>
          <div className="order-total" data-testid={`order-total-${order.id}`}>
            {formatCurrency(order.total)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderCard
