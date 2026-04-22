import React, { useState, useCallback, useRef, useEffect } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  getProducts,
  getSuppliers,
  getAllSupplierMappings,
  getProductSupplierMappings,
  uploadProductImage,
  deleteProductImage,
  updateMarathiName,
  updateDefaultUnit,
  mapProductSuppliers,
  updateLeadBuffer,
} from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./ProductImages.css";

const UNIT_OPTIONS = [
  { value: "pcs",   label: "नग (PCS)"    },
  { value: "jodi",  label: "जोडी (JODI)" },
  { value: "dozen", label: "डझन (DOZEN)" },
];

// ─── Lead & Buffer days editor ────────────────────────────────────────────────
// Inline CRUD panel: shows current leadDays / bufferDays, lets operator edit.
// Auto-saves on blur of either field; shows saved confirmation briefly.
function LeadBufferPanel({ product, onSaved }) {
  const [expanded,   setExpanded]   = useState(false);
  const [leadDays,   setLeadDays]   = useState(String(product.leadDays   ?? 15));
  const [bufferDays, setBufferDays] = useState(String(product.bufferDays ?? 7));
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const toast = useToast();

  // Keep local state in sync if parent refreshes products
  const prevLead   = useRef(product.leadDays);
  const prevBuffer = useRef(product.bufferDays);
  if (prevLead.current !== product.leadDays) {
    prevLead.current = product.leadDays;
    setLeadDays(String(product.leadDays ?? 15));
  }
  if (prevBuffer.current !== product.bufferDays) {
    prevBuffer.current = product.bufferDays;
    setBufferDays(String(product.bufferDays ?? 7));
  }

  const handleSave = async () => {
    const lead   = parseInt(leadDays,   10);
    const buffer = parseInt(bufferDays, 10);
    if (isNaN(lead)   || lead   < 0) { toast.warn("Lead days must be 0 or more.");   return; }
    if (isNaN(buffer) || buffer < 0) { toast.warn("Buffer days must be 0 or more."); return; }
    // Nothing changed — skip the network call
    if (lead === (product.leadDays ?? 15) && buffer === (product.bufferDays ?? 7)) return;

    setSaving(true);
    try {
      await updateLeadBuffer(product.id, lead, buffer);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      toast.error(`Failed to save: ${err?.response?.data?.message ?? err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const badgeText = `Lead ${product.leadDays ?? 15}d · Buffer ${product.bufferDays ?? 7}d`;

  return (
    <div className="lead-buffer-panel">
      <button
        className={`lb-toggle ${expanded ? "open" : ""}`}
        onClick={() => setExpanded((p) => !p)}
        type="button"
        title="Set lead days and buffer days for threshold calculation"
      >
        <span className="lb-badge">{badgeText}</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="lb-body">
          <div className="lb-row">
            <label className="lb-label" title="Days from placing the order to stock arriving at your shop">
              Lead Days
              <span className="lb-hint">order→arrival</span>
            </label>
            <input
              className="lb-input"
              type="number"
              min="0"
              max="90"
              value={leadDays}
              onChange={(e) => setLeadDays(e.target.value)}
              onBlur={handleSave}
              disabled={saving}
            />
          </div>
          <div className="lb-row">
            <label className="lb-label" title="Extra safety stock in days on top of 30-day demand">
              Buffer Days
              <span className="lb-hint">safety stock</span>
            </label>
            <input
              className="lb-input"
              type="number"
              min="0"
              max="60"
              value={bufferDays}
              onChange={(e) => setBufferDays(e.target.value)}
              onBlur={handleSave}
              disabled={saving}
            />
          </div>
          <p className="lb-formula">
            Max stock = avg/day × (30 + {bufferDays || "?"} + {leadDays || "?"}) days
          </p>
          {saving && <p className="lb-status saving">Saving…</p>}
          {saved  && <p className="lb-status saved">✓ Saved</p>}
        </div>
      )}
    </div>
  );
}

// ─── Supplier mapping panel — isolated per product ────────────────────────────
// Loads its own existing mappings only when expanded, so 50 products
// don't all fire 50 requests on page load.
function SupplierMappingPanel({ product, suppliers, initialMappings, onSaved }) {
  const [expanded, setExpanded]       = useState(false);
  const [mappings, setMappings]       = useState(initialMappings ?? null);
  const [loadingMap, setLoadingMap]   = useState(false);
  const [selections, setSelections]   = useState({});    // { 1: supplierId, 2: ..., 3: ... }
  const [saving, setSaving]           = useState(false);
  const toast = useToast();
  const hasFetched = useRef(false);

  // Load existing mappings — fetched on mount so badge shows immediately
  const loadMappings = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setLoadingMap(true);
    try {
      const res = await getProductSupplierMappings(product.id);
      // Unwrap envelope
      const data = res.data?.data ?? [];
      setMappings(data);
      // Pre-populate selections from existing mappings
      const sel = {};
      data.forEach((m) => { sel[m.priority] = m.supplier_id; });
      setSelections(sel);
    } catch {
      setMappings([]);
    } finally {
      setLoadingMap(false);
    }
  }, [product.id]);

  useEffect(() => {
    // Skip fetch if parent already supplied mappings via initialMappings prop
    if (initialMappings) {
      const sel = {};
      initialMappings.forEach((m) => { sel[m.priority] = m.supplier_id; });
      setSelections(sel);
      hasFetched.current = true;
      return;
    }
    loadMappings();
  }, [loadMappings, initialMappings]);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  const handleSelect = (priority, supplierId) => {
    setSelections((prev) => ({ ...prev, [priority]: supplierId }));
  };

  const handleSave = async () => {
    const list = Object.entries(selections)
      .filter(([, sid]) => sid)
      .map(([priority, supplier_id]) => ({ supplier_id, priority: Number(priority) }));

    if (!list.length) { toast.warn("Select at least one supplier."); return; }

    setSaving(true);
    try {
      await mapProductSuppliers(product.id, list);
      toast.success(`Suppliers saved for "${product.name}".`);
      // Refresh mappings display
      hasFetched.current = false;
      await loadMappings();
      hasFetched.current = true;
      onSaved?.();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // Build display label for current mapping badge
  const getMappedLabel = () => {
    if (!mappings || mappings.length === 0) return null;
    const sorted = [...mappings].sort((a, b) => a.priority - b.priority);
    return sorted.map((m) => `P${m.priority}: ${m.Supplier?.name ?? "?"}`).join(" · ");
  };

  const mappedLabel = getMappedLabel();

  return (
    <div className="supplier-mapping-panel">
      <button
        className={`mapping-toggle ${expanded ? "open" : ""}`}
        onClick={handleToggle}
        type="button"
      >
        <span className="mapping-toggle-label">
          {mappedLabel
            ? <span className="mapping-badge">{mappedLabel}</span>
            : <span className="mapping-empty">No suppliers mapped</span>
          }
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mapping-body">
          {loadingMap ? (
            <p className="mapping-loading">Loading current mappings…</p>
          ) : (
            <>
              {[1, 2, 3].map((priority) => (
                <div key={priority} className="priority-row">
                  <label className="priority-label">Priority {priority}</label>
                  <select
                    value={selections[priority] ?? ""}
                    onChange={(e) => handleSelect(priority, e.target.value)}
                    className="priority-select"
                  >
                    <option value="">— None —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                className="save-mapping-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Suppliers"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProductImages() {
  const productsFn  = useCallback(getProducts,  []);
  const suppliersFn = useCallback(getSuppliers, []);

  const allMappingsFn = useCallback(getAllSupplierMappings, []);

  const { data: products  = [], error: loadError, refresh: refreshProducts } = useApiData(productsFn,     []);
  const { data: suppliers = [] }                                              = useApiData(suppliersFn,    []);
  const { data: allMappings = {}, refresh: refreshMappings }                 = useApiData(allMappingsFn, []);
  const toast = useToast();

  const [uploading,  setUploading]  = useState(null);
  const [saving,     setSaving]     = useState(null);
  const [unitSaving, setUnitSaving] = useState(null);
  const [retryId,    setRetryId]    = useState(null);
  const [search,     setSearch]     = useState("");

  const handleUpload = async (productId, file) => {
    if (!file) return;
    if (!navigator.onLine) { toast.error("You are offline. Please check your internet connection."); return; }
    setUploading(productId);
    setRetryId(null);
    const fd = new FormData();
    fd.append("image", file);
    try {
      await uploadProductImage(productId, fd);
      toast.success("Image uploaded.");
      refreshProducts();
    } catch (err) {
      toast.error(`Upload failed: ${extractError(err)}`);
      setRetryId(productId);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product image?")) return;
    try {
      await deleteProductImage(productId);
      toast.success("Image deleted.");
      refreshProducts();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleMarathiSave = async (productId, marathiName) => {
    setSaving(productId);
    try {
      await updateMarathiName(productId, marathiName);
      toast.success("Marathi name saved.");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(null);
    }
  };

  const handleUnitChange = async (productId, defaultUnit) => {
    setUnitSaving(productId);
    try {
      await updateDefaultUnit(productId, defaultUnit);
      toast.success("Unit updated.");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setUnitSaving(null);
    }
  };

  const filtered = products
    .filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.marathiName ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // rank null (never sold) goes to bottom; otherwise ascending rank (1 = top seller)
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });

  const totalRanked = filtered.filter((p) => p.rank != null).length;
  const getCardStyle = (p) => {
    if (p.rank == null || totalRanked === 0) return {};
    const fastCutoff = Math.ceil(totalRanked * 0.25);
    const slowCutoff = Math.ceil(totalRanked * 0.75);
    if (p.rank <= fastCutoff) return { boxShadow: '0 0 14px 3px rgba(34,197,94,0.18)' };
    if (p.rank <= slowCutoff) return { boxShadow: '0 0 14px 3px rgba(251,146,60,0.18)' };
    return {};
  };

  return (
    <div className="product-images-page">
      <h1>Product Images &amp; Units</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search product (English / मराठी)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      <div className="image-table">
        {filtered.map((p) => (
          <div key={p.id} className="image-row" style={getCardStyle(p)}>

            {/* Name */}
            <div className="col name-col">
              <span className="product-name">{p.name}</span>
              {p.marathiName && (
                <span className="product-marathi">{p.marathiName}</span>
              )}
            </div>

            {/* Supplier mapping — pre-populated from bulk fetch, no per-product requests */}
            <div className="col supplier-col">
              <SupplierMappingPanel
                product={p}
                suppliers={suppliers}
                initialMappings={allMappings[p.id] ?? []}
                onSaved={refreshMappings}
              />
            </div>

            {/* Lead & Buffer days */}
            <div className="col lead-buffer-col">
              <LeadBufferPanel
                product={p}
                onSaved={refreshProducts}
              />
            </div>

            {/* Unit */}
            <div className="col unit-col">
              <select
                value={p.defaultUnit ?? "pcs"}
                onChange={(e) => handleUnitChange(p.id, e.target.value)}
                disabled={unitSaving === p.id}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              {unitSaving === p.id && <span className="saving">Saving…</span>}
            </div>

            {/* Marathi name */}
            <div className="col marathi-col">
              <input
                key={`marathi-${p.id}-${p.marathiName}`}
                type="text"
                placeholder="मराठी नाव"
                defaultValue={p.marathiName ?? ""}
                onBlur={(e) => handleMarathiSave(p.id, e.target.value)}
              />
              {saving === p.id && <span className="saving">Saving…</span>}
            </div>

            {/* Image */}
            <div className="col image-col">
              {p.imageUrl ? (
                <div className="image-wrapper">
                  <img src={p.imageUrl} alt={p.name} />
                  <button className="delete-btn" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <label className={`upload-btn ${uploading === p.id ? "uploading" : ""}`}>
                    {uploading === p.id ? "Uploading…" : "Upload Image"}
                    <input
                      id={`file-${p.id}`}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleUpload(p.id, e.target.files[0])}
                    />
                  </label>
                  {retryId === p.id && (
                    <button
                      className="retry-btn"
                      onClick={() => document.getElementById(`file-${p.id}`).click()}
                    >
                      Retry
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        ))}

        {filtered.length === 0 && !loadError && (
          <div className="empty-state">No products found.</div>
        )}
      </div>
    </div>
  );
}
