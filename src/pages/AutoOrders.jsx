import React, { useCallback } from "react";
import {
  getPendingOrders,
  getProducts,
  approveOrder,
  rejectOrder,
  updateOrderItem,
} from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./AutoOrders.css";

export default function AutoOrders() {
  const ordersFn   = useCallback(getPendingOrders, []);
  const productsFn = useCallback(getProducts, []);

  const { data: orders   = [], loading: ordersLoading,   error: ordersError,   refresh: refreshOrders } = useApiData(ordersFn,   []);
  const { data: products = [], loading: productsLoading }                                               = useApiData(productsFn, []);
  const toast = useToast();

  const getPrice = (productId) =>
    Number(products.find((p) => p.id === productId)?.price ?? 0);

  const calcTotal = (items) =>
    items.reduce((s, it) => s + Number(it.qty) * getPrice(it.product_id), 0).toFixed(2);

  const handleApprove = async (id) => {
    try {
      const res = await approveOrder(id);
      toast.success(res.data.message ?? "Order approved.");
      refreshOrders();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectOrder(id);
      toast.info("Order rejected.");
      refreshOrders();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleQtyUpdate = async (itemId, qty) => {
    try {
      await updateOrderItem(itemId, qty);
      toast.success("Quantity updated.");
      refreshOrders();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  if (ordersLoading || productsLoading)
    return (
      <div className="orders-page">
        <h2 className="page-title">Auto Generated Orders</h2>
        <p style={{ textAlign: "center", marginTop: 40 }}>Loading orders…</p>
      </div>
    );

  if (ordersError)
    return (
      <div className="orders-page">
        <h2 className="page-title">Auto Generated Orders</h2>
        <div className="error-banner">⚠️ {ordersError}</div>
      </div>
    );

  if (!orders.length)
    return (
      <div className="orders-page">
        <h2 className="page-title">Auto Generated Orders</h2>
        <p style={{ textAlign: "center", marginTop: 40 }}>No pending orders.</p>
      </div>
    );

  return (
    <div className="orders-page">
      <h2 className="page-title">Auto Generated Orders</h2>

      {orders.map((order) => (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <span className="order-id">
              Order #{order.id}
              {order.PurchaseOrderItems?.[0]?.Supplier &&
                ` — ${order.PurchaseOrderItems[0].Supplier.name}`}
            </span>
            <span className="order-total">
              Total: ₹{calcTotal(order.PurchaseOrderItems ?? [])}
            </span>
          </div>

          <table className="order-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Current Stock</th>
                <th>Suggested Qty</th>
                <th>Edit Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.PurchaseOrderItems?.map((item) => (
                <tr key={item.id}>
                  <td>{item.Product?.name}</td>
                  <td>₹{getPrice(item.product_id)}</td>
                  <td className="stock">{item.Product?.quantity}</td>
                  <td className="suggested">{item.qty}</td>
                  <td>
                    <input
                      type="number"
                      defaultValue={item.qty}
                      className="qty-input"
                      onBlur={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          handleQtyUpdate(item.id, parsed);  // must be integer not string
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="order-actions">
            <button className="approve-btn" onClick={() => handleApprove(order.id)}>
              Approve Order
            </button>
            <button className="reject-btn" onClick={() => handleReject(order.id)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
