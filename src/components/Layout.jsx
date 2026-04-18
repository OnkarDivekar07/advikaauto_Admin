import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const MENU = [
  { name: "Billing",        path: "/billing",        icon: "🧾" },
  { name: "Daily",          path: "/daily",           icon: "📅" },
  { name: "Inventory",      path: "/inventory",       icon: "📦" },
  { name: "Financials",     path: "/financials",      icon: "💰" },
  { name: "QR Generator",   path: "/qr-generator",    icon: "🔲" },
  { name: "Product Sheets", path: "/product-sheets",  icon: "🖨️"  },
  { name: "Product Images", path: "/product-images",  icon: "🖼️"  },
  { name: "Orders",         path: "/orders",          icon: "🛒" },
  { name: "Suppliers",      path: "/suppliers",       icon: "🏭" },
  { name: "Analytics",      path: "/analytics",       icon: "📊" },
  { name: "Customers",      path: "/customers",       icon: "👥" },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout } = useAuth();

  const pageTitle = MENU.find((m) => m.path === location.pathname)?.name ?? "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="layout">
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="logo">🌸 Advika</div>

        <nav>
          {MENU.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)}>☰</button>
          <div className="page-name">{pageTitle}</div>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
