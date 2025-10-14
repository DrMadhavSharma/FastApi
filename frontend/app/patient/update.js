"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function PatientUpdate() {
  // const [specializations, setSpecializations] = useState([]);
  // const [doctors, setDoctors] = useState([]);
  // const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState({ username: "", email: "", age: "", address: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // const [specs, docs, appts, prof] = await Promise.all([
      //   // apiFetch("/patient/appointments"),
      //   // apiFetch("/patient/profile"),
      // ]);
      // setSpecializations(specs || []);
      // setDoctors(docs || []);
      // setAppointments(appts || []);
      setProfile({
        username: prof?.username || "",
        email: prof?.email || "",
        age: prof?.age || "",
        address: prof?.address || "",
      });
    } catch (e) { setError(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // const upcoming = useMemo(() => {
  //   const now = new Date();
  //   return appointments.filter(a => new Date(a.appointment_date) >= now);
  // }, [appointments]);
  // const past = useMemo(() => {
  //   const now = new Date();
  //   return appointments.filter(a => new Date(a.appointment_date) < now);
  // }, [appointments]);

  async function saveProfile() {
    try { await apiFetch("/patient/profile", { method: "PUT", body: JSON.stringify(profile) }); }
    catch (e) { setError(e.message); }
  }
  // async function book(doctorId, date) {
  //   try { await apiFetch("/appointments", { method: "POST", body: JSON.stringify({ doctor_id: doctorId, appointment_date: date }) }); await load(); }
  //   catch (e) { setError(e.message); }
  // }
  if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner"></div>
        <p style={{ marginTop: "12px", color: "var(--muted)" }}></p>
      </div>
    );
  }  
  // if (error) return <p className="text-center text-red-600 mt-10">{error}</p>;

  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1>UPDATE</h1>
      {error ? <p className="error">{error}</p> : null}
{/* 
      <div className="section">
        <h2>Departments</h2>
        <ul>
          {specializations.map((s, idx) => <li key={idx}>{s}</li>)}
        </ul>
      </div> */}

      {/* <div className="section" style={{ marginTop: 12 }}>
        <h2>Doctors & Availability</h2>
        <ul>
          {doctors.map(d => (
            <li key={d.id} style={{ marginBottom: 8 }}>
              <strong>Dr. {d.username}</strong> — {d.specialization}
              <div style={{ color: "var(--muted)" }}>{d.bio}</div>
              <div style={{ marginTop: 6 }}>
                {(d.availability || []).map((day, i) => (
                  <button key={i} className="btn" style={{ marginRight: 6, marginBottom: 6 }} onClick={() => book(d.id, day.date)}>
                    {day.date} {day.slots}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div> */}

      {/* <div className="section" style={{ marginTop: 12 }}>
        <h2>Past History</h2>
        <ul>
          {past.map(h => (
            <li key={h.id}>
              {new Date(h.appointment_date).toLocaleString()} — Dx:{h.diagnosis || '-'} • Rx:{h.prescriptions || '-'}
            </li>
          ))}
        </ul>
      </div> */}

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Edit Profile</h2>
        <div className="field"><label className="label">Username</label><input className="input" value={profile.username} onChange={e=>setProfile({...profile, username:e.target.value})} /></div>
        <div className="field"><label className="label">Email</label><input className="input" type="email" value={profile.email} onChange={e=>setProfile({...profile, email:e.target.value})} /></div>
        <div className="field"><label className="label">Age</label><input className="input" type="number" value={profile.age} onChange={e=>setProfile({...profile, age:e.target.value})} /></div>
        <div className="field"><label className="label">Address</label><input className="input" value={profile.address} onChange={e=>setProfile({...profile, address:e.target.value})} /></div>
        <div className="actions"><button className="btn btn-primary" onClick={saveProfile}>Save</button></div>
      </div>
    </div>
  );
}


