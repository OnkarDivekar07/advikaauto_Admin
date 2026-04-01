import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import OfflineBanner from "./components/OfflineBanner";
import "./global.css";
import Layout from "./components/Layout";

import Login           from "./pages/Login";
import OtpVerification from "./pages/OtpVerification";
import Billing         from "./pages/Billing";
import DailyTransactions from "./pages/DailyTransactions";
import Inventory       from "./pages/Inventory";
import Financials      from "./pages/Financials";
import QrGenerator     from "./pages/QrGenerator";
import ProductSheets   from "./pages/ProductSheets";
import ProductImages   from "./pages/ProductImages";
import AutoOrders      from "./pages/AutoOrders";
import Suppliers       from "./pages/Suppliers";

/**
 * Wraps a page component in Layout + ProtectedRoute.
 * Keeps App.js clean and removes repetition.
 */
const Protected = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <OfflineBanner />
        <Routes>
          {/* Public */}
          <Route path="/"           element={<Login />} />
          <Route path="/verify-otp" element={<OtpVerification />} />

          {/* Protected */}
          <Route path="/billing"        element={<Protected><Billing /></Protected>} />
          <Route path="/daily"          element={<Protected><DailyTransactions /></Protected>} />
          <Route path="/inventory"      element={<Protected><Inventory /></Protected>} />
          <Route path="/financials"     element={<Protected><Financials /></Protected>} />
          <Route path="/qr-generator"   element={<Protected><QrGenerator /></Protected>} />
          <Route path="/product-sheets" element={<Protected><ProductSheets /></Protected>} />
          <Route path="/product-images" element={<Protected><ProductImages /></Protected>} />
          <Route path="/orders"         element={<Protected><AutoOrders /></Protected>} />
          <Route path="/suppliers"      element={<Protected><Suppliers /></Protected>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
