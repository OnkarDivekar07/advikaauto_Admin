import React, { useState, useCallback } from "react";
import { getSuppliers, addSupplier, archiveSupplier } from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Suppliers.css";

export default function Suppliers() {
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  const fetchFn = useCallback(getSuppliers, []);
  const { data: suppliers = [], error: loadError, refresh } = useApiData(fetchFn, []);

  const handleAdd = async () => {
    if (!name.trim()) { toast.warn("Supplier name required"); return; }
    setAdding(true);
    try {
      await addSupplier({ name, phone });
      toast.success(`Supplier "${name}" added.`);
      setName("");
      setPhone("");
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = async (id, supplierName) => {
    if (!window.confirm(`Archive "${supplierName}"?`)) return;
    try {
      await archiveSupplier(id);
      toast.success(`Supplier archived.`);
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="supplier-page">
      <h2 className="page-title">Supplier Management</h2>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      <div className="supplier-grid">
        <div className="supplier-card">
          <h3>Add Supplier</h3>
          <input
            placeholder="Supplier Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button className="primary-btn" onClick={handleAdd} disabled={adding}>
            {adding ? "Adding…" : "Add Supplier"}
          </button>
        </div>
      </div>

      <div className="supplier-list">
        <h3>Supplier List</h3>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Phone</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>No suppliers added</td>
              </tr>
            ) : (
              suppliers.map((s, idx) => (
                <tr key={s.id}>
                  <td>{idx + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.phone || "—"}</td>
                  <td>
                    <button className="danger-btn" onClick={() => handleArchive(s.id, s.name)}>
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
