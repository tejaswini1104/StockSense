import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Modals
  const [showWhModal, setShowWhModal] = useState(false)
  const [showLocModal, setShowLocModal] = useState(false)
  const [targetWh, setTargetWh] = useState(null)

  // Warehouse Form
  const [whForm, setWhForm] = useState({ code: '', name: '', address: '' })
  const [creatingWh, setCreatingWh] = useState(false)

  // Location Form
  const [locForm, setLocForm] = useState({ code: '', name: '', location_type: 'internal' })
  const [creatingLoc, setCreatingLoc] = useState(false)

  const loadWarehouses = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await invApi.fetchWarehouses()
      setWarehouses(data)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load warehouses.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
  }, [])

  const handleCreateWarehouse = async (e) => {
    e.preventDefault()
    setError('')
    setCreatingWh(true)
    try {
      await invApi.createWarehouse({
        code: whForm.code.trim(),
        name: whForm.name.trim(),
        address: whForm.address.trim() || undefined,
      })
      setNotice('Warehouse created with default locations!')
      setShowWhModal(false)
      setWhForm({ code: '', name: '', address: '' })
      loadWarehouses()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create warehouse.'))
    } finally {
      setCreatingWh(false)
    }
  }

  const handleCreateLocation = async (e) => {
    e.preventDefault()
    if (!targetWh) return
    setError('')
    setCreatingLoc(true)
    try {
      await invApi.createLocation(targetWh.id, {
        code: locForm.code.trim(),
        name: locForm.name.trim(),
        location_type: locForm.location_type,
      })
      setNotice(`Location added to ${targetWh.name}!`)
      setShowLocModal(false)
      setLocForm({ code: '', name: '', location_type: 'internal' })
      loadWarehouses()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create location.'))
    } finally {
      setCreatingLoc(false)
    }
  }

  return (
    <div className="page-container">
      {notice && (
        <Alert variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <div className="card toolbar">
        <div>
          <h2>Warehouse & Storage Locations</h2>
          <p className="block-sub">Manage physical distribution centers, receiving docks, and internal racks.</p>
        </div>
        <Button onClick={() => setShowWhModal(true)}>+ Add Warehouse</Button>
      </div>

      {loading ? (
        <div className="card loading-state">Loading warehouse details...</div>
      ) : warehouses.length === 0 ? (
        <div className="card empty-state">
          <h3>No Warehouses Registered</h3>
          <p>Get started by setting up your primary warehouse or distribution hub.</p>
          <Button onClick={() => setShowWhModal(true)}>+ Create Warehouse</Button>
        </div>
      ) : (
        <div className="grid-responsive">
          {warehouses.map((wh) => (
            <div key={wh.id} className="card wh-card">
              <div className="wh-card__header">
                <div>
                  <span className="badge badge--primary">{wh.code}</span>
                  <h3 className="wh-card__title">{wh.name}</h3>
                  {wh.address && <p className="wh-card__addr">📍 {wh.address}</p>}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTargetWh(wh)
                    setLocForm({ code: `${wh.code}-`, name: '', location_type: 'internal' })
                    setShowLocModal(true)
                  }}
                >
                  + Add Location
                </Button>
              </div>

              <div className="wh-card__stats">
                <div>
                  <span className="stat-num">{wh.total_locations_count}</span>
                  <span className="stat-label">Locations</span>
                </div>
                <div>
                  <span className="stat-num">{wh.total_products_count}</span>
                  <span className="stat-label">Stocked Items</span>
                </div>
              </div>

              <hr />

              <h4>Storage Locations</h4>
              {wh.locations.length === 0 ? (
                <p className="text-muted">No locations created yet.</p>
              ) : (
                <ul className="loc-list">
                  {wh.locations.map((loc) => (
                    <li key={loc.id} className="loc-item">
                      <div>
                        <strong>{loc.name}</strong>
                        <code className="code-tag">{loc.code}</code>
                      </div>
                      <span className="badge badge--neutral">{loc.location_type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Warehouse Modal */}
      {showWhModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add New Warehouse</h3>
            <form onSubmit={handleCreateWarehouse} className="form">
              <div className="form__grid">
                <Field
                  label="Warehouse Code"
                  placeholder="e.g. WH-SOUTH"
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value })}
                  required
                />
                <Field
                  label="Warehouse Name"
                  placeholder="e.g. South Regional Hub"
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  required
                />
              </div>
              <Field
                label="Address / Location"
                placeholder="e.g. 45 Logistics Blvd, Industrial Park"
                value={whForm.address}
                onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
              />
              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowWhModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingWh}>
                  Create Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {showLocModal && targetWh && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add Storage Location to {targetWh.name}</h3>
            <form onSubmit={handleCreateLocation} className="form">
              <div className="form__grid">
                <Field
                  label="Location Code"
                  placeholder="e.g. WH-SOUTH-RACK-A1"
                  value={locForm.code}
                  onChange={(e) => setLocForm({ ...locForm, code: e.target.value })}
                  required
                />
                <Field
                  label="Location Name"
                  placeholder="e.g. Rack A1"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label">Location Type</label>
                <select
                  className="field__input"
                  value={locForm.location_type}
                  onChange={(e) => setLocForm({ ...locForm, location_type: e.target.value })}
                >
                  <option value="internal">Internal Storage Rack/Shelf</option>
                  <option value="receiving">Receiving Bay / Dock</option>
                  <option value="output">Packing / Output Area</option>
                  <option value="adjustment">Stock Adjustment Virtual Zone</option>
                </select>
              </div>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowLocModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingLoc}>
                  Save Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
