/**
 * Centralised API calls — all paths match advika_v2 backend routes.
 *
 * Backend base: /api  (app.use('/api', routes))
 * REACT_APP_API_URL should be set to  http://<host>:<port>/api
 */

import API from "./client";

// ─── Auth / User ─────────────────────────────────────────────────────────────
export const sendOTP = (email) =>
  API.post("/user/send-otp", { email });

export const verifyOTP = (email, otp) =>
  API.post("/user/verify-otp", { email, otp });

// ─── Products ────────────────────────────────────────────────────────────────
export const getProducts = () =>
  API.get("/products/getproduct");

export const addProduct = (payload) =>
  API.post("/products/addproduct", payload);

export const updateProduct = (id, payload) =>
  API.put(`/products/updateproduct/${id}`, payload);

export const removeProduct = (id) =>
  API.delete(`/products/removeproduct/${id}`);

export const uploadProductImage = (id, formData) =>
  API.post(`/products/${id}/upload-image`, formData, { timeout: 60000 });

export const deleteProductImage = (id) =>
  API.delete(`/products/${id}/delete-image`);

export const updateMarathiName = (id, marathiName) =>
  API.put(`/products/${id}/marathi-name`, { marathiName });

export const updateDefaultUnit = (id, defaultUnit) =>
  API.put(`/products/${id}/unit`, { defaultUnit });

export const updateLeadBuffer = (id, leadDays, bufferDays) =>
  API.put(`/products/${id}/lead-buffer`, { leadDays, bufferDays });

// ─── Transactions ────────────────────────────────────────────────────────────
export const submitBilling = (payload) =>
  API.post("/transactions/billing", payload);

export const getDailyTransactions = () =>
  API.get("/transactions/daily");

export const getDailySummary = () =>
  API.get("/transactions/summary");

export const rollbackTransaction = (id) =>
  API.patch(`/transactions/rollback/${id}`);

// ─── Finance ─────────────────────────────────────────────────────────────────
export const getFinanceSummary = () =>
  API.get("/finance/summary");

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const getSuppliers = () =>
  API.get("/suppliers");

export const getProductSupplierMappings = (productId) =>
  API.get(`/suppliers/product/${productId}`);

export const addSupplier = (payload) =>
  API.post("/suppliers", payload);

export const archiveSupplier = (id) =>
  API.delete(`/suppliers/${id}`);

export const mapProductSuppliers = (product_id, suppliers) =>
  API.post("/suppliers/map-product", { product_id, suppliers });

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export const getPendingOrders = () =>
  API.get("/purchase-orders");

export const approveOrder = (orderId) =>
  API.patch(`/purchase-orders/${orderId}/approve`);

export const rejectOrder = (orderId) =>
  API.patch(`/purchase-orders/${orderId}/reject`);

export const updateOrderItem = (itemId, qty) =>
  API.patch(`/purchase-orders/items/${itemId}`, { qty });

// ─── Email ───────────────────────────────────────────────────────────────────
export const sendLowStockEmail = () =>
  API.post("/email/low-stock");

// ─── Repayments ───────────────────────────────────────────────────────────────
export const getRepayments = () =>
  API.get("/repayments");

export const createRepayment = (payload) =>
  API.post("/repayments", payload);

export const updateRepayment = (id, payload) =>
  API.put(`/repayments/${id}`, payload);

export const deleteRepayment = (id) =>
  API.delete(`/repayments/${id}`);

// ─── Missing Items ────────────────────────────────────────────────────────────
export const getMissingItems = () =>
  API.get("/missing-items");

export const createMissingItem = (name) =>
  API.post("/missing-items", { name });

export const updateMissingItem = (id, payload) =>
  API.put(`/missing-items/${id}`, payload);

export const deleteMissingItem = (id) =>
  API.delete(`/missing-items/${id}`);

// ─── Customer Count ───────────────────────────────────────────────────────────
export const getTodayCustomerCount = () =>
  API.get("/customers/today");

export const getAllCustomerCounts = () =>
  API.get("/customers/all");

export const updateCustomerCount = (change) =>
  API.post("/customers/update", { change });

// ─── Reorder Suggestions ──────────────────────────────────────────────────────
export const getReorderSuggestions = () =>
  API.get("/reorder/suggestions");

// ─── Add Stock ────────────────────────────────────────────────────────────────
export const addStock = (payload) =>
  API.post("/products/add-stock", payload);

// ─── Daily Entries (simplified transaction list for display) ──────────────────
export const getDailyEntries = () =>
  API.get("/transactions/entries");

// ─── Profit First (Finance) ───────────────────────────────────────────────────
export const getProfitFirstSummary = (month) =>
  API.get('/finance/profit-first', { params: month ? { month } : {} });

export const saveProfitFirstEntry = (month, payload) =>
  API.post('/finance/profit-first', payload, { params: month ? { month } : {} });

export const getProfitFirstMonths = () =>
  API.get('/finance/profit-first/months');
