import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { getProductStock } from '../api/catalog'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Stock details map for selected delivery item validation
  const [stockMap, setStockMap] = useState({})
  const [validationSummary, setValidationSummary] = useState(null)

  // Create Form state
  const [customerName, setCustomerName] = useState('')
  const [sourceLocId, setSourceLocId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [creating, setCreating] = useState(false)
  const [createStockMap, setCreateStockMap] = useState({})

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [dData, pData, lData] = await Promise.all([
        invApi.fetchDeliveries({ status: statusFilter || undefined }),
        invApi.fetchProducts(),
        invApi.fetchAllLocations(),
      ])
      setDeliveries(dData)
      setProducts(pData)
      setLocations(lData)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load delivery orders.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  // Fetch product stock breakdown for create modal when location changes
  useEffect(() => {
    if (!sourceLocId) {
      setCreateStockMap({})
      return
    }
    const fetchStockForLocation = async () => {
      const newMap = {}
      for (const item of items) {
        if (item.product_id) {
          try {
            const stockData = await getProductStock(item.product_id)
            const locStock = stockData.stock_by_location?.find(
              (s) => Number(s.location_id) === Number(sourceLocId)
            )
            newMap[item.product_id] = locStock ? Number(locStock.quantity) : 0
          } catch {
            newMap[item.product_id] = 0
          }
        }
      }
      setCreateStockMap(newMap)
    }
    fetchStockForLocation()
  }, [sourceLocId, items.map((i) => i.product_id).join(',')])

  // Load stock details when selectedDelivery opens
  useEffect(() => {
    if (!selectedDelivery || !selectedDelivery.source_location_id) {
      setStockMap({})
      return
    }

    const loadSelectedDeliveryStock = async () => {
      const newMap = {}
      for (const item of selectedDelivery.items) {
        try {
          const stockData = await getProductStock(item.product_id)
          const locStock = stockData.stock_by_location?.find(
            (s) => Number(s.location_id) === Number(selectedDelivery.source_location_id)
          )
          newMap[item.product_id] = locStock ? Number(locStock.quantity) : 0
        } catch {
          newMap[item.product_id] = 0
        }
      }
      setStockMap(newMap)
    }
    loadSelectedDeliveryStock()
  }, [selectedDelivery])

  const handleAddItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1 }])
  }

  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  const handleCreateDelivery = async (e) => {
    e.preventDefault()
    setError('')
    if (!customerName.trim()) {
      setError('Customer name is required.')
      return
    }
    if (!sourceLocId) {
      setError('Please select a source warehouse location.')
      return
    }

    const validItems = items
      .filter((it) => it.product_id && Number(it.quantity) > 0)
      .map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
      }))

    if (validItems.length === 0) {
      setError('Add at least one valid product line with quantity > 0.')
      return
    }

    setCreating(true)
    try {
      const created = await invApi.createDelivery({
        customer_name: customerName.trim(),
        source_location_id: Number(sourceLocId),
        notes: notes.trim() || undefined,
        items: validItems,
      })
      setNotice(`Delivery Order ${created.reference_number} created in Draft status.`)
      setShowCreateModal(false)
      setCustomerName('')
      setSourceLocId('')
      setNotes('')
      setItems([{ product_id: '', quantity: 1 }])
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create delivery order.'))
    } finally {
      setCreating(false)
    }
  }

  const handlePick = async (deliveryId) => {
    setActionLoading(true)
    setError('')
    try {
      const updated = await invApi.pickDelivery(deliveryId)
      setNotice(`Delivery ${updated.reference_number} status updated to PICKED.`)
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery(updated)
      }
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update delivery to Picked.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handlePack = async (deliveryId) => {
    setActionLoading(true)
    setError('')
    try {
      const updated = await invApi.packDelivery(deliveryId)
      setNotice(`Delivery ${updated.reference_number} status updated to PACKED.`)
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery(updated)
      }
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update delivery to Packed.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleValidateDelivery = async (deliveryId) => {
    setActionLoading(true)
    setError('')
    setValidationSummary(null)
    try {
      const target = selectedDelivery || deliveries.find((d) => d.id === deliveryId)
      
      // Calculate pre-validation stock snapshot
      const snapshot = target ? target.items.map((item) => {
        const prev = stockMap[item.product_id] ?? 0
        const del = Number(item.quantity)
        const next = Math.max(0, prev - del)
        return {
          product_name: item.product_name,
          product_sku: item.product_sku,
          previous: prev,
          delivered: del,
          new_stock: next,
          uom: item.product_uom || 'units',
        }
      }) : []

      const updated = await invApi.validateDelivery(deliveryId)
      setNotice(`Delivery ${updated.reference_number} validated successfully! Stock deducted and ledger updated.`)
      setValidationSummary({
        ref: updated.reference_number,
        items: snapshot,
      })
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery(updated)
      }
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Validation failed.'))
    } finally {
      setActionLoading(false)
    }
  }

  const filteredDeliveries = deliveries.filter((d) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      d.reference_number.toLowerCase().includes(q) ||
      d.customer_name.toLowerCase().includes(q) ||
      (d.source_location_name && d.source_location_name.toLowerCase().includes(q)) ||
      (d.warehouse_name && d.warehouse_name.toLowerCase().includes(q))
    )
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'done':
        return <span className="badge badge--success">VALIDATED</span>
      case 'packed':
        return <span className="badge badge--warning">PACKED</span>
      case 'picked':
        return <span className="badge badge--info" style={{ backgroundColor: 'var(--color-primary-100, #e0f2fe)', color: '#0369a1' }}>PICKED</span>
      case 'draft':
        return <span className="badge badge--neutral">DRAFT</span>
      case 'canceled':
        return <span className="badge badge--danger">CANCELED</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  const checkInsufficientStock = (del) => {
    if (!del) return false
    return del.items.some((item) => {
      const avail = stockMap[item.product_id] ?? 0
      return avail < Number(item.quantity)
    })
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
          <h2>Delivery Orders (Outgoing Stock)</h2>
          <p className="block-sub">
            Pick, pack, and validate customer shipments with real-time stock deduction and ledger audit trail.
          </p>
        </div>

        <div className="toolbar__filters">
          <input
            type="text"
            className="field__input"
            placeholder="Search ref, customer, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: '220px' }}
          />

          <select
            className="field__input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="picked">Picked</option>
            <option value="packed">Packed</option>
            <option value="done">Validated (Done)</option>
            <option value="canceled">Canceled</option>
          </select>

          <Button onClick={() => setShowCreateModal(true)}>+ New Delivery Order</Button>
        </div>
      </div>

      {loading ? (
        <div className="card loading-state">Loading delivery orders...</div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="card empty-state">
          <h3>No Delivery Orders Found</h3>
          <p>Create a delivery order to fulfill customer requests from available warehouse stock.</p>
          <Button onClick={() => setShowCreateModal(true)}>+ New Delivery Order</Button>
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Source Location</th>
                <th>Items</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.reference_number}</strong>
                  </td>
                  <td>{d.customer_name}</td>
                  <td>
                    {d.warehouse_name ? `${d.warehouse_name} - ` : ''}
                    {d.source_location_name}
                  </td>
                  <td>{d.items.length} item(s)</td>
                  <td>{getStatusBadge(d.status)}</td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => {
                        setValidationSummary(null)
                        setSelectedDelivery(d)
                      }}
                    >
                      Process / View
                    </button>

                    {d.status === 'draft' && (
                      <Button
                        variant="secondary"
                        size="small"
                        loading={actionLoading}
                        onClick={() => handlePick(d.id)}
                      >
                        Pick
                      </Button>
                    )}

                    {d.status === 'picked' && (
                      <Button
                        variant="secondary"
                        size="small"
                        loading={actionLoading}
                        onClick={() => handlePack(d.id)}
                      >
                        Pack
                      </Button>
                    )}

                    {d.status === 'packed' && (
                      <Button
                        variant="primary"
                        size="small"
                        loading={actionLoading}
                        onClick={() => {
                          setSelectedDelivery(d)
                        }}
                      >
                        Validate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Delivery Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--wide">
            <h3>Create Delivery Order</h3>
            <form onSubmit={handleCreateDelivery} className="form">
              <div className="form__grid">
                <Field
                  label="Customer / Destination Name"
                  placeholder="e.g. Apex Retailers Ltd"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />

                <div className="field">
                  <label className="field__label">Source Location</label>
                  <select
                    className="field__input"
                    value={sourceLocId}
                    onChange={(e) => setSourceLocId(e.target.value)}
                    required
                  >
                    <option value="">Select Source Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse_name ? `${loc.warehouse_name} - ` : ''}{loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Field
                label="Notes / Delivery Instructions"
                placeholder="e.g. Expedited shipment via DHL"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <h4>Items to Deliver</h4>
              {items.map((it, idx) => {
                const avail = it.product_id ? createStockMap[it.product_id] : null
                const isInsufficient = avail !== null && avail < Number(it.quantity)
                return (
                  <div key={idx} className="receipt-item-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div className="field flex-grow">
                      <label className="field__label">Product</label>
                      <select
                        className="field__input"
                        value={it.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name} ({p.uom})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field qty-field">
                      <Field
                        label="Quantity"
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    {sourceLocId && it.product_id && (
                      <div className="field" style={{ alignSelf: 'center', fontSize: '0.85rem' }}>
                        <span className={isInsufficient ? 'text-danger' : 'text-muted'}>
                          Available: <strong>{avail ?? 0}</strong>
                        </span>
                      </div>
                    )}

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemoveItemRow(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}

              <Button type="button" variant="secondary" onClick={handleAddItemRow}>
                + Add Line Item
              </Button>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creating}>
                  Save Draft Delivery
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Process Delivery Order Workflow Modal */}
      {selectedDelivery && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--wide">
            <div className="modal-header-flex">
              <div>
                <h3>Delivery Order {selectedDelivery.reference_number}</h3>
                <p className="block-sub">Customer: <strong>{selectedDelivery.customer_name}</strong></p>
              </div>
              <div>{getStatusBadge(selectedDelivery.status)}</div>
            </div>

            {/* Workflow Progress Stepper */}
            <div className="workflow-stepper" style={{ display: 'flex', gap: '1rem', margin: '1.25rem 0', padding: '0.75rem', background: 'var(--color-neutral-100, #f8fafc)', borderRadius: '8px', justifyContent: 'space-around' }}>
              <div style={{ fontWeight: selectedDelivery.status === 'draft' ? 'bold' : 'normal', color: ['draft', 'picked', 'packed', 'done'].includes(selectedDelivery.status) ? 'var(--color-primary-600, #2563eb)' : '#94a3b8' }}>
                1. Draft
              </div>
              <div>➔</div>
              <div style={{ fontWeight: selectedDelivery.status === 'picked' ? 'bold' : 'normal', color: ['picked', 'packed', 'done'].includes(selectedDelivery.status) ? 'var(--color-primary-600, #2563eb)' : '#94a3b8' }}>
                2. Picked
              </div>
              <div>➔</div>
              <div style={{ fontWeight: selectedDelivery.status === 'packed' ? 'bold' : 'normal', color: ['packed', 'done'].includes(selectedDelivery.status) ? 'var(--color-primary-600, #2563eb)' : '#94a3b8' }}>
                3. Packed
              </div>
              <div>➔</div>
              <div style={{ fontWeight: selectedDelivery.status === 'done' ? 'bold' : 'normal', color: selectedDelivery.status === 'done' ? '#16a34a' : '#94a3b8' }}>
                4. Validated
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              <p><strong>Source Location:</strong> {selectedDelivery.warehouse_name ? `${selectedDelivery.warehouse_name} - ` : ''}{selectedDelivery.source_location_name}</p>
              {selectedDelivery.notes && <p><strong>Notes:</strong> {selectedDelivery.notes}</p>}
              {selectedDelivery.delivered_at && (
                <p><strong>Validated & Shipped At:</strong> {new Date(selectedDelivery.delivered_at).toLocaleString()}</p>
              )}
            </div>

            {/* Success Summary Alert after Validation */}
            {validationSummary && validationSummary.ref === selectedDelivery.reference_number && (
              <Alert variant="success">
                <strong>Stock Successfully Deducted!</strong>
                <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                  {validationSummary.items.map((s, idx) => (
                    <li key={idx}>
                      {s.product_name} ({s.product_sku}): Previous Stock: <strong>{s.previous}</strong> ➔ Delivered: <strong>{s.delivered}</strong> ➔ New Stock: <strong style={{ color: '#16a34a' }}>{s.new_stock}</strong> {s.uom}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Warning if stock is insufficient */}
            {selectedDelivery.status !== 'done' && checkInsufficientStock(selectedDelivery) && (
              <Alert variant="danger">
                <strong>Insufficient Available Stock:</strong> One or more items exceed available stock at the source location. Please replenish stock via Receipts before validating this delivery order.
              </Alert>
            )}

            <h4 style={{ marginTop: '1rem' }}>Stock Verification & Line Items</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Available at Location</th>
                  <th>Delivered Qty</th>
                  <th>Remaining After Delivery</th>
                </tr>
              </thead>
              <tbody>
                {selectedDelivery.items.map((it) => {
                  const avail = stockMap[it.product_id] ?? 0
                  const req = Number(it.quantity)
                  const remaining = avail - req
                  const isNegative = remaining < 0
                  return (
                    <tr key={it.id}>
                      <td><strong>{it.product_sku}</strong></td>
                      <td>{it.product_name}</td>
                      <td>{avail} {it.product_uom}</td>
                      <td><strong>{req}</strong> {it.product_uom}</td>
                      <td>
                        <span style={{ color: isNegative ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #10b981)', fontWeight: 'bold' }}>
                          {selectedDelivery.status === 'done' ? (avail) : remaining} {it.product_uom}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {selectedDelivery.status === 'draft' && (
                <Button
                  variant="secondary"
                  loading={actionLoading}
                  onClick={() => handlePick(selectedDelivery.id)}
                >
                  Mark as Picked
                </Button>
              )}

              {(selectedDelivery.status === 'draft' || selectedDelivery.status === 'picked') && (
                <Button
                  variant="secondary"
                  loading={actionLoading}
                  onClick={() => handlePack(selectedDelivery.id)}
                >
                  Mark as Packed
                </Button>
              )}

              {selectedDelivery.status !== 'done' && selectedDelivery.status !== 'canceled' && (
                <Button
                  variant="primary"
                  loading={actionLoading}
                  disabled={checkInsufficientStock(selectedDelivery)}
                  onClick={() => handleValidateDelivery(selectedDelivery.id)}
                >
                  Validate & Deduct Stock
                </Button>
              )}

              <Button variant="secondary" onClick={() => setSelectedDelivery(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
