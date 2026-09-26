import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'

export default function MoveHistory() {
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMoves() {
      setLoading(true)
      try {
        const data = await invApi.fetchStockLedger()
        setMoves(data)
      } catch (err) {
        setError(toErrorMessage(err, 'Failed to load move history.'))
      } finally {
        setLoading(false)
      }
    }
    loadMoves()
  }, [])

  return (
    <div className="page-container">
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <div className="card toolbar">
        <div>
          <h2>Move History Audit Ledger</h2>
          <p className="block-sub">Complete audit record of all physical stock movements, receipts, transfers, and initial counts.</p>
        </div>
      </div>

      {loading ? (
        <div className="card loading-state">Loading move history...</div>
      ) : moves.length === 0 ? (
        <div className="card empty-state">
          <h3>No Movements Recorded</h3>
          <p>Validate a receipt or create initial stock to populate move history logs.</p>
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Product</th>
                <th>Destination Location</th>
                <th>Quantity</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString()}</td>
                  <td><strong>{m.reference_number}</strong></td>
                  <td>
                    <span className="badge badge--primary">{m.movement_type}</span>
                  </td>
                  <td>
                    <strong>{m.product_sku}</strong> - {m.product_name}
                  </td>
                  <td>{m.destination_location_name || '-'}</td>
                  <td>
                    <strong style={{ color: '#10b981' }}>+{m.quantity}</strong>
                  </td>
                  <td>{m.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
