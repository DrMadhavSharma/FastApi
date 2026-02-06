"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

export default function UpdatePatientHistory() {
  const params = useParams();
  const patientId = params?.id;

  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    diagnosis: "",
    treatment: "",
    prescriptions: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await apiFetch(`/doctor/patient/${patientId}/history`);
      setHistory(data || []);
    } catch (e) {
      setError(e.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (patientId) load();
  }, [patientId]);

  async function submit() {
    try {
      setError("");
      await apiFetch(`/doctor/patient/${patientId}/history`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ diagnosis: "", treatment: "", prescriptions: "" });
      await load();
    } catch (e) {
      setError(e.message || "Failed to save history");
    }
  }

  if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container main">
      <h1>🧾 Update Patient History</h1>

      {error && <p className="error">{error}</p>}

      {/* ---------- UPDATE FORM ---------- */}
      <div className="section card">
        <h2>➕ Add New Entry</h2>

        <div className="field">
          <label className="label">Diagnosis</label>
          <input
            className="input"
            value={form.diagnosis}
            onChange={(e) =>
              setForm({ ...form, diagnosis: e.target.value })
            }
            placeholder="Diagnosis details"
          />
        </div>

        <div className="field">
          <label className="label">Treatment</label>
          <input
            className="input"
            value={form.treatment}
            onChange={(e) =>
              setForm({ ...form, treatment: e.target.value })
            }
            placeholder="Treatment plan"
          />
        </div>

        <div className="field">
          <label className="label">Prescriptions</label>
          <textarea
            className="textarea"
            value={form.prescriptions}
            onChange={(e) =>
              setForm({ ...form, prescriptions: e.target.value })
            }
            placeholder="Medicines, dosage, notes"
          />
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={submit}>
            Save History
          </button>
        </div>
      </div>

      {/* ---------- HISTORY LIST ---------- */}
      <div className="section card">
        <h2>📜 Previous History</h2>

        {history.length === 0 ? (
          <div className="empty">No history records found.</div>
        ) : (
          <ul>
            {history.map((h, idx) => (
              <li key={idx} className="row">
                <div>
                  <strong>{h.date || "—"}</strong>
                  <div className="muted">
                    Dx: {h.diagnosis || "-"} • Tx: {h.treatment || "-"} • Rx:{" "}
                    {h.prescriptions || "-"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
          }
