"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminPage() {
  const [summary, setSummary] = useState({ doctors: 0, patients: 0, appointments: 0 });
  const [query, setQuery] = useState("");
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
    setSearch(data);
  }

  function openModal(kind, mode, entity = null) {
    setModal({ open: true, kind, mode, entity });
  }

  function closeModal() {
    setModal({ open: false, kind: null, mode: null, entity: null });
  }

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

  const upcoming = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) > now);
  }, [appointments]);

  const past = useMemo(() => {
    const now = new Date();
    return appointments.filter(a => new Date(a.appointment_date) <= now);
  }, [appointments]);

  return (
    <main className="main">
      <div className="container">
        <h1>Admin Dashboard</h1>
        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button className="btn btn-primary" disabled={exporting} onClick={exportSystemCsv}>
            {exporting ? "Exporting..." : "Export System CSV"}
          </button>
        </div>

        {/* SUMMARY */}
        <div className="section-container">
          <div className="section">
            <strong>Doctors</strong>
            <div style={{ fontSize: 24 }}>{summary.doctors}</div>
          </div>
          <div className="section">
            <strong>Patients</strong>
            <div style={{ fontSize: 24 }}>{summary.patients}</div>
          </div>
          <div className="section">
            <strong>Appointments</strong>
            <div style={{ fontSize: 24 }}>{summary.appointments}</div>
          </div>
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
            <button className="btn btn-primary" onClick={runSearch} disabled={!query || loading}>
              Search
            </button>
            <button className="btn" onClick={() => openModal("doctor", "add")}>Add Doctor</button>
            <button className="btn" onClick={() => openModal("patient", "add")}>Add Patient</button>
          </div>

          <div className="section-container">
            <List title="Users" items={search.users} render={u => (
              <li key={u.id}>{u.username} ({u.role}) — {u.email}</li>
            )} />

            <List title="Doctors" items={search.doctors} render={d => (
              <li key={d.id}>
                #{d.id} • {d.specialization}
                <button className="btn" onClick={() => openModal("doctor", "edit", d)}>Edit</button>
              </li>
            )} />

            <List title="Patients" items={search.patients} render={p => (
              <li key={p.id}>
                #{p.id} • age {p.age ?? "-"}
                <button className="btn" onClick={() => openModal("patient", "edit", p)}>Edit</button>
              </li>
            )} />
          </div>
        </div>

        {/* APPOINTMENTS */}
        <AppointmentTable title="Upcoming Appointments" data={upcoming} />
        <AppointmentTable title="Past Appointments" data={past} />

        {modal.open && (
          <Modal title={`${modal.mode === "add" ? "Add" : "Edit"} ${modal.kind}`} onClose={closeModal}>
            {modal.kind === "doctor"
              ? <DoctorForm mode={modal.mode} entity={modal.entity} onCancel={closeModal} />
              : <PatientForm mode={modal.mode} entity={modal.entity} onCancel={closeModal} />
            }
          </Modal>
        )}
      </div>
    </main>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function List({ title, items, render }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>{items.map(render)}</ul>
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
