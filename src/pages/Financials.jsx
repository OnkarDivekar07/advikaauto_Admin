import React, { useCallback } from "react";
import { getFinanceSummary } from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import "./Financials.css";

function Card({ label, value, cls }) {
  return (
    <div className={`finance-card ${cls}`}>
      <p className="label">{label}</p>
      <h2>₹{Number(value ?? 0).toLocaleString("en-IN")}</h2>
    </div>
  );
}

export default function Financials() {
  const fetchFn = useCallback(getFinanceSummary, []);
  const { data, loading, error } = useApiData(fetchFn);

  return (
    <div className="finance-page">
      <h1 className="finance-title">Financials</h1>

      {loading && <p className="loading">Loading finance…</p>}
      {error   && <div className="error-banner">⚠️ {error}</div>}

      {!loading && !error && (
        <div className="finance-grid">
          <Card label="Cash Transactions"   value={data?.cashTotal}   cls="cash"   />
          <Card label="Online Transactions" value={data?.onlineTotal} cls="online" />
        </div>
      )}
    </div>
  );
}
