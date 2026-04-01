import React, { useState, useCallback } from "react";
import {
  getMissingItems,
  createMissingItem,
  updateMissingItem,
  deleteMissingItem,
} from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./MissingItems.css";

export default function MissingItems() {
  const fetchFn = useCallback(getMissingItems, []);
  const { data: items = [], error: loadError, loading, refresh } = useApiData(fetchFn, []);
  const toast = useToast();

  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) { toast.warn("Item name is required"); return; }
    setAdding(true);
    try {
      await createMissingItem(newName.trim());
      toast.success(`"${newName}" added to missing items.`);
      setNewName("");
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleIncrementRequest = async (item) => {
    try {
      await updateMissingItem(item.id, { requestCount: (item.requestCount || 0) + 1 });
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) { toast.warn("Name cannot be empty"); return; }
    try {
      await updateMissingItem(id, { name: editName.trim() });
      toast.success("Item updated.");
      setEditId(null);
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" from missing items?`)) return;
    try {
      await deleteMissingItem(id);
      toast.success("Item removed.");
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const sorted = [...items].sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));

  return (
    <div className="missing-items-page">
      <h1 className="page-title">Missing Items</h1>
      <p className="page-subtitle">Track products customers asked for that weren't available.</p>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      {/* Add form */}
      <div className="add-row">
        <input
          type="text"
          placeholder="Item name customers requested…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="primary-btn" onClick={handleAdd} disabled={adding}>
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>

      {loading ? (
        <p className="loading-text">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="empty-state">No missing items logged yet.</div>
      ) : (
        <div className="missing-list">
          {sorted.map((item) => (
            <div key={item.id} className="missing-card">
              {editId === item.id ? (
                <div className="edit-row">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                    autoFocus
                  />
                  <button className="success-btn" onClick={() => handleSaveEdit(item.id)}>Save</button>
                  <button className="secondary-btn" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="missing-info">
                    <span className="missing-name">{item.name}</span>
                    <span className="request-count" title="Times requested">
                      🔁 {item.requestCount || 0}
                    </span>
                  </div>
                  <div className="missing-actions">
                    <button
                      className="increment-btn"
                      onClick={() => handleIncrementRequest(item)}
                      title="Customer asked again"
                    >
                      + Request
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => { setEditId(item.id); setEditName(item.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
