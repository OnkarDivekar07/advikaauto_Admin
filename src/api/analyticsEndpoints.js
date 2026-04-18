/**
 * Analytics-specific API calls.
 * Snapshot storage uses localStorage so snapshots persist across sessions
 * without requiring a backend migration.
 */

import API from "./client";

// ─── Ranking ──────────────────────────────────────────────────────────────────
export const getRankingCategories = () =>
  API.get("/ranking/categories");

export const getInventoryDistribution = () =>
  API.get("/ranking/inventory-distribution");

export const getRankings = () =>
  API.get("/ranking");

// ─── Expenses ────────────────────────────────────────────────────────────────
export const getExpenseSummary = () =>
  API.get("/expenses/summary");

export const getExpenseProfitLoss = () =>
  API.get("/expenses/profit-loss");

// ─── Monthly Snapshots (localStorage) ────────────────────────────────────────
const SNAPSHOT_KEY = "advika_analytics_snapshots";

/**
 * Returns all stored monthly snapshots as { "2025-01": {...}, "2025-02": {...} }
 * Wrapped in a promise to match the useApiData pattern.
 */
export const getAnalyticsSnapshot = () => {
  return Promise.resolve({
    data: {
      data: JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}"),
    },
  });
};

/**
 * Saves a snapshot for the given month.
 * snapshot = { month: "2025-06", operatingExpense, monthlyProfit, ... }
 */
export const saveAnalyticsSnapshot = (snapshot) => {
  const all = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}");
  all[snapshot.month] = { ...snapshot, savedAt: new Date().toISOString() };
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all));
  return Promise.resolve({ data: { data: all } });
};
