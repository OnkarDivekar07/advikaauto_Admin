import React, { useState, useCallback } from "react";
import {
  getTodayCustomerCount,
  getAllCustomerCounts,
  updateCustomerCount,
} from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./CustomerCount.css";

export default function CustomerCount() {
  const todayFn   = useCallback(getTodayCustomerCount, []);
  const historyFn = useCallback(getAllCustomerCounts, []);

  const { data: todayData, refresh: refreshToday }     = useApiData(todayFn);
  const { data: history = [], error: historyError }    = useApiData(historyFn, []);
  const toast = useToast();

  const [updating, setUpdating] = useState(false);

  const count = todayData?.count ?? 0;

  const handleUpdate = async (change) => {
    setUpdating(true);
    try {
      await updateCustomerCount(change);
      refreshToday();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="customer-count-page">
      <h1 className="page-title">Customer Count</h1>

      {/* Today's live counter */}
      <div className="counter-card">
        <p className="counter-label">Today's Customers</p>
        <div className="counter-display">{count}</div>
        <div className="counter-controls">
          <button
            className="counter-btn decrement"
            onClick={() => handleUpdate(-1)}
            disabled={updating || count === 0}
          >
            −
          </button>
          <button
            className="counter-btn increment"
            onClick={() => handleUpdate(1)}
            disabled={updating}
          >
            +
          </button>
        </div>
        <p className="counter-hint">Tap + when a customer enters, − to correct.</p>
      </div>

      {/* History */}
      {historyError && <div className="error-banner">⚠️ {historyError}</div>}

      {history.length > 0 && (
        <div className="count-history">
          <h3>Recent History</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customers</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map((entry) => (
                  <tr key={entry.id ?? entry.date}>
                    <td>
                      {new Date(entry.date).toLocaleDateString("en-IN", {
                        weekday: "short", day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td><strong>{entry.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
