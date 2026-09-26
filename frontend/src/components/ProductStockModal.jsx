import { useEffect, useState } from 'react'
import { getProductStock } from '../api/catalog'
import { toErrorMessage } from '../api/client'
import Alert from './Alert'
import Button from './Button'
import Modal from './Modal'

export default function ProductStockModal({ isOpen, onClose, product }) {
  const [stockEntries, setStockEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true)
      setError(null)
      getProductStock(product.id)
        .then((data) => setStockEntries(data))
        .catch((err) => setError(toErrorMessage(err, 'Failed to load stock breakdown.')))
        .finally(() => setLoading(false))
    }
  }, [isOpen, product])

  if (!product) return null

  const totalQty = stockEntries.reduce((sum, item) => sum + Number(item.quantity), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stock Locations: ${product.name} (${product.sku})`}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="stack" style={{ gap: '16px' }}>
        {error && <Alert tone="error">{error}</Alert>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Total Catalogue Stock</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              {totalQty} <small style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 500 }}>{product.unit_of_measure}</small>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Threshold</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-700)' }}>
              {product.reorder_level} <small style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 500 }}>{product.unit_of_measure}</small>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner--lg" />
            <span>Fetching location breakdown…</span>
          </div>
        ) : stockEntries.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 16px' }}>
            <div className="empty-state__icon">📦</div>
            <h4>No Stock Records Found</h4>
            <p>This product currently has no inventory recorded across any warehouse location.</p>
          </div>
        ) : (
          <div className="table-card" style={{ boxShadow: 'none' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Location Code</th>
                    <th>Location Name</th>
                    <th style={{ textAlign: 'right' }}>On-Hand Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {stockEntries.map((entry) => (
                    <tr key={`${entry.warehouse_id}-${entry.location_id}`}>
                      <td style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{entry.warehouse_name}</td>
                      <td>
                        <span className="sku-badge">{entry.location_code}</span>
                      </td>
                      <td>{entry.location_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: Number(entry.quantity) > 0 ? 'var(--green-700)' : 'var(--red-600)' }}>
                        {entry.quantity} {product.unit_of_measure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
