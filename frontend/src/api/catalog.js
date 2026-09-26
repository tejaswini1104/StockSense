import client from './client'

// Categories API
export const listCategories = (includeInactive = false) =>
  client
    .get('/categories', { params: { include_inactive: includeInactive } })
    .then((res) => res.data)

export const createCategory = (payload) =>
  client.post('/categories', payload).then((res) => res.data)

export const updateCategory = (categoryId, payload) =>
  client.patch(`/categories/${categoryId}`, payload).then((res) => res.data)

export const deleteCategory = (categoryId) =>
  client.delete(`/categories/${categoryId}`).then((res) => res.data)

// Products API
export const listProducts = (params = {}) =>
  client.get('/products', { params }).then((res) => res.data)

export const createProduct = (payload) =>
  client.post('/products', payload).then((res) => res.data)

export const getProduct = (productId) =>
  client.get(`/products/${productId}`).then((res) => res.data)

export const updateProduct = (productId, payload) =>
  client.patch(`/products/${productId}`, payload).then((res) => res.data)

export const getProductStock = (productId) =>
  client.get(`/products/${productId}/stock`).then((res) => res.data)

// Warehouses & Locations API
export const listWarehouses = () =>
  client.get('/warehouses').then((res) => res.data)

export const listLocations = (warehouseId) =>
  client
    .get('/locations', { params: warehouseId ? { warehouse_id: warehouseId } : {} })
    .then((res) => res.data)
