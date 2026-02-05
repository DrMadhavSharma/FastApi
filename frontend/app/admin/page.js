"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

/* =======================
   ADMIN PAGE
======================= */

export default function AdminPage() {
  const [summary, setSummary] = useState({ doctors: 0, patients: 0, appointments: 0 });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState({ users: [], doctors: [], patients: [] });
  const [appointments, setAppointments] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, kind: null, mode: null, entity: null });

  /* ---------- Loaders ---------- */

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
    setSearch(data);
  }

  /* ---------- Modal ---------- */

  function openModal(kind, mode, entity = null) {
    setModal({ open: true, kind, mode, entity });
  }

  function closeModal() {
    setModal({ open: false, kind: null, mode: null, entity: null });
  }

  /* ESC closes modal */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- CRUD ---------- */

  async function submitDoctor(form) {
    const path = modal.mode === "add"
      ? "/admin/doctors"
      : `/admin/doctors/${modal.entity.id}`;

    const method = modal.mode === "add" ? "POST" : "PUT";

    await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    await Promise.all([loadSummary(), runSearch()]);
    closeModal();
  }

  async function submitPatient(form) {
    const path = modal.mode === "add"
      ? "/admin/patients"
      : `/admin/patients/${modal.entity.id}`;

    const method = modal.mode === "add" ? "POST" : "PUT";

    await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    await Promise.all([loadSummary(), runSearch()]);
    closeModal();
  }

  async function deleteEntity(kind, id) {
    const ok = window.confirm("This will permanently delete the record. Continue?");
    if (!ok) return;

    const url =
      kind === "doctor"
        ? `/admin/doctors/delete/${id}`
        : `/admin/patients/delete/${id}`;

    setLoading(true);
    try {
      await apiFetch(url, { method: "DELETE" });
      await Promise.all([loadSummary(), runSearch()]);
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- CSV Export ---------- */

  async function exportSystemCsv() {
    try {
      setExporting(true);
      const data = await apiFetch("/admin/export-system-csv", { method: "POST" });
      pollForCsv(data.task_id);
    } catch (e) {
      setError(e.message || "Export failed");
      setExporting(false);
    }
  }

  function pollForCsv(taskId) {
    const token = localStorage.getItem("access_token");
    const interval = setInterval(async () => {
      const res = await fetch(
        `https://fastapi-6mjn.onrender.com/admin/export-system-csv/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "system_export.csv";
        a.click();
        URL.revokeObjectURL(url);
        clearInterval(interval);
        setExporting(false);
      }
    }, 3000);
  }

  /* ---------- Effects ---------- */

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadAppointments()])
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query) return;
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Derived ---------- */

  const upcoming = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) > now);
  }, [appointments]);

  const past = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) <= now);
  }, [appointments]);

  /* =======================
     RENDER
  ======================= */

  return (
    <main className="main">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}

      {exporting && (
        <div className="export-toast">
          <div className="spinner" />
          <span>Exporting system CSV…</span>
        </div>
      )}

      <div className="container" style={{ paddingTop: 20 }}>
        <h1>Admin Dashboard</h1>
        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" onClick={exportSystemCsv} disabled={exporting}>
          Export System CSV
        </button>

        {/* SUMMARY */}
        <div className="section-container">
          <div className="section"><strong>Doctors</strong><div>{summary.doctors}</div></div>
          <div className="section"><strong>Patients</strong><div>{summary.patients}</div></div>
          <div className="section"><strong>Appointments</strong><div>{summary.appointments}</div></div>
        </div>

        {/* SEARCH */}
        <div className="section">
          <div className="actions">
            <input
              className="input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search users, doctors, patients"
            />
            <button className="btn btn-primary" onClick={runSearch}>Search</button>
            <button className="btn" onClick={() => openModal("doctor", "add")}>Add Doctor</button>
            <button className="btn" onClick={() => openModal("patient", "add")}>Add Patient</button>
          </div>

          <div className="section-container">
            <EntityList
              title="Doctors"
              items={search.doctors}
              kind="doctor"
              onEdit={d => openModal("doctor", "edit", d)}
              onDelete={id => deleteEntity("doctor", id)}
              renderText={d => `#${d.id} • ${d.specialization}`}
            />

            <EntityList
              title="Patients"
              items={search.patients}
              kind="patient"
              onEdit={p => openModal("patient", "edit", p)}
              onDelete={id => deleteEntity("patient", id)}
              renderText={p => `#${p.id} • age ${p.age ?? "-"}`}
            />
          </div>
        </div>

        <AppointmentTable title="Upcoming Appointments" data={upcoming} />
        <AppointmentTable title="Past Appointments" data={past} />

        {modal.open && (
          <Modal title={`${modal.mode === "add" ? "Add" : "Edit"} ${modal.kind}`} onClose={closeModal}>
            {modal.kind === "doctor"
              ? <DoctorForm mode={modal.mode} entity={modal.entity} onSubmit={submitDoctor} onCancel={closeModal} />
              : <PatientForm mode={modal.mode} entity={modal.entity} onSubmit={submitPatient} onCancel={closeModal} />
            }
          </Modal>
        )}
      </div>
    </main>
  );
}

/* =======================
   SMALL COMPONENTS
======================= */

function EntityList({ title, items, kind, onEdit, onDelete, renderText }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {items.map(item => (
          <li key={item.id} className={kind === "doctor" ? "row-doctor" : "row-patient"}>
            <div className="row">
              <span>{renderText(item)}</span>
              <div className="row-actions">
                <button className="btn" onClick={() => onEdit(item)}>Edit</button>
                <button className="btn btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AppointmentTable({ title, data }) {
  return (
    <div className="section">
      <h2>{title}</h2>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th><th>Doctor</th><th>Patient</th><th>Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(a => (
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
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =======================
   FORMS
======================= */

function DoctorForm({ mode, entity, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    username: entity?.username || "",
    email: entity?.email || "",
    password: "",
    specialization: entity?.specialization || "",
    bio: entity?.bio || "",
    availability: entity?.availability || ""
  });

  const canSubmit =
    mode === "add"
      ? form.username && form.email.includes("@") && form.password.length >= 6
      : true;

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <Input label="Username" value={form.username} onChange={v => setForm({ ...form, username: v })} />
      <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
      <Input label={`Password ${mode === "edit" ? "(optional)" : ""}`} type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} />
      <Input label="Specialization" value={form.specialization} onChange={v => setForm({ ...form, specialization: v })} />
      <Textarea label="Bio" value={form.bio} onChange={v => setForm({ ...form, bio: v })} />
      <Input label="Availability" value={form.availability} onChange={v => setForm({ ...form, availability: v })} />
      <FormActions onCancel={onCancel} canSubmit={canSubmit} />
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

  const canSubmit =
    mode === "add"
      ? form.username && form.email.includes("@") && form.password.length >= 6
      : true;

  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({ ...form, age: form.age ? Number(form.age) : undefined });
    }}>
      <Input label="Username" value={form.username} onChange={v => setForm({ ...form, username: v })} />
      <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
      <Input label={`Password ${mode === "edit" ? "(optional)" : ""}`} type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} />
      <Input label="Age" type="number" value={form.age} onChange={v => setForm({ ...form, age: v })} />
      <Input label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
      <Textarea label="Medical History" value={form.medical_history} onChange={v => setForm({ ...form, medical_history: v })} />
      <FormActions onCancel={onCancel} canSubmit={canSubmit} />
    </form>
  );
}

/* ---------- Reusable Inputs ---------- */

function Input({ label, type = "text", value, onChange }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <textarea className="textarea" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function FormActions({ onCancel, canSubmit }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>Save</button>
    </div>
  );
}
