import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        const data = await invApi.fetchDashboardStats()
        setStats(data)
      } catch (err) {
        setError(toErrorMessage(err, 'Failed to load dashboard statistics.'))
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="page-container">
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="card kpi-card" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Total Products</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.total_products}</span>
          <span className="kpi-card__sub">{stats?.total_stock_units ?? 0} total units in stock</span>
        </div>

        <div className="card kpi-card kpi-card--warning" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Low / Out of Stock</span>
          <span className="kpi-card__value">
            {loading ? '...' : (stats?.low_stock_count ?? 0) + (stats?.out_of_stock_count ?? 0)}
          </span>
          <span className="kpi-card__sub">
            {stats?.out_of_stock_count ?? 0} out of stock, {stats?.low_stock_count ?? 0} low
          </span>
        </div>

        <div className="card kpi-card kpi-card--info" onClick={() => navigate('/operations')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Pending Receipts</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.pending_receipts_count}</span>
          <span className="kpi-card__sub">Incoming vendor shipments</span>
        </div>

        <div className="card kpi-card" onClick={() => navigate('/deliveries')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Pending Deliveries</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.pending_deliveries_count ?? 0}</span>
          <span className="kpi-card__sub">Outgoing customer orders</span>
        </div>

        <div className="card kpi-card" onClick={() => navigate('/operations')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Transfers Scheduled</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.scheduled_transfers_count ?? 0}</span>
          <span className="kpi-card__sub">Internal warehouse moves</span>
        </div>

        <div className="card kpi-card" onClick={() => navigate('/warehouse')} style={{ cursor: 'pointer' }}>
          <span className="kpi-card__label">Warehouses</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.total_warehouses}</span>
          <span className="kpi-card__sub">{stats?.total_locations} active locations</span>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Operations & Workflows</h3>
      <div className="grid-responsive">
        <div className="card dashboard-action-card" onClick={() => navigate('/products')}>
          <h3>📦 Products & Inventory</h3>
          <p>Catalog, SKUs, Categories, Reorder rules, and location stock breakdown.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/operations')}>
          <h3>📥 Vendor Receipts</h3>
          <p>Receive incoming shipments, input quantities, and validate to increase stock.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/deliveries')}>
          <h3>📤 Delivery Orders</h3>
          <p>Fulfill sales orders: Pick, Pack, Validate stock deduction and generate ledger entries.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/warehouse')}>
          <h3>🏭 Warehouse & Bins</h3>
          <p>Setup warehouses, internal racks, receiving areas, and output zones.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/stock-ledger')}>
          <h3>📜 Stock Ledger Audit</h3>
          <p>Review real-time running balance and full movement audit trail.</p>
        </div>
      </div>
    </div>
  )
}
