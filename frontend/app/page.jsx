"use client";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/", {
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

if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner"></div>
        <p style={{ marginTop: "12px", color: "var(--muted)" }}></p>
      </div>
    );
  }  if (error) return <p className="text-center text-red-600 mt-10">{error}</p>;

  return (
    <main className="grid-center">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>Home Page 🏠</h1>
        <p>{message}</p>
        
      </div>
    </main>
  );
}
