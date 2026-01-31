"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminPage() {
  const [summary, setSummary] = useState({ doctors: 0, patients: 0, appointments: 0 });
  const [query, setquery] = useState("");
  const [search, setSearch] = useState({ users: [], doctors: [], patients: [] });
  const [appointments, setAppointments] = useState([]);
  const [exporting, setExporting] = useState(false);
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
  if (!query) {
    setSearch({ users: [], doctors: [], patients: [] });
    return;
  }
  const data = await apiFetch(`/admin/search?q=${encodeURIComponent(query)}`);
  setSearch(data);   // ✅ CORRECT
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
  if (!query) return;
  const t = setTimeout(runSearch, 300);
  return () => clearTimeout(t);
}, [query]);

  async function blacklistUser(kind, id) {
  try {
    if (!["doctor", "patient"].includes(kind)) {
      throw new Error("Invalid blacklist type");
    }

    setError("");
    setLoading(true);

    const endpoint =
      kind === "doctor"
        ? `/admin/doctors/${id}`
        : `/admin/patients/${id}`;

    await apiFetch(endpoint, { method: "DELETE" });

    await Promise.all([
      loadSummary(),
      query ? runSearch() : Promise.resolve()
    ]);
  } catch (e) {
    setError(e.message || "Failed to blacklist");
  } finally {
    setLoading(false);
  }
}
async function deleteEntity(kind, id) {
  const ok = window.confirm("This will permanently delete the record. Continue?");
  if (!ok) return;

  try {
    setError("");
    setLoading(true);

    let url = "";
    if (kind === "doctor") url = `/admin/doctors/delete/${id}`;
    if (kind === "patient") url = `/admin/patients/delete/${id}`;

    await apiFetch(url, { method: "DELETE" });

    await loadSummary();
    await runSearch();
  } catch (e) {
    setError(e.message || "Delete failed");
  } finally {
    setLoading(false);
  }
}async function exportSystemCsv() {
  try {
    setExporting(true);

    const res = await apiFetch("/admin/export-system-csv", {
      method: "POST",
    });

    const data = await res;
    pollForCsv(data.task_id);
  } catch (e) {
    setError(e.message || "Export failed");
  } finally {
    setExporting(false);
  }
}
  
  function pollForCsv(taskId) {
  const token = localStorage.getItem("access_token");

  const interval = setInterval(async () => {
    const res = await apiFetch(
  `https://fastapi-6mjn.onrender.com/admin/export-system-csv/${taskId}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "system_export.csv";
      a.click();

      window.URL.revokeObjectURL(url);
      clearInterval(interval);
    }
  }, 3000); // poll every 3 sec
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
      <button className="btn btn-primary" disabled={exporting} onClick={exportSystemCsv}>
      {exporting ? "Exporting..." : "Export System CSV"}
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, margin: "12px 0" }}>
        <div className="section"><strong>Doctors</strong><div style={{ fontSize: 24 }}>{summary.doctors}</div></div>
        <div className="section"><strong>Patients</strong><div style={{ fontSize: 24 }}>{summary.patients}</div></div>
        <div className="section"><strong>Appointments</strong><div style={{ fontSize: 24 }}>{summary.appointments}</div></div>
      </div>

      <div className="section">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" value={query} onChange={(e) => setquery(e.target.value)} placeholder="Search users, doctors, patients" />
          <button className="btn btn-primary" onClick={runSearch} disabled={loading || !query}>Search</button>
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
                  <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={() => deleteEntity("doctor", d.id)}>delete</button>
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
                  <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={() => deleteEntity("patient", p.id)}>delete</button>
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


