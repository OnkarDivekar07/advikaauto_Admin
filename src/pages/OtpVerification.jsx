import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOTP } from "../api/endpoints";
import { extractError } from "../utils/extractError";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function OtpVerification() {
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const navigate  = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();

  const email = state?.email ?? "";

  // Guard: if someone navigates here directly without an email, send them back
  useEffect(() => {
    if (!email) navigate("/", { replace: true });
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) { setError("Please enter the OTP."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await verifyOTP(email, otp);

      // Backend sendResponse envelope shape:
      //   { success: true, message: "...", data: { token: "eyJ..." }, meta: {...} }
      // Axios puts the full response body at res.data, so:
      //   res.data          → the envelope object
      //   res.data.success  → boolean
      //   res.data.data     → the payload  { token }
      //   res.data.data.token → the JWT
      const envelope = res.data;

      if (envelope.success) {
        const token = envelope.data?.token;

        if (!token) {
          // Shouldn't happen — surface it clearly rather than silently failing
          setError("Verification succeeded but no token was returned. Please try again.");
          return;
        }

        login(token);           // stores in localStorage AND updates AuthContext state
        navigate("/billing");
      } else {
        // Non-throwing error from backend (rare with this API, but safe to handle)
        setError(envelope.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null; // render nothing while redirecting

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">🔐</div>
        <h1>Verify OTP</h1>
        <p className="login-subtitle">Sent to {email}</p>

        <form onSubmit={handleVerify}>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            inputMode="numeric"
            required
            autoFocus
          />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/", { state: { email } })}
          >
            ← Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
