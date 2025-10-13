"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [data, setData] = useState(null);
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
        setData(result);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center text-red-600 mt-10">{error}</p>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">🏠 HOME PAGE</h1>
        {data ? (
          <pre className="text-gray-600 text-sm text-left overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">No data received.</p>
        )}
      </div>
    </div>
  );
}
