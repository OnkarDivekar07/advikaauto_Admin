import React, { useState, useEffect, useCallback } from "react";
import {
  getProducts,
  getDailySummary,
  submitBilling,
  sendLowStockEmail,
} from "../api/endpoints";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Billing.css";

const EMPTY_ITEM = () => ({ productId: "", item_name: "", quantity: 1, price: 0, total: 0 });

function MetricCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <div className="amount">₹{Number(value ?? 0).toFixed(2)}</div>
    </div>
  );
}

export default function Billing() {
  const [items, setItems]               = useState([EMPTY_ITEM()]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [products, setProducts]         = useState([]);
  const [metrics, setMetrics]           = useState({});
  const [submitting, setSubmitting]     = useState(false);
  const toast = useToast();

  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    const [prodResult, metricResult] = await Promise.allSettled([
      getProducts(),
      getDailySummary(),
    ]);
    if (prodResult.status === "fulfilled") {
      // Unwrap envelope: res.data = { success, message, data: <payload>, meta }
      setProducts(prodResult.value.data?.data ?? []);
    } else {
      setLoadError("Could not load products — " + extractError(prodResult.reason));
    }
    if (metricResult.status === "fulfilled") {
      setMetrics(metricResult.value.data?.data ?? {});
    }
    // metric failure is non-critical — metrics just show 0
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateItem = (index, patch) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      const { quantity, price } = next[index];
      next[index].total = Number(quantity) * Number(price);
      return next;
    });
  };

  const handleProductSelect = (index, name) => {
    const product = products.find((p) => p.name === name);
    updateItem(index, {
      item_name: name,
      productId: product?.id ?? "",
      price:     product?.price ?? 0,
      total:     (items[index].quantity ?? 1) * (product?.price ?? 0),
    });
  };

  const addItem    = () => setItems((prev) => [...prev, EMPTY_ITEM()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const validItems = items.filter(
    (it) => it.productId && Number(it.quantity) > 0 && Number(it.price) > 0
  );
  const grandTotal = validItems.reduce((s, it) => s + it.total, 0);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validItems.length) {
      toast.warn("Please add at least one valid item.");
      return;
    }
    setSubmitting(true);
    try {
      // Backend expects a flat array where:
      //   - Every element except the last is a billing item:
      //     { productId, item_name, quantity, price, total }
      //   - The LAST element is the summary:
      //     { total_amount, payment_method }
      // See: transaction.service.js → billing()
      //   summary = billingData[billingData.length - 1]
      //   validItems = billingData.filter(item => item.item_name)
      const payload = [
        ...validItems.map(({ productId, item_name, quantity, price, total }) => ({
          productId,
          item_name,  // required — backend filters by this to find valid items
          quantity,
          price,
          total,      // required — stored as totalAmount per transaction row
        })),
        {
          total_amount:   grandTotal,
          payment_method: paymentMethod,
        },
      ];

      await submitBilling(payload);
      toast.success("Transaction submitted!");
      setItems([EMPTY_ITEM()]);
      setPaymentMethod("cash");
      loadData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      await sendLowStockEmail();
      toast.success("Low-stock email sent!");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  // ── Shared row renderer ───────────────────────────────────────────────────
  const renderRow = (item, index, mobile = false) => (
    <React.Fragment key={index}>
      {mobile ? (
        <div className="mobile-card">
          {items.length > 1 && (
            <button className="mobile-remove" onClick={() => removeItem(index)}>❌</button>
          )}
          <label>Item Name</label>
          <input
            list="productList"
            value={item.item_name}
            onChange={(e) => handleProductSelect(index, e.target.value)}
          />
          <label>Quantity</label>
          <input
            type="number" min="1"
            value={item.quantity}
            onChange={(e) => updateItem(index, { quantity: +e.target.value })}
          />
          <label>Price (₹)</label>
          <input
            type="number" min="0"
            value={item.price}
            onChange={(e) => updateItem(index, { price: +e.target.value })}
          />
          <div className="mobile-total">Total: ₹{item.total.toFixed(2)}</div>
          <hr />
        </div>
      ) : (
        <tr>
          <td>
            <input
              list="productList"
              value={item.item_name}
              onChange={(e) => handleProductSelect(index, e.target.value)}
            />
          </td>
          <td>
            <input
              type="number" min="1"
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: +e.target.value })}
            />
          </td>
          <td>
            <input
              type="number" min="0"
              value={item.price}
              onChange={(e) => updateItem(index, { price: +e.target.value })}
            />
          </td>
          <td>₹{item.total.toFixed(2)}</td>
          <td>
            <button className="danger-btn" onClick={() => removeItem(index)}>Remove</button>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  const PaymentOptions = ({ name }) => (
    <div className="payment-radio">
      {["cash", "online"].map((m) => (
        <label key={m} className={`radio-btn ${paymentMethod === m ? "active" : ""}`}>
          <input
            type="radio"
            name={name}
            checked={paymentMethod === m}
            onChange={() => setPaymentMethod(m)}
          />
          {m === "cash" ? "💵 Cash" : "💳 Online"}
        </label>
      ))}
    </div>
  );

  return (
    <div className="billing-container">
      <h1 className="page-title">Billing Dashboard</h1>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      {/* Metrics */}
      <div className="stats">
        <MetricCard title="Daily Sales"    value={metrics.dailySales} />
        <MetricCard title="Daily Profit"   value={metrics.dailyProfit} />
        <MetricCard title="Monthly Sales"  value={metrics.monthlySales} />
        <MetricCard title="Monthly Profit" value={metrics.monthlyProfit} />
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="success-btn" onClick={handleSendEmail}>
          📧 Send Low-Stock Email
        </button>
      </div>

      {/* Desktop table */}
      <div className="table-wrapper desktop-only">
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th>
            </tr>
          </thead>
          <tbody>{items.map((item, i) => renderRow(item, i, false))}</tbody>
        </table>
        <button className="primary-btn" style={{ marginTop: 16 }} onClick={addItem}>
          + Add Item
        </button>
      </div>

      {/* Mobile cards */}
      <div className="mobile-only">
        {items.map((item, i) => renderRow(item, i, true))}
        <button className="primary-btn" style={{ width: "100%", marginTop: 10 }} onClick={addItem}>
          + Add Item
        </button>
        <PaymentOptions name="payment-mobile" />
        <button
          className="success-btn"
          style={{ width: "100%", marginTop: 15 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit Transaction"}
        </button>
      </div>

      {/* Desktop summary */}
      <div className="summary desktop-only">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
        <div className="grand-total">Grand Total: ₹{grandTotal.toFixed(2)}</div>
        <PaymentOptions name="payment-desktop" />
        <div className="footer-actions">
          <button className="success-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Transaction"}
          </button>
        </div>
      </div>

      <datalist id="productList">
        {products.map((p) => <option key={p.id} value={p.name} />)}
      </datalist>
    </div>
  );
}
