"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availability, setAvailability] = useState(
    Array(7).fill({ date: "", slots: "" })
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [treatment, setTreatment] = useState({
    diagnosis: "",
    treatment: "",
    prescription: "",
  });
  const router = useRouter();

  // Convert UTC → IST
  function formatIST(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  }

  // 🧭 Fetch Data
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

  // 📅 Filter Appointments
  const today = useMemo(() => {
    const now = new Date().toDateString();
    return appointments.filter(
      (a) =>
        new Date(a.appointment_date).toDateString() === now &&
        a.status !== "completed" && a.status!=="cancelled"
    );
  }, [appointments]);

  const week = useMemo(() => {
    const now = new Date();
    const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return appointments.filter((a) => {
  const t = new Date(a.appointment_date);
  return t >= now && t <= next7 && a.status !== "completed" && a.status !== "cancelled";
});


  }, [appointments]);

  // 🔄 Update Appointment Status
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

  // 📆 Manage Availability
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

  // 💊 Update Patient Treatment History
  async function updateTreatment() {
    if (!selectedPatient) return alert("Select a patient first");
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

  if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner"></div>
        <p style={{ marginTop: "12px", color: "var(--muted)" }}></p>
      </div>
    );
  }

  // 🧱 UI Rendering
  return (
    <div className="container main">
      <h1 className="text-3xl font-bold mb-6">👨‍⚕️ Doctor Dashboard</h1>

      <div className="section-container">

        {error && <p className="error">{error}</p>}
        {loading && <div className="spinner"></div>}

        {/* -------------------- TODAY’S APPOINTMENTS -------------------- */}
        <div className="section card">
          <h2 className="text-xl font-semibold mb-3">
            📅 Today's Appointments
          </h2>
          {today.length === 0 ? (
            <p className="text-muted">No appointments today.</p>
          ) : (
            <ul className="space-y-2">
              {today.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between items-center border-b border-[rgba(255,255,255,0.08)] py-2"
                >
                  <div>
                    <b>{formatIST(a.appointment_date)}</b> —{" "}
                    <span className="text-muted">
                      Patient #{a.patient_id} — <i>{a.status}</i>
                    </span>
                  </div>
                  <div className="actions">
                    <button
                      onClick={() => updateStatus(a.id, "completed")}
                      className="btn btn-primary"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateStatus(a.id, "cancelled")}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -------------------- WEEKLY APPOINTMENTS -------------------- */}
        <div className="section card">
          <h2 className="text-xl font-semibold mb-3">📆 Upcoming Week</h2>
          {week.length === 0 ? (
            <p className="text-muted">No appointments this week.</p>
          ) : (
            <ul className="space-y-2">
              {week.map((a) => (
                <li
                  key={a.id}
                  className="border-b border-[rgba(255,255,255,0.08)] py-2"
                >
                  {formatIST(a.appointment_date)} — Patient #{a.patient_id} —{" "}
                  <span className="text-muted">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -------------------- PATIENT LIST -------------------- */}
        <div className="section card">
          <h2 className="text-xl font-semibold mb-3">🧾 Assigned Patients</h2>
          {patients.length === 0 ? (
            <p className="text-muted">No patients assigned yet.</p>
          ) : (
            <ul className="grid gap-2">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className={`p-3 rounded-md border transition cursor-pointer ${
                    selectedPatient === p.id
                      ? "bg-[rgba(109,140,255,0.15)] border-[var(--primary)]"
                      : "border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)]"
                  }`}
                  onClick={() => setSelectedPatient(p.id)}
                >
                  <b>{p.username}</b> — Age: {p.age ?? "-"}
                  <br />
                  <span className="text-muted text-sm">
                    Email: {p.email || "N/A"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -------------------- TREATMENT HISTORY UPDATE -------------------- */}
        {selectedPatient && (
          <div className="section card">
            <h2 className="text-xl font-semibold mb-3">
              💊 Update Treatment — Patient #{selectedPatient}
            </h2>
            <div className="grid gap-3">
              <input
                className="input"
                placeholder="Diagnosis"
                value={treatment.diagnosis}
                onChange={(e) =>
                  setTreatment({ ...treatment, diagnosis: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Treatment"
                value={treatment.treatment}
                onChange={(e) =>
                  setTreatment({ ...treatment, treatment: e.target.value })
                }
              />
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
              <div className="actions">
                <button onClick={updateTreatment} className="btn btn-primary">
                  Save History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 7-DAY AVAILABILITY -------------------- */}
        <div className="section card">
  <h2 className="text-xl font-semibold mb-3">
    🕒 Availability (Next 7 Days)
  </h2>

  {availability.length === 0 ? (
    <p style={{ color: "var(--muted)", textAlign: "center" }}>
      No availability set.
    </p>
  ) : (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        color: "var(--text)"
      }}
    >
      <thead>
        <tr>
          {["Day", "Date", "Slots"].map((h) => (
            <th
              key={h}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                textAlign: "left",
                padding: "8px"
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {availability.map((d, idx) => (
          <tr key={idx}>
            <td style={{ padding: "8px" }}>{idx + 1}</td>
            <td style={{ padding: "8px" }}>
              <input
                className="input"
                placeholder="YYYY-MM-DD"
                value={d.date}
                onChange={(e) => updateAvailDay(idx, "date", e.target.value)}
              />
            </td>
            <td style={{ padding: "8px" }}>
              <input
                className="input"
                placeholder="09:00-12:00, 16:00-18:00"
                value={d.slots}
                onChange={(e) => updateAvailDay(idx, "slots", e.target.value)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  <div className="actions mt-3">
    <button onClick={saveAvailability} className="btn btn-primary">
      Save Availability
    </button>
  </div>
</div>


      </div>
    </div>
  );
}
