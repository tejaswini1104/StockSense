import { useEffect, useState } from 'react'
import { updateProduct } from '../api/catalog'
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

export default function EditProductModal({ isOpen, onClose, product, categories = [], onProductUpdated }) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState('unit')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isOpen && product) {
      setName(product.name || '')
      setSku(product.sku || '')
      setCategoryId(product.category?.id ? String(product.category.id) : '')
      setUnitOfMeasure(product.unit_of_measure || 'unit')
      setReorderLevel(product.reorder_level ? String(product.reorder_level) : '0')
      setIsActive(product.is_active ?? true)
      setDescription(product.description || '')
      setError(null)
      setFieldErrors({})
    }
  }, [isOpen, product])

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
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || !product) return

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description.trim() || null,
      category_id: categoryId ? Number(categoryId) : null,
      unit_of_measure: unitOfMeasure,
      reorder_level: Number(reorderLevel) || 0,
      is_active: isActive,
    }

    try {
      const updated = await updateProduct(product.id, payload)
      onProductUpdated(updated)
      onClose()
    } catch (err) {
      const msg = toErrorMessage(err, 'Failed to update product. Please try again.')
      setError(msg)
      if (msg.toLowerCase().includes('sku')) {
        setFieldErrors((prev) => ({ ...prev, sku: msg }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!product) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Product: ${product.name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="form">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="form__grid">
          <Field
            label="Product Name *"
            htmlFor="edit-product-name"
            error={fieldErrors.name}
            required
          >
            <input
              id="edit-product-name"
              type="text"
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field
            label="SKU / Code *"
            htmlFor="edit-product-sku"
            error={fieldErrors.sku}
            required
          >
            <input
              id="edit-product-sku"
              type="text"
              className="field__input"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="form__grid">
          <Field label="Category" htmlFor="edit-product-category">
            <select
              id="edit-product-category"
              className="field__input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={submitting}
            >
              <option value="">-- None (Uncategorized) --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Unit of Measure *" htmlFor="edit-product-uom">
            <select
              id="edit-product-uom"
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
            label="Reorder Level"
            htmlFor="edit-product-reorder"
            error={fieldErrors.reorderLevel}
          >
            <input
              id="edit-product-reorder"
              type="number"
              step="0.001"
              min="0"
              className="field__input"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field label="Status" htmlFor="edit-product-active">
            <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '10px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  id="edit-product-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--indigo-600)' }}
                />
                <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>Active product in catalogue</span>
              </label>
            </div>
          </Field>
        </div>

        <Field label="Description" htmlFor="edit-product-desc">
          <textarea
            id="edit-product-desc"
            className="field__input"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </Field>

        <div className="field__hint" style={{ marginTop: '4px', fontStyle: 'italic' }}>
          Note: Stock quantity is managed per location via stock movements and cannot be overwritten manually. Current total stock is <strong>{product.total_stock} {product.unit_of_measure}</strong>.
        </div>
      </form>
    </Modal>
  )
}
