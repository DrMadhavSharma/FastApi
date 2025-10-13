"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

export default function UpdatePatientHistory() {
  const params = useParams();
  const patientId = params?.id;
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ diagnosis: "", treatment: "", prescriptions: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await apiFetch(`/doctor/patient/${patientId}/history`);
      setHistory(data || []);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (patientId) load(); }, [patientId]);

  async function submit() {
    try {
      await apiFetch(`/doctor/patient/${patientId}/history`, { method: "POST", body: JSON.stringify(form) });
      setForm({ diagnosis: "", treatment: "", prescriptions: "" });
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1>Update Patient History</h1>
      {error ? <p className="error">{error}</p> : null}
      <div className="section">
        <div className="field"><label className="label">Diagnosis</label><input className="input" value={form.diagnosis} onChange={e=>setForm({...form, diagnosis:e.target.value})} /></div>
        <div className="field"><label className="label">Treatment</label><input className="input" value={form.treatment} onChange={e=>setForm({...form, treatment:e.target.value})} /></div>
        <div className="field"><label className="label">Prescriptions</label><textarea className="textarea" value={form.prescriptions} onChange={e=>setForm({...form, prescriptions:e.target.value})} /></div>
        <div className="actions"><button className="btn btn-primary" onClick={submit}>Save</button></div>
      </div>
      <div className="section" style={{ marginTop: 12 }}>
        <h2>History</h2>
        <ul>
          {history.map((h, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              {h.date} • Dx:{h.diagnosis} • Tx:{h.treatment} • Rx:{h.prescriptions}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


