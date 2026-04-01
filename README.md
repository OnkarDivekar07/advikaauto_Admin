# Advika Billing App — Refactored v2

React frontend for the `advika_v2` Express/Sequelize backend.

---

## Quick Start

```bash
cp .env.example .env        # set REACT_APP_API_URL
npm install
npm start
```

`.env.example`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Project Structure

```
src/
├── api/
│   ├── client.js           # Axios instance — JWT interceptors, 401 redirect
│   └── endpoints.js        # All API calls in one place (single source of truth)
│
├── components/
│   ├── Layout.jsx           # Sidebar + topbar shell
│   ├── OfflineBanner.jsx    # Fixed red banner when browser goes offline
│   ├── ProtectedRoute.jsx   # Redirects to / if not authenticated
│   └── Toast.jsx            # Non-blocking toast notification system
│
├── context/
│   └── AuthContext.jsx      # JWT token state — login() / logout() / isAuthenticated
│
├── hooks/
│   └── useApiData.js        # Generic fetch hook — data / loading / error / refresh
│
├── pages/
│   ├── Login.jsx / OtpVerification.jsx
│   ├── Billing.jsx / DailyTransactions.jsx
│   ├── Inventory.jsx / Financials.jsx
│   ├── QrGenerator.jsx / ProductSheets.jsx
│   ├── ProductImages.jsx / AutoOrders.jsx
│   └── Suppliers.jsx
│
├── utils/
│   └── extractError.js      # Normalises all error shapes → human-readable string
│
├── App.jsx                  # Routes — no duplicates, all protected routes wrapped
└── global.css               # .error-banner, .offline-banner, button:disabled
```

---

## API Endpoint Map

All calls go to `REACT_APP_API_URL` which must include `/api`.

| Module           | Frontend call                          | Backend route                        |
|------------------|----------------------------------------|--------------------------------------|
| Auth             | POST /user/send-otp                    | user.routes → sendOTP                |
| Auth             | POST /user/verify-otp                  | user.routes → verifyOTP              |
| Products         | GET /products/getproduct               | product.routes → getProduct          |
| Products         | POST /products/addproduct              | product.routes → addProduct          |
| Products         | PUT /products/updateproduct/:id        | product.routes → updateProduct       |
| Products         | DELETE /products/removeproduct/:id     | product.routes → deleteProduct       |
| Products         | POST /products/:id/upload-image        | product.routes → uploadProductImage  |
| Products         | DELETE /products/:id/delete-image      | product.routes → deleteProductImage  |
| Products         | PUT /products/:id/marathi-name         | product.routes → updateMarathiName   |
| Products         | PUT /products/:id/unit                 | product.routes → updateDefaultUnit   |
| Transactions     | POST /transactions/billing             | transaction.routes → billing         |
| Transactions     | GET /transactions/daily                | transaction.routes → getDailyTxns    |
| Transactions     | GET /transactions/summary              | transaction.routes → getDailySummary |
| Transactions     | PATCH /transactions/rollback/:id       | transaction.routes → rollback        |
| Finance          | GET /finance/summary                   | finance.routes → getFinanceSummary   |
| Suppliers        | GET /suppliers                         | supplier.routes → getAll             |
| Suppliers        | POST /suppliers                        | supplier.routes → create             |
| Suppliers        | DELETE /suppliers/:id                  | supplier.routes → archive            |
| Suppliers        | POST /suppliers/map-product            | supplier.routes → mapProductSupplier |
| Purchase Orders  | GET /purchase-orders                   | purchaseOrder.routes → getPending    |
| Purchase Orders  | PATCH /purchase-orders/:id/approve     | purchaseOrder.routes → approveOrder  |
| Purchase Orders  | PATCH /purchase-orders/:id/reject      | purchaseOrder.routes → rejectOrder   |
| Purchase Orders  | PATCH /purchase-orders/items/:id       | purchaseOrder.routes → updateItem    |
| Email            | POST /email/low-stock                  | email.routes → sendLowStockEmail     |

---

## Error Handling

### extractError(err) — src/utils/extractError.js
Converts any thrown error into a human-readable string. Handles:
- Axios network errors → "Network error — check your internet connection."
- express-validator arrays { errors: [{ msg }] } → joins all messages
- Standard backend format { message } or { error }
- HTTP status fallbacks: 400 / 401 / 403 / 404 / 409 / 422 / 5xx

### Toast notifications — src/components/Toast.jsx
Replaces all alert() calls:
```js
const toast = useToast();
toast.success("Done!");
toast.error("Something went wrong.");
toast.warn("Please fill in all fields.");
toast.info("Order submitted for review.");
```
Auto-dismisses after 4s (errors after 6s). Accessible via aria-live.

### Offline detection — src/components/OfflineBanner.jsx
Listens to window online/offline events. Shows a fixed red banner at the top
of the screen automatically — no configuration needed.

### useApiData hook — src/hooks/useApiData.js
```js
const { data, loading, error, refresh } = useApiData(getProducts, []);
```
- error is a human-readable string (via extractError) or null
- refresh re-fires the fetch manually (e.g. after a mutation)
- Pages render {error && <div className="error-banner">⚠️ {error}</div>}

---

## Changes from Original

### Bug fixes
- 14 API endpoint paths corrected to match the backend
- Duplicate /financials route removed from App.js
- Duplicate "financials" sidebar entry removed from Layout

### Architecture
- api/endpoints.js — single file for all API calls
- AuthContext + ProtectedRoute — JWT state management and route guards
- useApiData hook — eliminates repetitive fetch boilerplate across pages

### Error handling
- Removed all alert() calls (7 instances) — replaced with toast notifications
- Removed all silent catch {} blocks — every failure surfaces to the user
- Removed console.error-only catches — Inventory debounce now shows toast + reverts
- extractError handles express-validator arrays the old code ignored entirely
- Every page shows an inline error-banner if its initial data load fails
- OfflineBanner detects network loss globally

### UX
- Buttons show loading state and are disabled while in-flight (no double-submit)
- Rollback button shows "Rolling back..." text during the request
- Inventory edits debounced at 600ms to avoid API flooding on every keystroke
