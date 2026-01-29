"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminPage() {
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({ doctors: 0, patients: 0, appointments: 0 });
  const [exec, setexec] = useState("");
  const [search, setSearch] = useState({ users: [], doctors: [], patients: [] });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, kind: null, mode: null, entity: null });

  async function loadSummary() {
    const data = await apiFetch("/admin/summary");
    setSummary(data);
  }
  async function loadAppointments() {
    const data = await apiFetch("/admin/appointments");
    setAppointments(data || []);
  }
  async function runSearch() {
  if (!exec) {
    setResults([]);
    return;
  }
  const data = await apiFetch(`/admin/search?q=${encodeURIComponent(exec)}`);
  setResults(data);
}


  function openModal(kind, mode, entity = null) {
    setModal({ open: true, kind, mode, entity });
  }
  function closeModal() {
    setModal({ open: false, kind: null, mode: null, entity: null });
  }

  async function submitDoctor(form) {
    const path = modal.mode === "add" ? "/admin/doctors" : `/admin/doctors/${modal.entity.id}`;
    const method = modal.mode === "add" ? "POST" : "PUT";
    await apiFetch(path, { method, body: JSON.stringify(form) });
    await Promise.all([loadSummary(), runSearch()]);
    closeModal();
  }

  async function submitPatient(form) {
    const path = modal.mode === "add" ? "/admin/patients" : `/admin/patients/${modal.entity.id}`;
    const method = modal.mode === "add" ? "POST" : "PUT";
    await apiFetch(path, { method, body: JSON.stringify(form) });
    await Promise.all([loadSummary(), runSearch()]);
    closeModal();
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadAppointments()])
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);
useEffect(() => {
  if (!exec) return;
  const t = setTimeout(runSearch, 300);
  return () => clearTimeout(t);
}, [exec]);

  async function blacklistUser(kind, id) {
    try {
      setError("");
      setLoading(true);
      if (kind === "doctor") await apiFetch(`/admin/doctors/${id}`, { method: "DELETE" });
      if (kind === "patient") await apiFetch(`/admin/patients/${id}`, { method: "DELETE" });
      await Promise.all([loadSummary(), runSearch()]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const upcoming = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) > now);
  }, [appointments]);
  const past = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) <= now);
  }, [appointments]);

  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1>Admin Dashboard</h1>
      {error ? <p className="error">{error}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, margin: "12px 0" }}>
        <div className="section"><strong>Doctors</strong><div style={{ fontSize: 24 }}>{summary.doctors}</div></div>
        <div className="section"><strong>Patients</strong><div style={{ fontSize: 24 }}>{summary.patients}</div></div>
        <div className="section"><strong>Appointments</strong><div style={{ fontSize: 24 }}>{summary.appointments}</div></div>
      </div>

      <div className="section">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" value={exec} onChange={(e) => setexec(e.target.value)} placeholder="Search users, doctors, patients" />
          <button className="btn btn-primary" onClick={runSearch} disabled={loading || !exec}>Search</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => openModal("doctor", "add")}>Add Doctor</button>
          <button className="btn" onClick={() => openModal("patient", "add")}>Add Patient</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
          <div>
            <h3>Users</h3>
            <ul>
              {search.users.map(u => (
                <li key={u.id} style={{ marginBottom: 6 }}>
                  {u.username} ({u.role}) — {u.email} {u.is_active ? "" : "[inactive]"}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Doctors</h3>
            <ul>
              {search.doctors.map(d => (
                <li key={d.id} style={{ marginBottom: 6 }}>
                  #{d.id} • user:{d.user_id} • {d.specialization}
                  <button className="btn" style={{ marginLeft: 8 }} onClick={() => openModal("doctor", "edit", d)}>edit</button>
                  <button className="btn" style={{ marginLeft: 8 }} onClick={() => blacklistUser("doctor", d.id)}>blacklist</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Patients</h3>
            <ul>
              {search.patients.map(p => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  #{p.id} • user:{p.user_id} • age:{p.age ?? "-"}
                  <button className="btn" style={{ marginLeft: 8 }} onClick={() => openModal("patient", "edit", p)}>edit</button>
                  <button className="btn" style={{ marginLeft: 8 }} onClick={() => blacklistUser("patient", p.id)}>blacklist</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Upcoming Appointments</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>Doctor</th>
              <th style={{ textAlign: "left" }}>Patient</th>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.doctor_id}</td>
                <td>{a.patient_id}</td>
                <td>{new Date(a.appointment_date).toLocaleString()}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <h2>Past Appointments</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>Doctor</th>
              <th style={{ textAlign: "left" }}>Patient</th>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {past.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.doctor_id}</td>
                <td>{a.patient_id}</td>
                <td>{new Date(a.appointment_date).toLocaleString()}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal.open ? (
        <Modal onClose={closeModal} title={`${modal.mode === 'add' ? 'Add' : 'Edit'} ${modal.kind}`}>
          {modal.kind === 'doctor' ? (
            <DoctorForm mode={modal.mode} entity={modal.entity} onSubmit={submitDoctor} onCancel={closeModal} />
          ) : (
            <PatientForm mode={modal.mode} entity={modal.entity} onSubmit={submitPatient} onCancel={closeModal} />
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

function DoctorForm({ mode, entity, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    username: entity?.username || "",
    email: entity?.email || "",
    password: "",
    specialization: entity?.specialization || "",
    bio: entity?.bio || "",
    availability: entity?.availability || ""
  });
  const canSubmit = (mode === 'add')
    ? form.username && form.email.includes('@') && form.password.length >= 6 && form.specialization
    : true;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="field"><label className="label">Username</label><input className="input" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} required={mode==='add'} /></div>
      <div className="field"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required={mode==='add'} /></div>
      <div className="field"><label className="label">Password {mode==='edit' ? '(leave blank to keep)': ''}</label><input className="input" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} minLength={mode==='add'?6:0} /></div>
      <div className="field"><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={e=>setForm({...form, specialization:e.target.value})} /></div>
      <div className="field"><label className="label">Bio</label><textarea className="textarea" value={form.bio} onChange={e=>setForm({...form, bio:e.target.value})} /></div>
      <div className="field"><label className="label">Availability</label><input className="input" value={form.availability} onChange={e=>setForm({...form, availability:e.target.value})} placeholder="JSON or text" /></div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>{mode==='add'? 'Create' : 'Save'}</button>
      </div>
    </form>
  );
}

function PatientForm({ mode, entity, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    username: entity?.username || "",
    email: entity?.email || "",
    password: "",
    age: entity?.age || "",
    address: entity?.address || "",
    medical_history: entity?.medical_history || ""
  });
  const canSubmit = (mode === 'add')
    ? form.username && form.email.includes('@') && form.password.length >= 6
    : true;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({
      ...form,
      age: form.age ? Number(form.age) : undefined
    }); }}>
      <div className="field"><label className="label">Username</label><input className="input" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} required={mode==='add'} /></div>
      <div className="field"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required={mode==='add'} /></div>
      <div className="field"><label className="label">Password {mode==='edit' ? '(leave blank to keep)': ''}</label><input className="input" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} minLength={mode==='add'?6:0} /></div>
      <div className="field"><label className="label">Age</label><input className="input" type="number" value={form.age} onChange={e=>setForm({...form, age:e.target.value})} /></div>
      <div className="field"><label className="label">Address</label><input className="input" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} /></div>
      <div className="field"><label className="label">Medical History</label><textarea className="textarea" value={form.medical_history} onChange={e=>setForm({...form, medical_history:e.target.value})} /></div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" type="submit" disabled={!canSubmit}>{mode==='add'? 'Create' : 'Save'}</button>
      </div>
    </form>
  );
}


