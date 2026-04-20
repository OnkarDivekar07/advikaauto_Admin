import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getProducts,
  addProduct,
  updateProduct,
  removeProduct,
} from "../api/endpoints";
import { useToast } from "../components/Toast";
import { extractError } from "../utils/extractError";
import "./Billing.css";

const EMPTY = { name: "", quantity: "", price: "", lower_threshold: "", upper_threshold: "" };

export default function Inventory() {
  const [products, setProducts]     = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageError, setPageError]   = useState(null);
  const debounceRef = useRef({});
  const toast = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      // Unwrap envelope: res.data = { success, message, data: <payload>, meta }
      setProducts(res.data?.data ?? []);
      setPageError(null);
    } catch (err) {
      setPageError(extractError(err));
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalValue        = products.reduce((s, p) => s + p.quantity * p.price, 0);
  const maxCapitalRequired = products.filter((p) => p.quantity <= (p.lower_threshold ?? 0)).reduce((s, p) => s + Math.max(0, (p.upper_threshold ?? 0) - p.quantity) * p.price, 0);

  // Debounce individual field updates.
  // Uses a ref to store the latest product state so the setTimeout closure
  // always reads the most recent value, not a stale snapshot.
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const handleChange = (id, field, value) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(async () => {
      const latest = productsRef.current.find((p) => p.id === id);
      if (!latest) return;
      try {
        await updateProduct(id, { ...latest, [field]: value });
      } catch (err) {
        toast.error(`Save failed: ${extractError(err)}`);
        fetchProducts(); // revert to server state
      }
    }, 600);
  };

  const handleAdd = async () => {
    if (!newProduct.name.trim()) { toast.warn("Product name required"); return; }
    try {
      await addProduct({
        ...newProduct,
        quantity:        Number(newProduct.quantity),
        price:           Number(newProduct.price),
        lower_threshold: Number(newProduct.lower_threshold),
        upper_threshold: Number(newProduct.upper_threshold),
      });
      toast.success("Product added.");
      setShowForm(false);
      setNewProduct(EMPTY);
      fetchProducts();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Remove this product?")) return;
    try {
      await removeProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product removed.");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const filtered = products
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // rank null/0 (never sold) goes to bottom; ascending rank = best seller first
      if (!a.rank && !b.rank) return 0;
      if (!a.rank) return 1;
      if (!b.rank) return -1;
      return a.rank - b.rank;
    });

  return (
    <div className="billing-container">
      <h1 className="page-title">Inventory</h1>

      {pageError && <div className="error-banner">⚠️ {pageError}</div>}

      <input
        type="text"
        className="search-input"
        placeholder="Search product by name…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="inventory-total">
        Total Inventory Value: ₹{totalValue.toFixed(2)}
      </div>
      <div className="inventory-total">
        Max Capital Required: ₹{maxCapitalRequired.toFixed(2)}
      </div>

      <button className="primary-btn" onClick={() => setShowForm((v) => !v)}>
        + Add Product
      </button>

      {showForm && (
        <div className="add-product-card">
          {[
            { key: "name",            placeholder: "Product name",    type: "text"   },
            { key: "quantity",        placeholder: "Quantity",        type: "number" },
            { key: "price",           placeholder: "Price (₹)",       type: "number" },
            { key: "lower_threshold", placeholder: "Lower threshold", type: "number" },
            { key: "upper_threshold", placeholder: "Upper threshold", type: "number" },
          ].map(({ key, placeholder, type }) => (
            <input
              key={key}
              type={type}
              placeholder={placeholder}
              value={newProduct[key]}
              onChange={(e) => setNewProduct({ ...newProduct, [key]: e.target.value })}
            />
          ))}
          <button className="success-btn" onClick={handleAdd}>Save Product</button>
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Qty</th><th>Price</th><th>Value</th>
              <th>Min</th><th>Max</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const low  = p.quantity <= p.lower_threshold;
              const high = p.quantity >= p.upper_threshold;
              return (
                <tr key={p.id} className={low ? "row-danger" : high ? "row-success" : ""}>
                  <td>
                    <input
                      value={p.name}
                      title={p.name}
                      onChange={(e) => handleChange(p.id, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.quantity}
                      onChange={(e) => handleChange(p.id, "quantity", +e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => handleChange(p.id, "price", +e.target.value)}
                    />
                  </td>
                  <td>₹{(p.quantity * p.price).toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      value={p.lower_threshold}
                      onChange={(e) => handleChange(p.id, "lower_threshold", +e.target.value)}
                    />
                    {low && <span className="down">▼</span>}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.upper_threshold}
                      onChange={(e) => handleChange(p.id, "upper_threshold", +e.target.value)}
                    />
                    {high && <span className="up">▲</span>}
                  </td>
                  <td>
                    <button className="danger-btn" onClick={() => handleRemove(p.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
