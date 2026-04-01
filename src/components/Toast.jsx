import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import "./Toast.css";

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, ms) => toast(msg, "success", ms), [toast]);
  const error   = useCallback((msg, ms) => toast(msg, "error",   ms ?? 6000), [toast]);
  const warn    = useCallback((msg, ms) => toast(msg, "warn",    ms), [toast]);
  const info    = useCallback((msg, ms) => toast(msg, "info",    ms), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warn, info }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" && "✅"}
              {t.type === "error"   && "❌"}
              {t.type === "warn"    && "⚠️"}
              {t.type === "info"    && "ℹ️"}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};
