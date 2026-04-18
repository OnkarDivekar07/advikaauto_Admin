import React, { useState, useCallback, useEffect } from "react";
import {
  getFinanceSummary,
  getMissingItems,
  getAllCustomerCounts,
} from "../api/endpoints";
import {
  getRankingCategories,
  getInventoryDistribution,
  getAnalyticsSnapshot,
  saveAnalyticsSnapshot,
  getRankings,
  getExpenseSummary,
  getExpenseProfitLoss,
} from "../api/analyticsEndpoints";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Analytics.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => Number(v ?? 0).toLocaleString("en-IN");
const fmtCr = (v) => `₹${fmt(v)}`;
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

// ─── Trend badge ─────────────────────────────────────────────────────────────
function Trend({ current, previous, isCurrency = false, invertGreen = false }) {
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = ((diff / Math.abs(previous)) * 100).toFixed(1);
  const isUp = diff > 0;
  // invertGreen = true means UP is bad (e.g. expenses)
  const isGood = invertGreen ? !isUp : isUp;
  return (
    <span className={`trend-badge ${isGood ? "trend-up" : "trend-down"}`}>
      {isUp ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, prev, subLabel, accent, invertGreen = false, icon }) {
  return (
    <div className={`kpi-card ${accent || ""}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <h2 className="kpi-value">{value}</h2>
        {subLabel && <p className="kpi-sub">{subLabel}</p>}
        <Trend current={parseFloat(value?.replace(/[₹,]/g, "") || 0)} previous={prev} invertGreen={invertGreen} />
      </div>
    </div>
  );
}

// ─── Inventory Segment Bar ────────────────────────────────────────────────────
function SegmentBar({ fast, slow, nonMoving }) {
  const total = fast + slow + nonMoving || 1;
  return (
    <div className="segment-bar">
      <div className="seg-fast"   style={{ width: `${(fast / total) * 100}%` }} title={`Fast ${fmtPct((fast / total) * 100)}`} />
      <div className="seg-slow"   style={{ width: `${(slow / total) * 100}%` }} title={`Slow ${fmtPct((slow / total) * 100)}`} />
      <div className="seg-nonmov" style={{ width: `${(nonMoving / total) * 100}%` }} title={`Non-moving ${fmtPct((nonMoving / total) * 100)}`} />
    </div>
  );
}

// ─── Inventory Distribution Row ───────────────────────────────────────────────
function InventoryRow({ label, accent, value, pct, salesValue, salesPct, count, prevValue, prevPct }) {
  return (
    <div className={`inv-row ${accent}`}>
      <div className="inv-label-col">
        <span className={`inv-dot dot-${accent}`} />
        <span className="inv-label">{label}</span>
        <span className="inv-count">{count} items</span>
      </div>
      <div className="inv-metric">
        <p className="inv-metric-val">{fmtCr(value)}</p>
        <p className="inv-metric-sub">Stock Value</p>
        <Trend current={value} previous={prevValue} />
      </div>
      <div className="inv-metric">
        <p className="inv-metric-val">{fmtPct(pct)}</p>
        <p className="inv-metric-sub">% of Inventory</p>
        <Trend current={pct} previous={prevPct} />
      </div>
      <div className="inv-metric">
        <p className="inv-metric-val">{fmtCr(salesValue)}</p>
        <p className="inv-metric-sub">Sales Revenue</p>
      </div>
      <div className="inv-metric">
        <p className="inv-metric-val">{fmtPct(salesPct)}</p>
        <p className="inv-metric-sub">% of Sales</p>
      </div>
    </div>
  );
}

// ─── Product List (top 30) ────────────────────────────────────────────────────
function ProductList({ items, title, accent }) {
  return (
    <div className={`product-list-card ${accent}`}>
      <h3 className="pl-title">{title}</h3>
      <div className="pl-list">
        {items.slice(0, 30).map((p, i) => (
          <div key={p.id} className="pl-item">
            <span className="pl-rank">#{i + 1}</span>
            <span className="pl-name">{p.name}</span>
            {p.marathiName && <span className="pl-marathi">{p.marathiName}</span>}
            <span className="pl-sales">{p.salesCount} sales</span>
          </div>
        ))}
        {items.length === 0 && <p className="pl-empty">No data yet</p>}
      </div>
    </div>
  );
}

// ─── Customer Monthly Chart ───────────────────────────────────────────────────
function CustomerChart({ history }) {
  if (!history || history.length === 0) return <p className="empty-state">No customer data yet.</p>;

  // Group by month
  const byMonth = {};
  history.forEach((entry) => {
    const d = new Date(entry.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { count: 0, days: 0 };
    byMonth[key].count += entry.count;
    byMonth[key].days += 1;
  });

  const months = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  const maxCount = Math.max(...months.map(([, v]) => v.count), 1);

  return (
    <div className="customer-chart">
      {months.map(([key, val]) => {
        const [year, month] = key.split("-");
        const label = new Date(year, month - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        const barH = Math.max(4, (val.count / maxCount) * 120);
        const avg = val.days > 0 ? (val.count / val.days).toFixed(1) : 0;
        return (
          <div key={key} className="cust-bar-col">
            <span className="cust-val">{val.count}</span>
            <div className="cust-bar" style={{ height: `${barH}px` }} title={`Avg/day: ${avg}`} />
            <span className="cust-avg">avg {avg}</span>
            <span className="cust-month">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Missing Items Table ──────────────────────────────────────────────────────
function MissingItemsPanel({ items }) {
  const high = items.filter((i) => (i.requestCount || 0) > 3).sort((a, b) => b.requestCount - a.requestCount);
  if (high.length === 0) return <p className="empty-state">No items with 3+ requests.</p>;
  return (
    <div className="missing-table">
      <div className="missing-header">
        <span>Item</span>
        <span>Requests</span>
        <span>Priority</span>
      </div>
      {high.map((item) => {
        const count = item.requestCount || 0;
        const priority = count >= 10 ? "Critical" : count >= 6 ? "High" : "Medium";
        const pClass = count >= 10 ? "prio-critical" : count >= 6 ? "prio-high" : "prio-medium";
        return (
          <div key={item.id} className="missing-item-row">
            <span className="mi-name">{item.name}</span>
            <span className="mi-count">🔁 {count}</span>
            <span className={`mi-priority ${pClass}`}>{priority}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const toast = useToast();

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [data,    setData]      = useState(null);
  const [prev,    setPrev]      = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [finance, dist, cats, rankings, customers, missing, expenses, profitLoss, snapshot] =
        await Promise.allSettled([
          getFinanceSummary(),
          getInventoryDistribution(),
          getRankingCategories(),
          getRankings(),
          getAllCustomerCounts(),
          getMissingItems(),
          getExpenseSummary(),
          getExpenseProfitLoss(),
          getAnalyticsSnapshot(),
        ]);

      const safe = (r, fallback = null) => (r.status === "fulfilled" ? r.value?.data?.data ?? r.value?.data ?? fallback : fallback);

      setData({
        finance:    safe(finance, {}),
        dist:       safe(dist, {}),
        cats:       safe(cats, {}),
        rankings:   safe(rankings, []),
        customers:  safe(customers, []),
        missing:    safe(missing, []),
        expenses:   safe(expenses, {}),
        profitLoss: safe(profitLoss, {}),
      });

      const snapshotData = safe(snapshot, null);
      if (snapshotData) {
        // Get previous month's snapshot
        const thisMonth = new Date().toISOString().slice(0, 7);
        const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
        setPrev(snapshotData[prevMonth] ?? null);
      }
    } catch (err) {
      toast.error(`Analytics error: ${extractError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSaveSnapshot = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const snapshot = {
        month: thisMonth,
        operatingExpense: data.expenses?.total ?? 0,
        monthlyProfit: data.profitLoss?.netProfit ?? 0,
        totalSales: data.finance?.grandTotal ?? 0,
        fastMovingValue: data.dist?.fastMoving?.totalStockValue ?? 0,
        fastMovingPct: data.dist?.fastMoving?.percentageOfStockValue ?? 0,
        slowMovingValue: data.dist?.slowMoving?.totalStockValue ?? 0,
        slowMovingPct: data.dist?.slowMoving?.percentageOfStockValue ?? 0,
        nonMovingValue: data.dist?.nonMoving?.totalStockValue ?? 0,
        nonMovingPct: data.dist?.nonMoving?.percentageOfStockValue ?? 0,
      };
      await saveAnalyticsSnapshot(snapshot);
      toast.success(`Snapshot saved for ${thisMonth}`);
    } catch (err) {
      toast.error(`Failed to save snapshot: ${extractError(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner" />
        <p>Loading analytics…</p>
      </div>
    );
  }

  const { finance = {}, dist = {}, cats = {}, rankings = [], customers = [], missing = [], expenses = {}, profitLoss = {} } = data || {};

  const fastItems = rankings.filter((p) => p.category === "fast-moving");
  const slowItems = rankings.filter((p) => p.category === "slow-moving");
  const nonItems  = rankings.filter((p) => p.category === "non-moving");

  const thisMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="analytics-page">
      {/* ── Page Header ────────────────────────────── */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-sub">{thisMonth} · Store Performance Overview</p>
        </div>
        <button
          className="snapshot-btn"
          onClick={handleSaveSnapshot}
          disabled={saving}
          title="Save this month's data for future comparison"
        >
          {saving ? "Saving…" : "📸 Save Monthly Snapshot"}
        </button>
      </div>

      {/* ── Row 1: Top KPIs ────────────────────────── */}
      <section className="kpi-row">
        <KpiCard
          icon="💸"
          label="Operating Expenses"
          value={fmtCr(expenses?.total ?? 0)}
          prev={prev?.operatingExpense}
          subLabel={`Purchase: ${fmtCr(expenses?.breakdown?.purchase ?? 0)} · Transport: ${fmtCr(expenses?.breakdown?.transport ?? 0)}`}
          accent="accent-red"
          invertGreen={true}
        />
        <KpiCard
          icon="📈"
          label="Monthly Profit"
          value={fmtCr(profitLoss?.netProfit ?? 0)}
          prev={prev?.monthlyProfit}
          subLabel={`Revenue: ${fmtCr(profitLoss?.revenue ?? 0)} · Expenses: ${fmtCr(profitLoss?.expenses ?? 0)}`}
          accent="accent-green"
        />
        <KpiCard
          icon="🛒"
          label="Total Sales"
          value={fmtCr(finance?.grandTotal ?? 0)}
          prev={prev?.totalSales}
          subLabel={`Cash: ${fmtCr(finance?.cashTotal ?? 0)} · Online: ${fmtCr(finance?.onlineTotal ?? 0)}`}
          accent="accent-blue"
        />
      </section>

      {/* ── Row 2: Inventory Distribution ─────────── */}
      <section className="analytics-section">
        <SectionHeader
          title="Inventory Distribution"
          sub={`Total stock value: ${fmtCr(dist?.overall?.totalStockValue ?? 0)} across ${dist?.overall?.totalProducts ?? 0} products`}
        />
        <SegmentBar
          fast={dist?.fastMoving?.totalStockValue ?? 0}
          slow={dist?.slowMoving?.totalStockValue ?? 0}
          nonMoving={dist?.nonMoving?.totalStockValue ?? 0}
        />
        <div className="seg-legend">
          <span><span className="leg-dot dot-fast" />Fast-moving</span>
          <span><span className="leg-dot dot-slow" />Slow-moving</span>
          <span><span className="leg-dot dot-nonmov" />Non-moving</span>
        </div>
        <div className="inv-rows">
          <InventoryRow
            label="Fast-moving"
            accent="fast"
            value={dist?.fastMoving?.totalStockValue ?? 0}
            pct={dist?.fastMoving?.percentageOfStockValue ?? 0}
            salesValue={dist?.fastMoving?.totalSalesValue ?? 0}
            salesPct={dist?.fastMoving?.percentageOfSalesValue ?? 0}
            count={dist?.fastMoving?.productCount ?? 0}
            prevValue={prev?.fastMovingValue}
            prevPct={prev?.fastMovingPct}
          />
          <InventoryRow
            label="Slow-moving"
            accent="slow"
            value={dist?.slowMoving?.totalStockValue ?? 0}
            pct={dist?.slowMoving?.percentageOfStockValue ?? 0}
            salesValue={dist?.slowMoving?.totalSalesValue ?? 0}
            salesPct={dist?.slowMoving?.percentageOfSalesValue ?? 0}
            count={dist?.slowMoving?.productCount ?? 0}
            prevValue={prev?.slowMovingValue}
            prevPct={prev?.slowMovingPct}
          />
          <InventoryRow
            label="Non-moving"
            accent="nonmov"
            value={dist?.nonMoving?.totalStockValue ?? 0}
            pct={dist?.nonMoving?.percentageOfStockValue ?? 0}
            salesValue={dist?.nonMoving?.totalSalesValue ?? 0}
            salesPct={dist?.nonMoving?.percentageOfSalesValue ?? 0}
            count={dist?.nonMoving?.productCount ?? 0}
            prevValue={prev?.nonMovingValue}
            prevPct={prev?.nonMovingPct}
          />
        </div>
      </section>

      {/* ── Row 3: Top 30 Fast & Slow ─────────────── */}
      <section className="analytics-section">
        <SectionHeader title="Product Rankings" sub="Top 30 fast-moving vs slow-moving items by sales frequency" />
        <div className="dual-list">
          <ProductList title="🚀 Top 30 Fast-Moving" items={fastItems} accent="fast-list" />
          <ProductList title="🐢 Top 30 Slow-Moving" items={slowItems} accent="slow-list" />
        </div>
      </section>

      {/* ── Row 4: Customers ──────────────────────── */}
      <section className="analytics-section">
        <SectionHeader title="Customer Traffic" sub="Monthly footfall and daily average basket size" />
        <CustomerChart history={customers} />
      </section>

      {/* ── Row 5: Missing Items ──────────────────── */}
      <section className="analytics-section">
        <SectionHeader
          title="High-Demand Missing Items"
          sub="Items requested by customers more than 3 times — consider stocking"
        />
        <MissingItemsPanel items={missing} />
      </section>
    </div>
  );
}
