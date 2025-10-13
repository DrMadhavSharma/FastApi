"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(Array(7).fill({ date: "", slots: "" }));

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [ap, pa] = await Promise.all([
        apiFetch("/doctor/appointments"),
        apiFetch("/doctor/patients"),
      ]);
      setAppointments(ap || []);
      setPatients(pa || []);
    } catch (e) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, []);

  const today = useMemo(() => {
    const d = new Date();
    return appointments.filter(a => new Date(a.appointment_date).toDateString() === d.toDateString());
  }, [appointments]);
  const week = useMemo(() => {
    const now = new Date();
    const next7 = new Date(now.getTime() + 7*24*60*60*1000);
    return appointments.filter(a => {
      const t = new Date(a.appointment_date);
      return t >= now && t <= next7;
    });
  }, [appointments]);

  async function updateStatus(id, status) {
    try { await apiFetch(`/doctor/appointments/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); loadData(); }
    catch (e) { setError(e.message); }
  }

  function updateAvailDay(idx, field, value) {
    setAvailability(prev => prev.map((d, i) => i===idx ? { ...d, [field]: value } : d));
  }
  async function saveAvailability() {
    try { await apiFetch("/doctor/availability", { method: "PUT", body: JSON.stringify({ days: availability }) }); alert("Availability updated"); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1>Doctor Dashboard</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="section">
        <h2>Today's Appointments</h2>
        <ul>
          {today.map(a => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              {new Date(a.appointment_date).toLocaleString()} • patient:{a.patient_id} • status:{a.status}
              <button className="btn" style={{ marginLeft: 8 }} onClick={() => updateStatus(a.id, "completed")}>mark completed</button>
              <button className="btn" style={{ marginLeft: 8 }} onClick={() => updateStatus(a.id, "canceled")}>cancel</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Week Appointments</h2>
        <ul>
          {week.map(a => (
            <li key={a.id} style={{ marginBottom: 6 }}>
              {new Date(a.appointment_date).toLocaleString()} • patient:{a.patient_id} • status:{a.status}
            </li>
          ))}
        </ul>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Assigned Patients</h2>
        <ul>
          {patients.map(p => (
            <li key={p.id} style={{ marginBottom: 6 }}>
              #{p.id} • {p.username} • age:{p.age ?? "-"}
              <a className="btn" style={{ marginLeft: 8 }} href={`/doctor/patient/${p.id}`}>update history</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Provide Availability (next 7 days)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, minmax(0, 1fr))", gap: 10 }}>
          {availability.map((d, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <input className="input" placeholder="YYYY-MM-DD" value={d.date} onChange={e=>updateAvailDay(idx, 'date', e.target.value)} />
              <input className="input" placeholder="09:00-12:00, 16:00-18:00" value={d.slots} onChange={e=>updateAvailDay(idx, 'slots', e.target.value)} />
            </div>
          ))}
        </div>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" onClick={saveAvailability}>Save</button>
        </div>
      </div>
    </div>
  );
}


