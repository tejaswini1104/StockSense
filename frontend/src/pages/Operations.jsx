import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'

export default function Operations() {
  const [receipts, setReceipts] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [statusFilter, setStatusFilter] = useState('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [validatingId, setValidatingId] = useState(null)

  // Create Form
  const [supplierName, setSupplierName] = useState('')
  const [destinationLocId, setDestinationLocId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }])
  const [creating, setCreating] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [rData, pData, lData] = await Promise.all([
        invApi.fetchReceipts({ status: statusFilter || undefined }),
        invApi.fetchProducts(),
        invApi.fetchAllLocations(),
      ])
      setReceipts(rData)
      setProducts(pData)
      setLocations(lData)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load receipt operations.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

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

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    setError('')
    if (!destinationLocId) {
      setError('Please select a receiving destination location.')
      return
    }

    // Validate line items
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
      await invApi.createReceipt({
        supplier_name: supplierName.trim(),
        destination_location_id: Number(destinationLocId),
        notes: notes.trim() || undefined,
        items: validItems,
      })
      setNotice('Receipt created successfully in Draft status.')
      setShowCreateModal(false)
      setSupplierName('')
      setDestinationLocId('')
      setNotes('')
      setItems([{ product_id: '', quantity: 1 }])
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create receipt.'))
    } finally {
      setCreating(false)
    }
  }

  const handleValidateReceipt = async (receiptId) => {
    setError('')
    setValidatingId(receiptId)
    try {
      const updated = await invApi.validateReceipt(receiptId)
      setNotice(`Receipt ${updated.reference_number} validated! Stock updated successfully.`)
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(updated)
      }
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to validate receipt.'))
    } finally {
      setValidatingId(null)
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
          <h2>Receipts (Incoming Stock)</h2>
          <p className="block-sub">Receive shipments from vendors and automatically add items to warehouse stock.</p>
        </div>

        <div className="toolbar__filters">
          <select
            className="field__input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft (Pending Validation)</option>
            <option value="done">Done (Validated & Received)</option>
            <option value="canceled">Canceled</option>
          </select>
          <Button onClick={() => setShowCreateModal(true)}>+ New Receipt</Button>
        </div>
      </div>

      {loading ? (
        <div className="card loading-state">Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <div className="card empty-state">
          <h3>No Receipts Found</h3>
          <p>Create a receipt to process incoming vendor shipments.</p>
          <Button onClick={() => setShowCreateModal(true)}>+ New Receipt</Button>
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier</th>
                <th>Receiving Location</th>
                <th>Line Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.reference_number}</strong>
                  </td>
                  <td>{r.supplier_name}</td>
                  <td>
                    {r.warehouse_name ? `${r.warehouse_name} - ` : ''}
                    {r.destination_location_name}
                  </td>
                  <td>{r.items.length} item(s)</td>
                  <td>
                    {r.status === 'done' ? (
                      <span className="badge badge--success">DONE</span>
                    ) : r.status === 'draft' ? (
                      <span className="badge badge--warning">DRAFT</span>
                    ) : (
                      <span className="badge badge--neutral">CANCELED</span>
                    )}
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setSelectedReceipt(r)}
                    >
                      View
                    </button>

                    {r.status === 'draft' && (
                      <Button
                        variant="secondary"
                        loading={validatingId === r.id}
                        onClick={() => handleValidateReceipt(r.id)}
                      >
                        Validate Stock
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Receipt Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--wide">
            <h3>Create Goods Receipt</h3>
            <form onSubmit={handleCreateReceipt} className="form">
              <div className="form__grid">
                <Field
                  label="Supplier / Vendor Name"
                  placeholder="e.g. Acme Metals Corp"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />

                <div className="field">
                  <label className="field__label">Receiving Location</label>
                  <select
                    className="field__input"
                    value={destinationLocId}
                    onChange={(e) => setDestinationLocId(e.target.value)}
                    required
                  >
                    <option value="">Select Receiving Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse_name ? `${loc.warehouse_name} - ` : ''}{loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Field
                label="Notes / PO Reference"
                placeholder="e.g. Purchase Order #8821"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <h4>Products Received</h4>
              {items.map((it, idx) => (
                <div key={idx} className="receipt-item-row">
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
              ))}

              <Button type="button" variant="secondary" onClick={handleAddItemRow}>
                + Add Line Item
              </Button>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creating}>
                  Save Draft Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Details Modal */}
      {selectedReceipt && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header-flex">
              <h3>Receipt {selectedReceipt.reference_number}</h3>
              {selectedReceipt.status === 'done' ? (
                <span className="badge badge--success">DONE</span>
              ) : selectedReceipt.status === 'draft' ? (
                <span className="badge badge--warning">DRAFT</span>
              ) : (
                <span className="badge badge--neutral">CANCELED</span>
              )}
            </div>

            <p><strong>Supplier:</strong> {selectedReceipt.supplier_name}</p>
            <p><strong>Receiving Destination:</strong> {selectedReceipt.warehouse_name ? `${selectedReceipt.warehouse_name} - ` : ''}{selectedReceipt.destination_location_name}</p>
            {selectedReceipt.notes && <p><strong>Notes:</strong> {selectedReceipt.notes}</p>}
            {selectedReceipt.received_at && (
              <p><strong>Validated At:</strong> {new Date(selectedReceipt.received_at).toLocaleString()}</p>
            )}

            <h4 style={{ marginTop: '1rem' }}>Items to Receive</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_sku}</td>
                    <td>{it.product_name}</td>
                    <td><strong>{it.quantity}</strong> {it.product_uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions">
              {selectedReceipt.status === 'draft' && (
                <Button
                  loading={validatingId === selectedReceipt.id}
                  onClick={() => handleValidateReceipt(selectedReceipt.id)}
                >
                  Validate & Increase Stock
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
