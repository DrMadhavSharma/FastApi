"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availability, setAvailability] = useState(
    Array.from({ length: 7 }, () => ({ date: "", slots: "" }))
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [treatment, setTreatment] = useState({
    diagnosis: "",
    treatment: "",
    prescription: "",
  });

  // Convert UTC → IST
  function formatIST(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  }

  // Fetch data
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Token not found");

      const [ap, pa] = await Promise.all([
        apiFetch("/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch("/doctors/patients", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setAppointments(ap || []);
      setPatients(pa || []);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Today appointments
  const today = useMemo(() => {
    const now = new Date().toDateString();
    return appointments.filter(
      (a) =>
        new Date(a.appointment_date).toDateString() === now &&
        a.status !== "completed" &&
        a.status !== "cancelled"
    );
  }, [appointments]);

  // Upcoming week
  const week = useMemo(() => {
    const now = new Date();
    const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointments.filter((a) => {
      const t = new Date(a.appointment_date);
      return (
        t >= now &&
        t <= next7 &&
        a.status !== "completed" &&
        a.status !== "cancelled"
      );
    });
  }, [appointments]);

  // Update appointment status
  async function updateStatus(id, status) {
    try {
      await apiFetch(`/doctor/appointments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  // Availability handling
  function updateAvailDay(idx, field, value) {
    setAvailability((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  }

  async function saveAvailability() {
    try {
      await apiFetch("/doctor/availability", {
        method: "PUT",
        body: JSON.stringify({ days: availability }),
      });
      alert("Availability updated successfully");
    } catch (e) {
      setError(e.message);
    }
  }

  // Treatment history
  async function updateTreatment() {
    if (!selectedPatient) {
      alert("Select a patient first");
      return;
    }
    try {
      await apiFetch(`/doctor/patient/${selectedPatient}/history`, {
        method: "POST",
        body: JSON.stringify(treatment),
      });
      alert("Treatment history updated successfully");
      setTreatment({ diagnosis: "", treatment: "", prescription: "" });
    } catch (e) {
      setError(e.message);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container main">
      <h1>👨‍⚕️ Doctor Dashboard</h1>

      {error && <p className="error">{error}</p>}

      <div className="section-container">
        {/* TODAY */}
        <div className="section card">
          <h2>📅 Today’s Appointments</h2>
          {today.length === 0 ? (
            <div className="empty">No appointments today.</div>
          ) : (
            <ul>
              {today.map((a) => (
                <li key={a.id} className="row">
                  <div>
                    <strong>{formatIST(a.appointment_date)}</strong>
                    <div className="muted">
                      Patient #{a.patient_id} — {a.status}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => updateStatus(a.id, "completed")}
                    >
                      Complete
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => updateStatus(a.id, "cancelled")}
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* WEEK */}
        <div className="section card">
          <h2>📆 Upcoming Week</h2>
          {week.length === 0 ? (
            <div className="empty">No appointments this week.</div>
          ) : (
            <ul>
              {week.map((a) => (
                <li key={a.id}>
                  {formatIST(a.appointment_date)} — Patient #{a.patient_id} —{" "}
                  <span className="muted">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* PATIENTS */}
        <div className="section card">
          <h2>🧾 Assigned Patients</h2>
          {patients.length === 0 ? (
            <div className="empty">No patients assigned yet.</div>
          ) : (
            <ul>
              {patients.map((p) => (
                <li
                  key={p.id}
                  className={
                    selectedPatient === p.id ? "pill active" : "pill"
                  }
                  onClick={() => setSelectedPatient(p.id)}
                >
                  <strong>{p.username}</strong>
                  <div className="muted">
                    Age: {p.age ?? "-"} | {p.email || "N/A"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* TREATMENT */}
        {selectedPatient && (
          <div className="section card">
            <h2>💊 Update Treatment — Patient #{selectedPatient}</h2>

            <div className="field">
              <input
                className="input"
                placeholder="Diagnosis"
                value={treatment.diagnosis}
                onChange={(e) =>
                  setTreatment({ ...treatment, diagnosis: e.target.value })
                }
              />
            </div>

            <div className="field">
              <input
                className="input"
                placeholder="Treatment"
                value={treatment.treatment}
                onChange={(e) =>
                  setTreatment({ ...treatment, treatment: e.target.value })
                }
              />
            </div>

            <div className="field">
              <input
                className="input"
                placeholder="Prescription"
                value={treatment.prescription}
                onChange={(e) =>
                  setTreatment({
                    ...treatment,
                    prescription: e.target.value,
                  })
                }
              />
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={updateTreatment}>
                Save History
              </button>
            </div>
          </div>
        )}

        {/* AVAILABILITY */}
        <div className="section card">
          <h2>🕒 Availability (Next 7 Days)</h2>

          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Slots</th>
              </tr>
            </thead>
            <tbody>
              {availability.map((d, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <input
                      className="input"
                      placeholder="YYYY-MM-DD"
                      value={d.date}
                      onChange={(e) =>
                        updateAvailDay(idx, "date", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      placeholder="09:00-12:00, 16:00-18:00"
                      value={d.slots}
                      onChange={(e) =>
                        updateAvailDay(idx, "slots", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="actions">
            <button className="btn btn-primary" onClick={saveAvailability}>
              Save Availability
            </button>
          </div>
        </div>
      </div>
    </div>
  );
              }
