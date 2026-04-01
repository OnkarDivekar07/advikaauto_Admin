import React, { useState, useMemo, useCallback } from "react";
import QRCode from "qrcode";
import { getProducts } from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./QrGenerator.css";

export default function QrGenerator() {
  const fetchFn = useCallback(getProducts, []);
  const { data: products = [], error: loadError } = useApiData(fetchFn, []);
  const toast = useToast();

  const [search, setSearch]            = useState("");
  const [selectedProduct, setSelected] = useState(null);
  const [qrUrl, setQrUrl]              = useState("");

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const handleSelect = async (id) => {
    if (!id) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setSelected(product);
    try {
      const url = await QRCode.toDataURL(product.id, { width: 300, margin: 1 });
      setQrUrl(url);
    } catch (err) {
      toast.error("Failed to generate QR code. Please try again.");
    }
  };

  const downloadQR = () => {
    if (!qrUrl || !selectedProduct) return;
    const a = document.createElement("a");
    a.href     = qrUrl;
    a.download = `${selectedProduct.name}-qr.png`;
    a.click();
  };

  return (
    <div className="qr-page">
      <h1>Product QR Generator</h1>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      <input
        type="text"
        className="qr-search"
        placeholder="Search product…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className="qr-select"
        value={selectedProduct?.id ?? ""}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="" disabled>Select Product</option>
        {filtered.length === 0 && <option disabled>No products found</option>}
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {selectedProduct && qrUrl && (
        <>
          <div className="qr-wrapper">
            <div className="qr-name">{selectedProduct.name}</div>
            <img src={qrUrl} alt="QR Code" className="qr-img" />
          </div>
          <button className="primary-btn" onClick={downloadQR}>
            ⬇ Download QR
          </button>
        </>
      )}
    </div>
  );
}
