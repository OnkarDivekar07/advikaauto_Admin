import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  getProfitFirstSummary,
  saveProfitFirstEntry,
  getProfitFirstMonths,
} from "../api/endpoints";
import "./Financials.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const pct = (actual, target) => {
  if (!target || !actual) return null;
  return Math.round((actual / target) * 100);
};

const deltaClass = (actual, target, invertGood) => {
  if (actual == null || !target) return "";
  if (actual > target) return invertGood ? "pf-good" : "pf-bad";
  if (actual < target) return invertGood ? "pf-bad" : "pf-good";
  return "pf-ok";
};

const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString("en-IN", { month: "long", year: "numeric" });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function PFCard({
  title, subtitle, target, actual,
  accentColor = "#6366f1",
  invertGood = false,
  editable = false,
  onSave,
  note,
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");

  const startEdit = () => {
    setDraft(actual != null ? String(actual) : "");
    setEditing(true);
  };

  const handleSave = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && onSave) onSave(val);
    setEditing(false);
  };

  const cls = actual != null ? deltaClass(actual, target, invertGood) : "";
  const p   = pct(actual, target);

  return (
    <div className="pf-card" style={{ borderLeftColor: accentColor }}>
      <div className="pf-card-head">
        <div>
          <p className="pf-card-title">{title}</p>
          <p className="pf-card-subtitle">{subtitle}</p>
        </div>
        {editable && (
          <button className="pf-edit-btn" onClick={editing ? handleSave : startEdit}>
            {editing ? "Save" : "Edit"}
          </button>
        )}
      </div>

      <div className="pf-row">
        <span className="pf-row-label">Target</span>
        <span className="pf-row-value">{fmt(target)}</span>
      </div>

      <div className={`pf-row ${cls}`}>
        <span className="pf-row-label">Actual</span>
        {editing ? (
          <input
            className="pf-inline-input"
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
          />
        ) : (
          <span className="pf-row-value pf-actual">
            {fmt(actual)}
            {p != null && (
              <span className={`pf-badge ${cls}`}>{p}%</span>
            )}
          </span>
        )}
      </div>

      {actual != null && target != null && (
        <div className={`pf-delta ${cls}`}>
          {actual > target
            ? `▲ ${fmt(actual - target)} above target`
            : actual < target
            ? `▼ ${fmt(target - actual)} below target`
            : "✓ On target"}
        </div>
      )}

      {note && <p className="pf-note">{note}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Financials() {
  // Compute once — stable across renders, no dependency issues
  const currentKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentKey);
  const [months,        setMonths]        = useState([currentKey]);
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);

  // Load available months for the filter dropdown
  useEffect(() => {
    getProfitFirstMonths()
      .then(res => {
        const list = res.data?.data ?? [];
        const merged = list.includes(currentKey) ? list : [currentKey, ...list];
        setMonths(merged);
      })
      .catch(() => {});
  }, [currentKey]);

  // Load summary whenever month changes
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfitFirstSummary(selectedMonth);
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load financials");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (field, value) => {
    if (!data) return;
    setSaving(true);
    try {
      const payload = {
        profit_actual:         field === "profit"         ? value : (data.profit?.actual         ?? 0),
        emergency_fund_actual: field === "emergency_fund" ? value : (data.emergency_fund?.actual ?? 0),
        owners_pay_actual:     field === "owners_pay"     ? value : (data.owners_pay?.actual     ?? 0),
      };
      await saveProfitFirstEntry(selectedMonth, payload);
      await load();
    } catch {
      // silent — values revert on next load
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-page">
      {/* ── Header ── */}
      <div className="pf-header">
        <div>
          <h1 className="pf-title">Profit First</h1>
          <p className="pf-tagline">Based on the Profit First framework — allocate before you spend.</p>
        </div>
        <select
          className="pf-month-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {months.map(k => (
            <option key={k} value={k}>{monthLabel(k)}</option>
          ))}
        </select>
      </div>

      {loading && <p className="pf-loading">Loading…</p>}
      {error   && <div className="pf-error">⚠️ {error}</div>}
      {saving  && <p className="pf-saving">Saving…</p>}

      {!loading && !error && data && (
        <>
          {/* ── Sales ── */}
          <div className="pf-section-label">Revenue</div>
          <div className="pf-grid pf-grid-1">
            <div className="pf-card pf-card-sales" style={{ borderLeftColor: "#0ea5e9" }}>
              <p className="pf-card-title">Sales of the Month</p>
              <h2 className="pf-sales-value">{fmt(data.sales)}</h2>
              <p className="pf-card-subtitle">
                Real Revenue (Sales − 60% COGS target): <strong>{fmt(data.realRevenue)}</strong>
              </p>
            </div>
          </div>

          {/* ── COGS ── */}
          <div className="pf-section-label">Cost of Goods</div>
          <div className="pf-grid pf-grid-1">
            <PFCard
              title="Cost of Goods Sold"
              subtitle="Target: 60% of Sales"
              target={data.cogs?.target}
              actual={data.cogs?.actual}
              accentColor="#f59e0b"
              invertGood={true}
              note="Purchases entered via Expenses → Purchase. Higher than 60% = buying too much relative to sales."
            />
          </div>

          {/* ── OpEx ── */}
          <div className="pf-section-label">Operating Expenses</div>
          <div className="pf-grid pf-grid-2">
            <PFCard
              title="OpEx — Purchases"
              subtitle="Inventory buying budget"
              target={data.cogs?.target}
              actual={data.opex_purchase?.actual}
              accentColor="#f59e0b"
              invertGood={true}
              note="Money available to buy inventory (same as COGS). Do not include transport or misc here."
            />
            <PFCard
              title="OpEx — Other"
              subtitle="Target: 40% of Real Revenue"
              target={data.opex_other?.target}
              actual={data.opex_other?.actual}
              accentColor="#ec4899"
              invertGood={true}
              note="Transport + Miscellaneous expenses. Keep within 40% of Real Revenue."
            />
          </div>

          {/* ── Manual buckets ── */}
          <div className="pf-section-label">
            Profit Allocation Buckets{" "}
            <span className="pf-manual-tag">manually confirmed</span>
          </div>
          <div className="pf-grid pf-grid-3">
            <PFCard
              title="Profit"
              subtitle="Target: 15% of Real Revenue"
              target={data.profit?.target}
              actual={data.profit?.actual}
              accentColor="#22c55e"
              invertGood={false}
              editable={selectedMonth === currentKey}
              onSave={val => handleSave("profit", val)}
              note="Transfer this amount to a separate Profit account first, then operate on what remains."
            />
            <PFCard
              title="Emergency Fund"
              subtitle="Target: 15% of Real Revenue"
              target={data.emergency_fund?.target}
              actual={data.emergency_fund?.actual}
              accentColor="#6366f1"
              invertGood={false}
              editable={selectedMonth === currentKey}
              onSave={val => handleSave("emergency_fund", val)}
              note="Business safety net — 3 months of OpEx is the ideal target amount over time."
            />
            <PFCard
              title="Owner's Pay"
              subtitle="Target: 30% of Real Revenue"
              target={data.owners_pay?.target}
              actual={data.owners_pay?.actual}
              accentColor="#8b5cf6"
              invertGood={false}
              editable={selectedMonth === currentKey}
              onSave={val => handleSave("owners_pay", val)}
              note="Pay yourself first. This is not a bonus — it is your planned compensation."
            />
          </div>
        </>
      )}
    </div>
  );
}
