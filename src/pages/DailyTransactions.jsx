import React, { useCallback, useState } from "react";
import { getDailyTransactions, rollbackTransaction } from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Billing.css";

export default function DailyTransactions() {
  const fetchFn = useCallback(getDailyTransactions, []);
  const { data: transactions = [], loading, error, refresh } = useApiData(fetchFn, []);
  const [rollingBack, setRollingBack] = useState(null); // id of row being rolled back
  const toast = useToast();

  const handleRollback = async (id) => {
    if (!window.confirm("Rollback this transaction?")) return;
    setRollingBack(id);
    try {
      await rollbackTransaction(id);
      toast.success("Transaction rolled back.");
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <div className="billing-container">
      <h1 className="page-title">Daily Transactions</h1>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading ? (
        <p className="text-center">Loading transactions…</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Total Amount</th>
                <th>Profit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No transactions found for today
                  </td>
                </tr>
              ) : (
                transactions.map((txn, index) => (
                  <tr key={txn.id ?? index}>
                    <td>{txn.id}</td>
                    <td>{new Date(txn.date).toLocaleDateString("en-IN")}</td>
                    <td>{txn.itemsPurchased}</td>
                    <td>{txn.quantity}</td>
                    <td>₹{Number(txn.totalAmount).toFixed(2)}</td>
                    <td style={{ color: txn.profit >= 0 ? "green" : "red", fontWeight: 600 }}>
                      ₹{Number(txn.profit).toFixed(2)}
                    </td>
                    <td>
                      {txn.isReversed ? (
                        <span style={{ color: "gray", fontWeight: 600 }}>Reversed</span>
                      ) : (
                        <button
                          className="danger-btn"
                          onClick={() => handleRollback(txn.id)}
                          disabled={rollingBack === txn.id}
                        >
                          {rollingBack === txn.id ? "Rolling back…" : "Rollback"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
