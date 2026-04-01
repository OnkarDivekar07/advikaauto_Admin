import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { getProducts } from "../api/endpoints";
import { extractError } from "../utils/extractError";
import "./ProductSheets.css";

export default function ProductSheets() {
  const [products, setProducts]    = useState([]);
  const [qrMap, setQrMap]          = useState({});
  const [search, setSearch]        = useState("");
  const [selectedIds, setSelected] = useState([]);
  const [loadError, setLoadError]  = useState(null);

  const generateQrs = useCallback(async (list) => {
    const map = {};
    for (const p of list) {
      try {
        map[p.id] = await QRCode.toDataURL(p.id, { width: 300, margin: 1 });
      } catch {
        // skip individual failures silently — product will show without QR
      }
    }
    setQrMap(map);
  }, []);

  useEffect(() => {
    getProducts()
      .then((res) => {
        // Unwrap envelope: res.data = { success, message, data: <payload>, meta }
        const list = res.data?.data ?? [];
        setProducts(list);
        generateQrs(list);
        setLoadError(null);
      })
      .catch((err) => setLoadError(extractError(err)));
  }, [generateQrs]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const visible = [
    ...selectedIds.map((id) => products.find((p) => p.id === id)).filter(Boolean),
    ...filtered.filter((p) => !selectedIds.includes(p.id)),
  ];

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="sheet-page">
      <div className="print-only-header">
        <div className="print-store-name">अद्विका फ्लॉवर्स</div>
        <div className="print-store-tagline">किंमत योग्य, सेवा भारी…</div>
      </div>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      <div className="sheet-header">
        <h2>Product QR Sheets</h2>
        <div className="sheet-actions">
          <input
            type="text"
            placeholder="Search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="print-btn" onClick={() => window.print()}>
            🖨 Print Selected
          </button>
        </div>
      </div>

      <div className="sheet-grid">
        {visible.length === 0 && <div className="no-results">No products found</div>}
        {visible.map((p) => (
          <div
            key={p.id}
            className={`sheet-block ${selectedIds.includes(p.id) ? "selected" : ""}`}
            onClick={() => toggle(p.id)}
          >
            <div className="block-name">{p.marathiName?.trim() || p.name}</div>
            <div className="block-image">
              {p.imageUrl
                ? <img src={p.imageUrl} alt={p.name} />
                : <span className="no-image">No Image</span>}
            </div>
            <div className="block-qr">
              {qrMap[p.id] && <img src={qrMap[p.id]} alt="QR" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
