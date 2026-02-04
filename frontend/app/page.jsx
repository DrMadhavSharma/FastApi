"use client";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://fastapi-6mjn.onrender.com/", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Request failed");
        }

        const result = await res.json();
        setMessage(result.message || "No message received");
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <main className="grid-center">
        <div style={{ textAlign: "center" }}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "var(--muted)" }}>
            Connecting to server…
          </p>
        </div>
      </main>
    );
  }

  /* ---------------- Error ---------------- */
  if (error) {
    return (
      <main className="grid-center">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p className="error">{error}</p>

          <div className="actions" style={{ justifyContent: "center" }}>
            <button
              className="btn btn-ghost"
              onClick={() => location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- Success ---------------- */
  return (
    <main className="grid-center">
      <div className="card" style={{ textAlign: "center" }}>
        {/* Logo */}
        <img
          src="https://fastapi-6mjn.onrender.com/static/logo-dark.svg"
          alt="Company Logo"
          style={{ width: 56, height: 56, marginBottom: 16 }}
        />

        <h1>Welcome</h1>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          Your backend is live and responding.
        </p>

        <div className="section">
          <p>{message}</p>
        </div>

        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary">
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
