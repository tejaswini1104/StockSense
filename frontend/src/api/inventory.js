import client from './client'

// --- Categories ---
export const fetchCategories = () =>
  client.get('/categories').then((res) => res.data)

export const createCategory = (payload) =>
  client.post('/categories', payload).then((res) => res.data)

// --- Products ---
export const fetchProducts = (params = {}) =>
  client.get('/products', { params }).then((res) => res.data)

export const fetchProductById = (id) =>
  client.get(`/products/${id}`).then((res) => res.data)

export const createProduct = (payload) =>
  client.post('/products', payload).then((res) => res.data)

export const updateProduct = (id, payload) =>
  client.put(`/products/${id}`, payload).then((res) => res.data)

export const deleteProduct = (id) =>
  client.delete(`/products/${id}`).then((res) => res.data)

// --- Warehouses & Locations ---
export const fetchWarehouses = () =>
  client.get('/warehouses').then((res) => res.data)

export const createWarehouse = (payload) =>
  client.post('/warehouses', payload).then((res) => res.data)

export const fetchAllLocations = () =>
  client.get('/warehouses/locations/all').then((res) => res.data)

export const createLocation = (warehouseId, payload) =>
  client.post(`/warehouses/${warehouseId}/locations`, payload).then((res) => res.data)

// --- Receipts ---
export const fetchReceipts = (params = {}) =>
  client.get('/receipts', { params }).then((res) => res.data)

export const fetchReceiptById = (id) =>
  client.get(`/receipts/${id}`).then((res) => res.data)

export const createReceipt = (payload) =>
  client.post('/receipts', payload).then((res) => res.data)

export const validateReceipt = (id) =>
  client.post(`/receipts/${id}/validate`).then((res) => res.data)

// --- Stock Ledger & Dashboard ---
export const fetchStockLedger = (params = {}) =>
  client.get('/stock-ledger', { params }).then((res) => res.data)

export const fetchDashboardStats = () =>
  client.get('/dashboard/stats').then((res) => res.data)
