"use client";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const [role, setRole] = useState("patient");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Patient
  const [age, setAge] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [address, setAddress] = useState("");

  // Doctor
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redirectIn, setRedirectIn] = useState(3);

  /* ---------- Password rules ---------- */

  const rules = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isValidBase =
    username.trim().length >= 2 &&
    email.includes("@") &&
    rules.length;

  const isValidRole =
    role === "patient" || specialization.trim().length > 0;

  /* ---------- Redirect countdown ---------- */

  useEffect(() => {
    if (!success) return;

    const t = setInterval(() => {
      setRedirectIn(v => v - 1);
    }, 1000);

    const nav = setTimeout(() => {
      window.location.href = "/login";
    }, 3000);

    return () => {
      clearInterval(t);
      clearTimeout(nav);
    };
  }, [success]);

  /* ---------- Submit ---------- */

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValidBase || !isValidRole) return;

    setLoading(true);
    setError("");

    try {
      const endpoint =
        role === "doctor"
          ? "https://fastapi-6mjn.onrender.com/register/doctor"
          : "https://fastapi-6mjn.onrender.com/register/patient";

      const payload =
        role === "doctor"
          ? { username, email, password, specialization, bio, availability }
          : {
              username,
              email,
              password,
              age: age ? Number(age) : undefined,
              medical_history: medicalHistory,
              address
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="wire-center">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}

      {success && (
        <div className="export-toast">
          <div className="export-box success">
            <h3>🎉 Registration Successful</h3>
            <p>Please check your email before login.</p>
            <p>Redirecting to login in <strong>{redirectIn}</strong>…</p>
          </div>
        </div>
      )}

      <div className="wire-card">
        <h1 className="wire-title">Create Account</h1>

        {/* ROLE SWITCH */}
        <div className="role-switch" style={{ marginBottom: 14 }}>
          <div className={`pill ${role === "patient" ? "active" : ""}`} onClick={() => setRole("patient")}>
            Patient
          </div>
          <div className={`pill ${role === "doctor" ? "active" : ""}`} onClick={() => setRole("doctor")}>
            Doctor
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="wire-field">
            <label className="wire-label">Username</label>
            <input className="wire-input" value={username} onChange={e => setUsername(e.target.value)} />
          </div>

          <div className="wire-field">
            <label className="wire-label">Email</label>
            <input className="wire-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* PASSWORD */}
          <div className="wire-field">
            <label className="wire-label">Password</label>

            <div style={{ position: "relative" }}>
              <input
                className="wire-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ position: "absolute", right: 6, top: 6 }}
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* RULE CHECKLIST */}
            <ul className="bullets">
              <li style={{ color: rules.length ? "var(--success)" : "var(--muted)" }}>✔ At least 6 characters</li>
              <li style={{ color: rules.upper ? "var(--success)" : "var(--muted)" }}>✔ One uppercase letter</li>
              <li style={{ color: rules.number ? "var(--success)" : "var(--muted)" }}>✔ One number</li>
              <li style={{ color: rules.special ? "var(--success)" : "var(--muted)" }}>✔ One special character</li>
            </ul>
          </div>

          {/* ROLE DETAILS */}
          {role === "doctor" && (
            <div className="section">
              <h3>Doctor Details</h3>

              <div className="wire-field">
                <label className="wire-label">Specialization *</label>
                <input className="wire-input" value={specialization} onChange={e => setSpecialization(e.target.value)} />
              </div>

              <div className="wire-field">
                <label className="wire-label">Bio</label>
                <textarea className="wire-input" value={bio} onChange={e => setBio(e.target.value)} />
              </div>

              <div className="wire-field">
                <label className="wire-label">Availability</label>
                <input className="wire-input" value={availability} onChange={e => setAvailability(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          <div className="wire-actions">
            <button
              className="wire-button"
              type="submit"
              disabled={loading || !(isValidBase && isValidRole)}
            >
              {loading ? "Registering..." : "Register"}
            </button>

            <p className="wire-helper">
              Already have an account? <a className="wire-link" href="/login">Login</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
            }
