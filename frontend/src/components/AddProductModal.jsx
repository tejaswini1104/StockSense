import { useEffect, useState } from 'react'
import { createProduct, listLocations } from '../api/catalog'
import { toErrorMessage } from '../api/client'
import Alert from './Alert'
import Button from './Button'
import Field from './Field'
import Modal from './Modal'

const UOM_OPTIONS = [
  { value: 'unit', label: 'Unit' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'm', label: 'Meter (m)' },
]

export default function AddProductModal({ isOpen, onClose, categories = [], onProductCreated }) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState('unit')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [initialStock, setInitialStock] = useState('0')
  const [initialLocationId, setInitialLocationId] = useState('')
  const [description, setDescription] = useState('')

  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      // Reset state
      setName('')
      setSku('')
      setCategoryId('')
      setUnitOfMeasure('unit')
      setReorderLevel('0')
      setInitialStock('0')
      setInitialLocationId('')
      setDescription('')
      setError(null)
      setFieldErrors({})

      // Load locations
      setLoadingLocations(true)
      listLocations()
        .then((data) => {
          setLocations(data)
          const activeLocs = data.filter((loc) => loc.is_active)
          if (activeLocs.length > 0) {
            setInitialLocationId(activeLocs[0].id)
          }
        })
        .catch((err) => console.error('Failed to load locations', err))
        .finally(() => setLoadingLocations(false))
    }
  }, [isOpen])

  const validate = () => {
    const errors = {}
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters.'
    }
    if (!sku.trim() || sku.trim().length < 2) {
      errors.sku = 'SKU must be at least 2 characters.'
    } else if (/\s/.test(sku.trim())) {
      errors.sku = 'SKU cannot contain spaces.'
    }
    if (Number(reorderLevel) < 0) {
      errors.reorderLevel = 'Reorder level cannot be negative.'
    }
    if (Number(initialStock) < 0) {
      errors.initialStock = 'Initial stock cannot be negative.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description.trim() || null,
      category_id: categoryId ? Number(categoryId) : null,
      unit_of_measure: unitOfMeasure,
      reorder_level: Number(reorderLevel) || 0,
      initial_stock: Number(initialStock) || 0,
      initial_location_id: initialStock > 0 && initialLocationId ? Number(initialLocationId) : null,
    }

    try {
      const created = await createProduct(payload)
      onProductCreated(created)
      onClose()
    } catch (err) {
      const msg = toErrorMessage(err, 'Failed to create product. Check fields and try again.')
      setError(msg)
      if (msg.toLowerCase().includes('sku')) {
        setFieldErrors((prev) => ({ ...prev, sku: msg }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Product"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Create Product
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="form">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="form__grid">
          <Field
            label="Product Name *"
            htmlFor="add-product-name"
            error={fieldErrors.name}
            required
          >
            <input
              id="add-product-name"
              type="text"
              className="field__input"
              placeholder="e.g. Wireless Ergonomic Mouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field
            label="SKU / Code *"
            htmlFor="add-product-sku"
            hint="Unique code (e.g., WEM-100)"
            error={fieldErrors.sku}
            required
          >
            <input
              id="add-product-sku"
              type="text"
              className="field__input"
              placeholder="e.g. WEM-100"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="form__grid">
          <Field label="Category" htmlFor="add-product-category">
            <select
              id="add-product-category"
              className="field__input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={submitting}
            >
              <option value="">-- Select Category (Optional) --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit of Measure *" htmlFor="add-product-uom">
            <select
              id="add-product-uom"
              className="field__input"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              disabled={submitting}
            >
              {UOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="form__grid">
          <Field
            label="Initial Stock Quantity"
            htmlFor="add-product-stock"
            hint="Opening count"
            error={fieldErrors.initialStock}
          >
            <input
              id="add-product-stock"
              type="number"
              step="0.001"
              min="0"
              className="field__input"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              disabled={submitting}
            />
          </Field>

          {Number(initialStock) > 0 && (
            <Field label="Stock Location" htmlFor="add-product-location">
              <select
                id="add-product-location"
                className="field__input"
                value={initialLocationId}
                onChange={(e) => setInitialLocationId(e.target.value)}
                disabled={submitting || loadingLocations}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label="Reorder Level"
            htmlFor="add-product-reorder"
            hint="Trigger low-stock warning below this"
            error={fieldErrors.reorderLevel}
          >
            <input
              id="add-product-reorder"
              type="number"
              step="0.001"
              min="0"
              className="field__input"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              disabled={submitting}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="add-product-desc">
          <textarea
            id="add-product-desc"
            className="field__input"
            rows="3"
            placeholder="Product details, specifications, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </Field>
      </form>
    </Modal>
  )
}
