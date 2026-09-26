import { useCallback, useEffect, useState } from 'react'
import { listCategories, listProducts } from '../api/catalog'
import { toErrorMessage } from '../api/client'
import AddProductModal from '../components/AddProductModal'
import Alert from '../components/Alert'
import Button from '../components/Button'
import CategoryManagerModal from '../components/CategoryManagerModal'
import EditProductModal from '../components/EditProductModal'
import ProductStockModal from '../components/ProductStockModal'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(1)

  // Summary counts for dashboard overview
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStock, setSelectedStock] = useState('')
  const [selectedActive, setSelectedActive] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [viewingStockProduct, setViewingStockProduct] = useState(null)

  const loadCategories = useCallback(async () => {
    try {
      const data = await listCategories(false)
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }, [])

  const loadProductsData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        page_size: pageSize,
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (selectedCategory) params.category_id = Number(selectedCategory)
      if (selectedStock) params.stock = selectedStock
      if (selectedActive !== '') params.is_active = selectedActive === 'true'

      const res = await listProducts(params)
      setProducts(res.items)
      setTotalCount(res.total)
      setTotalPages(res.pages)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to fetch products catalogue.'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, selectedCategory, selectedStock, selectedActive])

  // Load summary metrics for low stock and out of stock counts
  const loadSummaryStats = useCallback(async () => {
    try {
      const [lowRes, outRes] = await Promise.all([
        listProducts({ stock: 'low_stock', page_size: 1 }),
        listProducts({ stock: 'out_of_stock', page_size: 1 }),
      ])
      setLowStockCount(lowRes.total)
      setOutOfStockCount(outRes.total)
    } catch (err) {
      console.error('Failed to load summary counts', err)
    }
  }, [])

  useEffect(() => {
    loadCategories()
    loadSummaryStats()
  }, [loadCategories, loadSummaryStats])

  useEffect(() => {
    loadProductsData()
  }, [loadProductsData])

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedStock('')
    setSelectedActive('')
    setPage(1)
  }

  const handleProductCreated = () => {
    loadProductsData()
    loadSummaryStats()
    loadCategories()
  }

  const handleProductUpdated = () => {
    loadProductsData()
    loadSummaryStats()
  }

  const renderStockPill = (statusStr, totalStock, uom) => {
    if (statusStr === 'out_of_stock') {
      return (
        <span className="pill pill--out-of-stock">
          0 {uom} • Out of Stock
        </span>
      )
    }
    if (statusStr === 'low_stock') {
      return (
        <span className="pill pill--low-stock">
          {totalStock} {uom} • Low Stock
        </span>
      )
    }
    return (
      <span className="pill pill--in-stock">
        {totalStock} {uom} • In Stock
      </span>
    )
  }

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedStock || selectedActive !== '')

  return (
    <div className="stack">
      {/* Top Header / Action Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Products & Categories</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '2px' }}>
            Manage inventory items, SKUs, categories, reorder thresholds and stock locations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="ghost" onClick={() => setIsCategoryModalOpen(true)}>
            📁 Manage Categories
          </Button>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--indigo">📦</div>
          <div className="stat-card__content">
            <span className="stat-card__val">{totalCount}</span>
            <span className="stat-card__lbl">Total Products</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--amber">⚠️</div>
          <div className="stat-card__content">
            <span className="stat-card__val" style={{ color: lowStockCount > 0 ? '#b45309' : 'inherit' }}>
              {lowStockCount}
            </span>
            <span className="stat-card__lbl">Low Stock Items</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--red">🚫</div>
          <div className="stat-card__content">
            <span className="stat-card__val" style={{ color: outOfStockCount > 0 ? 'var(--red-600)' : 'inherit' }}>
              {outOfStockCount}
            </span>
            <span className="stat-card__lbl">Out of Stock</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">🏷️</div>
          <div className="stat-card__content">
            <span className="stat-card__val">{categories.length}</span>
            <span className="stat-card__lbl">Categories</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <div className="search-box">
            <span className="search-box__icon">🔍</span>
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <select
            className="select-input"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="select-input"
            value={selectedStock}
            onChange={(e) => {
              setSelectedStock(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            className="select-input"
            value={selectedActive}
            onChange={(e) => {
              setSelectedActive(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleClearFilters} style={{ padding: '8px 12px', fontSize: '0.84rem' }}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert tone="error">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>{error}</span>
            <Button variant="ghost" onClick={loadProductsData} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Product Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner--lg" />
            <span>Loading products catalogue…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <h4>{hasActiveFilters ? 'No Matching Products' : 'Catalogue is Empty'}</h4>
            <p>
              {hasActiveFilters
                ? 'No products match your search or filter criteria. Try resetting filters.'
                : 'Get started by creating your first product item.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={handleClearFilters}>
                Reset Search Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                + Create Product
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>UOM</th>
                    <th>Stock On-Hand</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ fontSize: '0.94rem', color: 'var(--slate-900)' }}>{product.name}</strong>
                          <div>
                            <span className="sku-badge">{product.sku}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {product.category ? (
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                            {product.category.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                            Uncategorized
                          </span>
                        )}
                      </td>

                      <td style={{ textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate-600)' }}>
                        {product.unit_of_measure}
                      </td>

                      <td>
                        {renderStockPill(product.stock_status, product.total_stock, product.unit_of_measure)}
                      </td>

                      <td style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                        {product.reorder_level} {product.unit_of_measure}
                      </td>

                      <td>
                        <span className={`pill ${product.is_active ? 'pill--ok' : 'pill--off'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="View stock per location"
                            onClick={() => setViewingStockProduct(product)}
                          >
                            📍 Locations
                          </button>

                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit product details"
                            onClick={() => setEditingProduct(product)}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="pagination">
              <div>
                Showing <strong>{products.length}</strong> of <strong>{totalCount}</strong> products
              </div>

              <div className="pagination__actions">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '6px 12px', fontSize: '0.84rem' }}
                >
                  Previous
                </Button>

                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '6px 12px', fontSize: '0.84rem' }}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        onProductCreated={handleProductCreated}
      />

      <EditProductModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categories={categories}
        onProductUpdated={handleProductUpdated}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesUpdated={() => {
          loadCategories()
          loadProductsData()
        }}
      />

      <ProductStockModal
        isOpen={Boolean(viewingStockProduct)}
        onClose={() => setViewingStockProduct(null)}
        product={viewingStockProduct}
      />
    </div>
  )
}
