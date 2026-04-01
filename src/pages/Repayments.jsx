import React, { useState, useCallback } from "react";
import {
  getRepayments,
  createRepayment,
  updateRepayment,
  deleteRepayment,
} from "../api/endpoints";
import { useApiData } from "../hooks/useApiData";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Repayments.css";

const EMPTY = { supplierName: "", contactDetails: "", amountOwed: "", dueDate: "" };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

export default function Repayments() {
  const fetchFn = useCallback(getRepayments, []);
  const { data: repayments = [], error: loadError, loading, refresh } = useApiData(fetchFn, []);
  const toast = useToast();

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);

  const totalOwed = repayments.reduce((s, r) => s + parseFloat(r.amountOwed || 0), 0);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openNew = () => {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({
      supplierName:   r.supplierName,
      contactDetails: r.contactDetails,
      amountOwed:     r.amountOwed,
      dueDate:        r.dueDate?.split("T")[0] ?? "",
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.supplierName.trim()) { toast.warn("Supplier name is required"); return; }
    if (!form.contactDetails.trim()) { toast.warn("Contact details are required"); return; }
    if (!form.amountOwed || parseFloat(form.amountOwed) <= 0) { toast.warn("Amount must be greater than 0"); return; }
    if (!form.dueDate) { toast.warn("Due date is required"); return; }

    setSaving(true);
    try {
      if (editId) {
        await updateRepayment(editId, form);
        toast.success("Repayment updated.");
      } else {
        await createRepayment(form);
        toast.success("Repayment added.");
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditId(null);
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete repayment for "${name}"?`)) return;
    try {
      await deleteRepayment(id);
      toast.success("Repayment deleted.");
      refresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <div className="repayments-page">
      <h1 className="page-title">Repayments</h1>

      {loadError && <div className="error-banner">⚠️ {loadError}</div>}

      {/* Summary */}
      <div className="repayment-summary">
        <div className="summary-card">
          <p className="summary-label">Total Pending</p>
          <h2>₹{totalOwed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="summary-card overdue-count">
          <p className="summary-label">Overdue</p>
          <h2>{repayments.filter((r) => isOverdue(r.dueDate)).length}</h2>
        </div>
      </div>

      <button className="primary-btn" onClick={openNew} style={{ marginBottom: 20 }}>
        + Add Repayment
      </button>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="repayment-form-card">
          <h3>{editId ? "Edit Repayment" : "New Repayment"}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Supplier Name</label>
              <input
                name="supplierName"
                placeholder="e.g. Rajan Flowers"
                value={form.supplierName}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Contact Details</label>
              <input
                name="contactDetails"
                placeholder="Phone or email"
                value={form.contactDetails}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Amount Owed (₹)</label>
              <input
                name="amountOwed"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amountOwed}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Due Date</label>
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="success-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editId ? "Update" : "Save"}
            </button>
            <button className="secondary-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="loading-text">Loading repayments…</p>
      ) : repayments.length === 0 ? (
        <div className="empty-state">No repayments recorded yet.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Amount Owed</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr key={r.id} className={isOverdue(r.dueDate) ? "row-overdue" : ""}>
                  <td><strong>{r.supplierName}</strong></td>
                  <td>{r.contactDetails}</td>
                  <td>₹{parseFloat(r.amountOwed).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td>{formatDate(r.dueDate)}</td>
                  <td>
                    {isOverdue(r.dueDate)
                      ? <span className="badge overdue">Overdue</span>
                      : <span className="badge pending">Pending</span>}
                  </td>
                  <td className="action-cell">
                    <button className="edit-btn" onClick={() => openEdit(r)}>Edit</button>
                    <button className="danger-btn" onClick={() => handleDelete(r.id, r.supplierName)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
