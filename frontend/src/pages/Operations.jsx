import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'

export default function Operations() {
  const [activeTab, setActiveTab] = useState('receipts') // 'receipts' | 'transfers'

  // Common Data
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Receipts State
  const [receipts, setReceipts] = useState([])
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('')
  const [showCreateReceiptModal, setShowCreateReceiptModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [validatingReceiptId, setValidatingReceiptId] = useState(null)

  // Receipt Form
  const [supplierName, setSupplierName] = useState('')
  const [destinationLocId, setDestinationLocId] = useState('')
  const [receiptNotes, setReceiptNotes] = useState('')
  const [receiptItems, setReceiptItems] = useState([{ product_id: '', quantity: 1 }])
  const [creatingReceipt, setCreatingReceipt] = useState(false)

  // Transfers State
  const [transfers, setTransfers] = useState([])
  const [transferStatusFilter, setTransferStatusFilter] = useState('')
  const [showCreateTransferModal, setShowCreateTransferModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const [validatingTransferId, setValidatingTransferId] = useState(null)

  // Transfer Wizard State
  const [sourceLocId, setSourceLocId] = useState('')
  const [destLocId, setDestLocId] = useState('')
  const [transferProductId, setTransferProductId] = useState('')
  const [transferQty, setTransferQty] = useState(1)
  const [transferNotes, setTransferNotes] = useState('')
  const [creatingTransfer, setCreatingTransfer] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [rData, tData, pData, lData] = await Promise.all([
        invApi.fetchReceipts({ status: receiptStatusFilter || undefined }),
        invApi.fetchInternalTransfers({ status: transferStatusFilter || undefined }),
        invApi.fetchProducts(),
        invApi.fetchAllLocations(),
      ])
      setReceipts(rData)
      setTransfers(tData)
      setProducts(pData)
      setLocations(lData)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load operations data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [receiptStatusFilter, transferStatusFilter])

  // --- Receipts Logic ---
  const handleAddReceiptItemRow = () => {
    setReceiptItems([...receiptItems, { product_id: '', quantity: 1 }])
  }

  const handleRemoveReceiptItemRow = (index) => {
    if (receiptItems.length <= 1) return
    setReceiptItems(receiptItems.filter((_, i) => i !== index))
  }

  const handleReceiptItemChange = (index, field, value) => {
    const updated = [...receiptItems]
    updated[index][field] = value
    setReceiptItems(updated)
  }

  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    setError('')
    if (!destinationLocId) {
      setError('Please select a receiving destination location.')
      return
    }

    const validItems = receiptItems
      .filter((it) => it.product_id && Number(it.quantity) > 0)
      .map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
      }))

    if (validItems.length === 0) {
      setError('Add at least one valid product line with quantity > 0.')
      return
    }

    setCreatingReceipt(true)
    try {
      await invApi.createReceipt({
        supplier_name: supplierName.trim(),
        destination_location_id: Number(destinationLocId),
        notes: receiptNotes.trim() || undefined,
        items: validItems,
      })
      setNotice('Receipt created successfully in Draft status.')
      setShowCreateReceiptModal(false)
      setSupplierName('')
      setDestinationLocId('')
      setReceiptNotes('')
      setReceiptItems([{ product_id: '', quantity: 1 }])
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create receipt.'))
    } finally {
      setCreatingReceipt(false)
    }
  }

  const handleValidateReceipt = async (receiptId) => {
    setError('')
    setValidatingReceiptId(receiptId)
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
      setValidatingReceiptId(null)
    }
  }

  // --- Internal Transfers Logic ---
  const selectedProductObj = products.find((p) => p.id === Number(transferProductId))
  const sourceStockQuant = selectedProductObj?.stock_by_location.find(
    (s) => s.location_id === Number(sourceLocId)
  )
  const destStockQuant = selectedProductObj?.stock_by_location.find(
    (s) => s.location_id === Number(destLocId)
  )

  const sourceStockBefore = sourceStockQuant ? sourceStockQuant.quantity : 0
  const destStockBefore = destStockQuant ? destStockQuant.quantity : 0
  const qtyToTransfer = Number(transferQty) || 0

  const sourceStockAfter = Math.max(0, sourceStockBefore - qtyToTransfer)
  const destStockAfter = destStockBefore + qtyToTransfer
  const totalStockBefore = selectedProductObj?.total_stock || 0
  const totalStockAfter = totalStockBefore // Stock total across company remains equal!

  const handleCreateTransfer = async (e) => {
    e.preventDefault()
    setError('')

    if (!sourceLocId || !destLocId) {
      setError('Please select both source and destination locations.')
      return
    }

    if (Number(sourceLocId) === Number(destLocId)) {
      setError('Source location and destination location cannot be the same.')
      return
    }

    if (!transferProductId || qtyToTransfer <= 0) {
      setError('Please select a product and a transfer quantity greater than 0.')
      return
    }

    if (qtyToTransfer > sourceStockBefore) {
      setError(`Insufficient stock at source location. Available: ${sourceStockBefore}, Requested: ${qtyToTransfer}`)
      return
    }

    setCreatingTransfer(true)
    try {
      await invApi.createInternalTransfer({
        source_location_id: Number(sourceLocId),
        destination_location_id: Number(destLocId),
        notes: transferNotes.trim() || undefined,
        items: [{ product_id: Number(transferProductId), quantity: qtyToTransfer }],
      })
      setNotice('Internal Transfer request created in Draft status.')
      setShowCreateTransferModal(false)
      setSourceLocId('')
      setDestLocId('')
      setTransferProductId('')
      setTransferQty(1)
      setTransferNotes('')
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create internal transfer.'))
    } finally {
      setCreatingTransfer(false)
    }
  }

  const handleValidateTransfer = async (transferId) => {
    setError('')
    setValidatingTransferId(transferId)
    try {
      const updated = await invApi.validateInternalTransfer(transferId)
      setNotice(`Internal Transfer ${updated.reference_number} validated! Stock moved successfully.`)
      if (selectedTransfer && selectedTransfer.id === transferId) {
        setSelectedTransfer(updated)
      }
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to validate internal transfer.'))
    } finally {
      setValidatingTransferId(null)
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

      {/* Operations Navigation Tabs */}
      <div className="card toolbar">
        <div className="tab-group">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'receipts' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('receipts')}
          >
            📦 Receipts (Incoming Goods)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'transfers' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('transfers')}
          >
            🔄 Internal Transfers (Location Moves)
          </button>
        </div>

        {activeTab === 'receipts' ? (
          <div className="toolbar__filters">
            <select
              className="field__input"
              value={receiptStatusFilter}
              onChange={(e) => setReceiptStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft (Pending Validation)</option>
              <option value="done">Done (Validated & Received)</option>
              <option value="canceled">Canceled</option>
            </select>
            <Button onClick={() => setShowCreateReceiptModal(true)}>+ New Receipt</Button>
          </div>
        ) : (
          <div className="toolbar__filters">
            <select
              className="field__input"
              value={transferStatusFilter}
              onChange={(e) => setTransferStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft (Pending Validation)</option>
              <option value="done">Done (Validated & Moved)</option>
              <option value="canceled">Canceled</option>
            </select>
            <Button onClick={() => setShowCreateTransferModal(true)}>+ New Transfer</Button>
          </div>
        )}
      </div>

      {/* TAB 1: RECEIPTS */}
      {activeTab === 'receipts' && (
        <>
          {loading ? (
            <div className="card loading-state">Loading receipts...</div>
          ) : receipts.length === 0 ? (
            <div className="card empty-state">
              <h3>No Receipts Found</h3>
              <p>Create a receipt to process incoming vendor shipments.</p>
              <Button onClick={() => setShowCreateReceiptModal(true)}>+ New Receipt</Button>
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
                            loading={validatingReceiptId === r.id}
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
        </>
      )}

      {/* TAB 2: INTERNAL TRANSFERS */}
      {activeTab === 'transfers' && (
        <>
          {loading ? (
            <div className="card loading-state">Loading internal transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="card empty-state">
              <h3>No Internal Transfers Found</h3>
              <p>Move stock between warehouses, racks, or production floors.</p>
              <Button onClick={() => setShowCreateTransferModal(true)}>+ New Transfer</Button>
            </div>
          ) : (
            <div className="card table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Source Location</th>
                    <th>Destination Location</th>
                    <th>Line Items</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.reference_number}</strong>
                      </td>
                      <td>
                        {t.source_warehouse_name ? `${t.source_warehouse_name} - ` : ''}
                        {t.source_location_name}
                      </td>
                      <td>
                        {t.destination_warehouse_name ? `${t.destination_warehouse_name} - ` : ''}
                        {t.destination_location_name}
                      </td>
                      <td>{t.items.length} item(s)</td>
                      <td>
                        {t.status === 'done' ? (
                          <span className="badge badge--success">DONE</span>
                        ) : t.status === 'draft' ? (
                          <span className="badge badge--warning">DRAFT</span>
                        ) : (
                          <span className="badge badge--neutral">CANCELED</span>
                        )}
                      </td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setSelectedTransfer(t)}
                        >
                          View
                        </button>

                        {t.status === 'draft' && (
                          <Button
                            variant="secondary"
                            loading={validatingTransferId === t.id}
                            onClick={() => handleValidateTransfer(t.id)}
                          >
                            Validate Move
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create Receipt Modal */}
      {showCreateReceiptModal && (
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
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
              />

              <h4>Products Received</h4>
              {receiptItems.map((it, idx) => (
                <div key={idx} className="receipt-item-row">
                  <div className="field flex-grow">
                    <label className="field__label">Product</label>
                    <select
                      className="field__input"
                      value={it.product_id}
                      onChange={(e) => handleReceiptItemChange(idx, 'product_id', e.target.value)}
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
                      onChange={(e) => handleReceiptItemChange(idx, 'quantity', e.target.value)}
                      required
                    />
                  </div>

                  {receiptItems.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveReceiptItemRow(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <Button type="button" variant="secondary" onClick={handleAddReceiptItemRow}>
                + Add Line Item
              </Button>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCreateReceiptModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingReceipt}>
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

            <h4 style={{ marginTop: '1rem' }}>Items Received</h4>
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
                  loading={validatingReceiptId === selectedReceipt.id}
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

      {/* Create Internal Transfer Modal (Workflow Step-by-Step with Stock Impact Preview) */}
      {showCreateTransferModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--wide">
            <h3>New Internal Transfer (Stock Movement)</h3>
            <p className="block-sub">Source → Product → Quantity → Destination → Impact Preview</p>

            <form onSubmit={handleCreateTransfer} className="form" style={{ marginTop: '1rem' }}>
              <div className="form__grid">
                {/* 1. Source Location */}
                <div className="field">
                  <label className="field__label">1. Source Location</label>
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

                {/* 2. Destination Location */}
                <div className="field">
                  <label className="field__label">2. Destination Location</label>
                  <select
                    className="field__input"
                    value={destLocId}
                    onChange={(e) => setDestLocId(e.target.value)}
                    required
                  >
                    <option value="">Select Destination Location</option>
                    {locations
                      .filter((loc) => loc.id !== Number(sourceLocId)) // Source & Destination cannot be same!
                      .map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.warehouse_name ? `${loc.warehouse_name} - ` : ''}{loc.name} ({loc.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 3. Product & Quantity */}
              <div className="form__grid">
                <div className="field">
                  <label className="field__label">3. Product to Transfer</label>
                  <select
                    className="field__input"
                    value={transferProductId}
                    onChange={(e) => setTransferProductId(e.target.value)}
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

                <div className="field">
                  <label className="field__label">4. Transfer Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="field__input"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    required
                  />
                  {sourceLocId && transferProductId && (
                    <small className="field__hint">
                      Available at Source: <strong>{sourceStockBefore}</strong> {selectedProductObj?.uom}
                    </small>
                  )}
                </div>
              </div>

              <Field
                label="Transfer Notes"
                placeholder="e.g. Move to production rack for job #402"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />

              {/* Impact Preview Section */}
              {sourceLocId && destLocId && transferProductId && (
                <div className="transfer-impact-box">
                  <h4>Stock Impact Preview</h4>
                  <div className="impact-grid">
                    <div className="impact-col">
                      <span className="impact-label">Source Location</span>
                      <strong className="impact-loc-name">
                        {locations.find((l) => l.id === Number(sourceLocId))?.name}
                      </strong>
                      <div className="impact-calc">
                        <span>Before: {sourceStockBefore}</span>
                        <span className="impact-diff impact-diff--minus">-{qtyToTransfer}</span>
                        <span><strong>After: {sourceStockAfter}</strong></span>
                      </div>
                    </div>

                    <div className="impact-arrow">➔</div>

                    <div className="impact-col">
                      <span className="impact-label">Destination Location</span>
                      <strong className="impact-loc-name">
                        {locations.find((l) => l.id === Number(destLocId))?.name}
                      </strong>
                      <div className="impact-calc">
                        <span>Before: {destStockBefore}</span>
                        <span className="impact-diff impact-diff--plus">+{qtyToTransfer}</span>
                        <span><strong>After: {destStockAfter}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="impact-total">
                    Total Product Stock Balance: <strong>{totalStockBefore}</strong> {selectedProductObj?.uom} (Before) = <strong>{totalStockAfter}</strong> {selectedProductObj?.uom} (After)
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCreateTransferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingTransfer}>
                  Save Draft Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Internal Transfer Details Modal */}
      {selectedTransfer && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header-flex">
              <h3>Transfer {selectedTransfer.reference_number}</h3>
              {selectedTransfer.status === 'done' ? (
                <span className="badge badge--success">DONE</span>
              ) : selectedTransfer.status === 'draft' ? (
                <span className="badge badge--warning">DRAFT</span>
              ) : (
                <span className="badge badge--neutral">CANCELED</span>
              )}
            </div>

            <p><strong>Source Location:</strong> {selectedTransfer.source_warehouse_name ? `${selectedTransfer.source_warehouse_name} - ` : ''}{selectedTransfer.source_location_name}</p>
            <p><strong>Destination Location:</strong> {selectedTransfer.destination_warehouse_name ? `${selectedTransfer.destination_warehouse_name} - ` : ''}{selectedTransfer.destination_location_name}</p>
            {selectedTransfer.notes && <p><strong>Notes:</strong> {selectedTransfer.notes}</p>}
            {selectedTransfer.completed_at && (
              <p><strong>Validated At:</strong> {new Date(selectedTransfer.completed_at).toLocaleString()}</p>
            )}

            <h4 style={{ marginTop: '1rem' }}>Items to Move</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransfer.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_sku}</td>
                    <td>{it.product_name}</td>
                    <td><strong>{it.quantity}</strong> {it.product_uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions">
              {selectedTransfer.status === 'draft' && (
                <Button
                  loading={validatingTransferId === selectedTransfer.id}
                  onClick={() => handleValidateTransfer(selectedTransfer.id)}
                >
                  Validate & Transfer Stock
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedTransfer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
