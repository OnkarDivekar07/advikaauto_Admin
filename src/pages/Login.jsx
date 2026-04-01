import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP } from "../api/endpoints";
import { extractError } from "../utils/extractError";
import "./Login.css";

export default function Login() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await sendOTP(email);
      if (res.data.success) {
        navigate("/verify-otp", { state: { email } });
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">🌸</div>
        <h1>Advika Flowers</h1>
        <p className="login-subtitle">Admin Portal</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}
