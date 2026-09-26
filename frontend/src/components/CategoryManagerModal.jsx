import { useEffect, useState } from 'react'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api/catalog'
import { toErrorMessage } from '../api/client'
import Alert from './Alert'
import Button from './Button'
import Field from './Field'
import Modal from './Modal'

export default function CategoryManagerModal({ isOpen, onClose, onCategoriesUpdated }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Add category form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Edit mode category state
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadCategoriesList = () => {
    setLoading(true)
    listCategories(true)
      .then((data) => {
        setCategories(data)
        if (onCategoriesUpdated) onCategoriesUpdated(data)
      })
      .catch((err) => setError(toErrorMessage(err, 'Failed to load categories.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccessMsg(null)
      setNewName('')
      setNewDesc('')
      setCreateError(null)
      setEditingId(null)
      loadCategoriesList()
    }
  }, [isOpen])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || newName.trim().length < 2) {
      setCreateError('Category name must be at least 2 characters.')
      return
    }

    setCreating(true)
    setCreateError(null)
    setError(null)

    try {
      await createCategory({ name: newName.trim(), description: newDesc.trim() || null })
      setNewName('')
      setNewDesc('')
      setSuccessMsg('Category created successfully.')
      loadCategoriesList()
    } catch (err) {
      setCreateError(toErrorMessage(err, 'Failed to create category.'))
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditDesc(cat.description || '')
    setEditActive(cat.is_active)
    setError(null)
    setSuccessMsg(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDesc('')
  }

  const handleUpdate = async (id) => {
    if (!editName.trim() || editName.trim().length < 2) {
      setError('Category name must be at least 2 characters.')
      return
    }

    setUpdating(true)
    setError(null)

    try {
      await updateCategory(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        is_active: editActive,
      })
      setEditingId(null)
      setSuccessMsg('Category updated successfully.')
      loadCategoriesList()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to update category.'))
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (cat) => {
    if (cat.product_count > 0) {
      setError(`Cannot delete '${cat.name}': it is assigned to ${cat.product_count} product(s). Reassign them first or deactivate the category.`)
      return
    }

    if (!window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) {
      return
    }

    setError(null)
    try {
      await deleteCategory(cat.id)
      setSuccessMsg(`Category '${cat.name}' deleted.`)
      loadCategoriesList()
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to delete category.'))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Category Manager"
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="stack" style={{ gap: '20px' }}>
        {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}
        {successMsg && <Alert tone="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

        {/* Create new category section */}
        <div style={{ padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--slate-200)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>Add New Category</h4>
          {createError && <Alert tone="error">{createError}</Alert>}
          <form onSubmit={handleCreate} className="form__grid" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'flex-end', gap: '12px' }}>
            <Field label="Category Name *" htmlFor="cat-name">
              <input
                id="cat-name"
                type="text"
                className="field__input"
                placeholder="e.g. Perishables, Electronics"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={creating}
              />
            </Field>

            <Field label="Description (Optional)" htmlFor="cat-desc">
              <input
                id="cat-desc"
                type="text"
                className="field__input"
                placeholder="e.g. Temperature controlled items"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                disabled={creating}
              />
            </Field>

            <Button type="submit" variant="primary" loading={creating} disabled={!newName.trim()}>
              Add Category
            </Button>
          </form>
        </div>

        {/* Existing categories list */}
        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>
            Existing Categories ({categories.length})
          </h4>

          {loading ? (
            <div className="loading-state">
              <div className="spinner spinner--lg" />
              <span>Loading categories…</span>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
              No categories created yet. Use the form above to add your first category.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map((cat) => {
                const isEditing = editingId === cat.id
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#fff',
                      border: '1px solid var(--slate-200)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', flex: 1, gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="field__input"
                          style={{ flex: 1, minWidth: '150px' }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          disabled={updating}
                        />
                        <input
                          type="text"
                          className="field__input"
                          style={{ flex: 1.5, minWidth: '200px' }}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description"
                          disabled={updating}
                        />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            disabled={updating}
                          />
                          Active
                        </label>
                        <Button variant="primary" onClick={() => handleUpdate(cat.id)} loading={updating}>
                          Save
                        </Button>
                        <Button variant="ghost" onClick={cancelEdit} disabled={updating}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ fontSize: '0.94rem', color: 'var(--slate-900)' }}>{cat.name}</strong>
                            <span className={`pill ${cat.is_active ? 'pill--ok' : 'pill--off'}`}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                              {cat.product_count} product{cat.product_count === 1 ? '' : 's'}
                            </span>
                          </div>
                          {cat.description && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--slate-500)' }}>
                              {cat.description}
                            </p>
                          )}
                        </div>

                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => startEdit(cat)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ color: 'var(--red-600)', borderColor: '#fecaca' }}
                            onClick={() => handleDelete(cat)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
