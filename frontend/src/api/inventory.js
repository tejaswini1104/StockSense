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

// --- Deliveries ---
export const fetchDeliveries = (params = {}) =>
  client.get('/deliveries', { params }).then((res) => res.data)

export const fetchDeliveryById = (id) =>
  client.get(`/deliveries/${id}`).then((res) => res.data)

export const createDelivery = (payload) =>
  client.post('/deliveries', payload).then((res) => res.data)

export const updateDelivery = (id, payload) =>
  client.put(`/deliveries/${id}`, payload).then((res) => res.data)

export const pickDelivery = (id) =>
  client.post(`/deliveries/${id}/pick`).then((res) => res.data)

export const packDelivery = (id) =>
  client.post(`/deliveries/${id}/pack`).then((res) => res.data)

export const validateDelivery = (id) =>
  client.post(`/deliveries/${id}/validate`).then((res) => res.data)

// --- Internal Transfers ---
export const fetchInternalTransfers = (params = {}) =>
  client.get('/internal-transfers', { params }).then((res) => res.data)

export const fetchInternalTransferById = (id) =>
  client.get(`/internal-transfers/${id}`).then((res) => res.data)

export const createInternalTransfer = (payload) =>
  client.post('/internal-transfers', payload).then((res) => res.data)

export const validateInternalTransfer = (id) =>
  client.post(`/internal-transfers/${id}/validate`).then((res) => res.data)

// --- Stock Ledger & Dashboard ---
export const fetchStockLedger = (params = {}) =>
  client.get('/stock-ledger', { params }).then((res) => res.data)

export const fetchDashboardStats = () =>
  client.get('/dashboard/stats').then((res) => res.data)
