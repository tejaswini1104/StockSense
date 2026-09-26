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
        <div className="card kpi-card">
          <span className="kpi-card__label">Total Products in Stock</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.total_products}</span>
          <span className="kpi-card__sub">{stats?.total_stock_units} total physical units</span>
        </div>

        <div className="card kpi-card kpi-card--warning">
          <span className="kpi-card__label">Low Stock Alerts</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.low_stock_count}</span>
          <span className="kpi-card__sub">Below reorder threshold</span>
        </div>

        <div className="card kpi-card kpi-card--info">
          <span className="kpi-card__label">Pending Receipts</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.pending_receipts_count}</span>
          <span className="kpi-card__sub">Draft shipments to receive</span>
        </div>

        <div className="card kpi-card">
          <span className="kpi-card__label">Active Warehouses</span>
          <span className="kpi-card__value">{loading ? '...' : stats?.total_warehouses}</span>
          <span className="kpi-card__sub">{stats?.total_locations} storage locations</span>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid-responsive" style={{ marginTop: '1.5rem' }}>
        <div className="card dashboard-action-card" onClick={() => navigate('/products')}>
          <h3>📦 Manage Products</h3>
          <p>Add new items, monitor SKU inventory, set reorder alerts, and view location stock breakdown.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/operations')}>
          <h3>🚚 Process Receipts</h3>
          <p>Create draft receipts for vendor deliveries, validate incoming stock, and log moves.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/warehouse')}>
          <h3>🏭 Warehouses & Locations</h3>
          <p>Configure distribution centers, receiving docks, internal racks, and storage zones.</p>
        </div>

        <div className="card dashboard-action-card" onClick={() => navigate('/move-history')}>
          <h3>📜 Move History & Ledger</h3>
          <p>Review audit logs of all physical stock movements across your organization.</p>
        </div>
      </div>
    </div>
  )
}
