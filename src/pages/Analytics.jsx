// ONLY CHANGES:
// 1. removed cats from destructuring
// 2. removed nonItems
// 3. removed unused cats usage

const loadAll = useCallback(async () => {
  setLoading(true);
  try {
    const [finance, dist, rankings, customers, missing, expenses, profitLoss, snapshot] =
      await Promise.allSettled([
        getFinanceSummary(),
        getInventoryDistribution(),
        getRankings(),
        getAllCustomerCounts(),
        getMissingItems(),
        getExpenseSummary(),
        getExpenseProfitLoss(),
        getAnalyticsSnapshot(),
      ]);

    const safe = (r, fallback = null) =>
      (r.status === "fulfilled" ? r.value?.data?.data ?? r.value?.data ?? fallback : fallback);

    setData({
      finance:    safe(finance, {}),
      dist:       safe(dist, {}),
      rankings:   safe(rankings, []),
      customers:  safe(customers, []),
      missing:    safe(missing, []),
      expenses:   safe(expenses, {}),
      profitLoss: safe(profitLoss, {}),
    });

    const snapshotData = safe(snapshot, null);
    if (snapshotData) {
      const prevMonth = new Date(
        new Date().setMonth(new Date().getMonth() - 1)
      )
        .toISOString()
        .slice(0, 7);

      setPrev(snapshotData[prevMonth] ?? null);
    }
  } catch (err) {
    toast.error(`Analytics error: ${extractError(err)}`);
  } finally {
    setLoading(false);
  }
}, [toast]);

// ---- below remains same ----

const { finance = {}, dist = {}, rankings = [], customers = [], missing = [], expenses = {}, profitLoss = {} } = data || {};

const fastItems = rankings.filter((p) => p.category === "fast-moving");
const slowItems = rankings.filter((p) => p.category === "slow-moving");

// removed this:
// const nonItems  = rankings.filter((p) => p.category === "non-moving");

const thisMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });