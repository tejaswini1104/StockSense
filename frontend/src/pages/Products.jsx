import { useEffect, useState } from 'react'
import * as invApi from '../api/inventory'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Create Product Form
  const [pForm, setPForm] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    uom: 'Units',
    min_reorder_qty: 10,
    max_reorder_qty: 100,
    initial_stock: '',
    initial_location_id: '',
  })
  const [creatingP, setCreatingP] = useState(false)

  // Create Category Form
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [creatingCat, setCreatingCat] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [pData, cData, lData] = await Promise.all([
        invApi.fetchProducts({
          search: search.trim() || undefined,
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          low_stock_only: lowStockOnly || undefined,
        }),
        invApi.fetchCategories(),
        invApi.fetchAllLocations(),
      ])
      setProducts(pData)
      setCategories(cData)
      setLocations(lData)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load products.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCategory, lowStockOnly])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleCreateProduct = async (e) => {
    e.preventDefault()
    setError('')
    setCreatingP(true)
    try {
      await invApi.createProduct({
        sku: pForm.sku.trim(),
        name: pForm.name.trim(),
        description: pForm.description.trim() || undefined,
        category_id: pForm.category_id ? Number(pForm.category_id) : undefined,
        uom: pForm.uom || 'Units',
        min_reorder_qty: Number(pForm.min_reorder_qty) || 0,
        max_reorder_qty: Number(pForm.max_reorder_qty) || 100,
        initial_stock: pForm.initial_stock ? Number(pForm.initial_stock) : undefined,
        initial_location_id: pForm.initial_location_id ? Number(pForm.initial_location_id) : undefined,
      })
      setNotice('Product created successfully!')
      setShowCreateModal(false)
      setPForm({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        uom: 'Units',
        min_reorder_qty: 10,
        max_reorder_qty: 100,
        initial_stock: '',
        initial_location_id: '',
      })
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create product.'))
    } finally {
      setCreatingP(false)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    setError('')
    setCreatingCat(true)
    try {
      await invApi.createCategory({
        name: catForm.name.trim(),
        description: catForm.description.trim() || undefined,
      })
      setNotice('Category created!')
      setShowCatModal(false)
      setCatForm({ name: '', description: '' })
      const cData = await invApi.fetchCategories()
      setCategories(cData)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to create category.'))
    } finally {
      setCreatingCat(false)
    }
  }

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      await invApi.deleteProduct(id)
      setNotice(`Product "${name}" deleted.`)
      loadData()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to delete product.'))
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

      {/* Header Controls */}
      <div className="card toolbar">
        <form className="toolbar__search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="field__input"
            placeholder="Search by SKU or Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="toolbar__filters">
          <select
            className="field__input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            <span>Low Stock Alert</span>
          </label>

          <Button variant="secondary" onClick={() => setShowCatModal(true)}>
            + Category
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>+ Add Product</Button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="card loading-state">Loading products catalogue...</div>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <h3>No products found</h3>
          <p>Create your first product or adjust search filters.</p>
          <Button onClick={() => setShowCreateModal(true)}>+ Create Product</Button>
        </div>
      ) : (
        <div className="card table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Min Reorder</th>
                <th>Total Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.sku}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setSelectedProduct(p)}
                    >
                      {p.name}
                    </button>
                    {p.description && <small className="block-sub">{p.description}</small>}
                  </td>
                  <td>{p.category ? p.category.name : '-'}</td>
                  <td>{p.uom}</td>
                  <td>{p.min_reorder_qty}</td>
                  <td>
                    <strong style={{ fontSize: '1.05rem' }}>{p.total_stock}</strong> {p.uom}
                  </td>
                  <td>
                    {p.is_low_stock ? (
                      <span className="badge badge--danger">Low Stock</span>
                    ) : (
                      <span className="badge badge--success">In Stock</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setSelectedProduct(p)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="action-btn action-btn--danger"
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add New Product</h3>
            <form onSubmit={handleCreateProduct} className="form">
              <div className="form__grid">
                <Field
                  label="SKU / Code"
                  placeholder="e.g. PROD-101"
                  value={pForm.sku}
                  onChange={(e) => setPForm({ ...pForm, sku: e.target.value })}
                  required
                />
                <Field
                  label="Product Name"
                  placeholder="e.g. Steel Rods 10mm"
                  value={pForm.name}
                  onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label">Category</label>
                <select
                  className="field__input"
                  value={pForm.category_id}
                  onChange={(e) => setPForm({ ...pForm, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form__grid">
                <Field
                  label="Unit of Measure (UOM)"
                  placeholder="Units, Kg, Meters..."
                  value={pForm.uom}
                  onChange={(e) => setPForm({ ...pForm, uom: e.target.value })}
                  required
                />
                <Field
                  label="Min Reorder Qty"
                  type="number"
                  value={pForm.min_reorder_qty}
                  onChange={(e) => setPForm({ ...pForm, min_reorder_qty: e.target.value })}
                  required
                />
              </div>

              <Field
                label="Description (Optional)"
                value={pForm.description}
                onChange={(e) => setPForm({ ...pForm, description: e.target.value })}
              />

              <hr />
              <p><strong>Initial Stock (Optional)</strong></p>
              <div className="form__grid">
                <Field
                  label="Initial Qty"
                  type="number"
                  placeholder="0"
                  value={pForm.initial_stock}
                  onChange={(e) => setPForm({ ...pForm, initial_stock: e.target.value })}
                />
                <div className="field">
                  <label className="field__label">Receiving Location</label>
                  <select
                    className="field__input"
                    value={pForm.initial_location_id}
                    onChange={(e) => setPForm({ ...pForm, initial_location_id: e.target.value })}
                  >
                    <option value="">Select Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse_name ? `${loc.warehouse_name} - ` : ''}{loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingP}>
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCatModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Add Category</h3>
            <form onSubmit={handleCreateCategory} className="form">
              <Field
                label="Category Name"
                placeholder="e.g. Raw Materials"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                required
              />
              <Field
                label="Description"
                placeholder="Optional notes"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowCatModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={creatingCat}>
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedProduct && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{selectedProduct.name} Details</h3>
            <p><strong>SKU:</strong> {selectedProduct.sku}</p>
            <p><strong>Category:</strong> {selectedProduct.category?.name || 'Unassigned'}</p>
            <p><strong>Unit of Measure:</strong> {selectedProduct.uom}</p>
            <p><strong>Min Reorder Threshold:</strong> {selectedProduct.min_reorder_qty}</p>
            <p><strong>Total Stock:</strong> {selectedProduct.total_stock} {selectedProduct.uom}</p>

            <h4 style={{ marginTop: '1rem' }}>Stock Distribution by Location</h4>
            {selectedProduct.stock_by_location.length === 0 ? (
              <p>No stock currently assigned to locations.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Location</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.stock_by_location.map((sq) => (
                    <tr key={sq.id}>
                      <td>{sq.warehouse_name || '-'}</td>
                      <td>{sq.location_name}</td>
                      <td><strong>{sq.quantity}</strong> {selectedProduct.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="modal-actions">
              <Button onClick={() => setSelectedProduct(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
