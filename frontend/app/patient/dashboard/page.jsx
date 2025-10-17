"use client";

import { useEffect, useState } from "react";

export default function PatientDashboard() {
  const [user, setUser] = useState({ name: "Patient" });
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({
    doctor_id: "",
    appointment_date: "",
    notes: "",
  });
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    password: "",
    age: "",
    address: "",
    medical_history: "",
  });

const API_URL = process.env.NEXT_PUBLIC_API_BASE;
  function formatIST(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}
  // Fetch appointments and doctors
  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("Token not found");

        const [apptRes, docRes] = await Promise.all([
          fetch(`${API_URL}/appointments`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/doctors`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!apptRes.ok || !docRes.ok) throw new Error("Failed to fetch data");

        const appts = await apptRes.json();
        const docs = await docRes.json();

        setAppointments(appts || []);
        setDoctors(docs || []);

        // Unique specializations
        setSpecializations([...new Set((docs || []).map(d => d.specialization))]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Specialization filter
  const handleSpecializationChange = async (e) => {
    const spec = e.target.value;
    setSelectedSpec(spec);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token found");

      const url = spec
        ? `${API_URL}/doctors/search?q=${encodeURIComponent(spec)}`
        : `${API_URL}/doctors`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setDoctors(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookingChange = (e) => {
    setBooking({ ...booking, [e.target.name]: e.target.value });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token found");

      const res = await fetch(`${API_URL}/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          doctor_id: booking.doctor_id,
          appointment_date: new Date(booking.appointment_date).toISOString(),
          notes: booking.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Booking failed");

      alert(data.message);
      setAppointments([...appointments, data.appointment]);
      setBooking({ doctor_id: "", appointment_date: "", notes: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (apptId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token found");

      const res = await fetch(`${API_URL}/appointments/cancel/${apptId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Cancel failed");
      }

      setAppointments(prev =>
        prev.map(appt => (appt.id === apptId ? { ...appt, status: "cancelled" } : appt))
      );
      alert("Appointment cancelled successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  // Profile form handlers
  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No token found");

      const res = await fetch(`${API_URL}/patient/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Update failed");

      alert("Profile updated successfully!");
      setProfile({ username: "", email: "", password: "", age: "", address: "", medical_history: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="grid-center">
        <div className="spinner"></div>
        <p style={{ marginTop: "12px", color: "var(--muted)" }}></p>
      </div>
    );
  }

  return (
    <div className="main container">
      <h1 style={{ textAlign: "center", marginBottom: "24px" }}>👋 Welcome, {user.name}</h1>

      {/* Specialization filter */}
      <div className="section" style={{ marginBottom: "20px" }}>
        <label className="label">Filter by Specialization:</label>
        <select className="select" value={selectedSpec} onChange={handleSpecializationChange} style={{ width: "250px" }}>
          <option value="">All</option>
          {specializations.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
      </div>

      {/* Doctors table */}
      <div className="section">
        <h2>👨‍⚕️ Available Doctors</h2>
        {doctors.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center" }}>No doctors found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text)" }}>
            <thead>
              <tr>
                {["ID", "Name", "Specialization", "Email"].map(h => (
                  <th key={h} style={{ borderBottom: "1px solid var(--border)", textAlign: "left", padding: "8px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map(doc => (
                <tr key={doc.id}>
                  <td style={{ padding: "8px" }}>{doc.id}</td>
                  <td style={{ padding: "8px" }}>{doc.username}</td>
                  <td style={{ padding: "8px" }}>{doc.specialization}</td>
                  <td style={{ padding: "8px" }}>{doc.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Booking form */}
      <div className="section-container">
        <div className="card">
          <h2>🩺 Book Appointment</h2>
          <form onSubmit={handleBookingSubmit}>
            <div className="field">
              <label className="label">Doctor</label>
              <select className="select" name="doctor_id" value={booking.doctor_id} onChange={handleBookingChange} required>
                <option value="">Select doctor</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.username} — {doc.specialization}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Date & Time</label>
              <input type="datetime-local" className="input" name="appointment_date" value={formatIST(booking.appointment_date)} onChange={handleBookingChange} required />
            </div>
            <div className="field">
              <label className="label">Notes</label>
              <textarea className="textarea" name="notes" value={booking.notes} onChange={handleBookingChange} placeholder="Message for the doctor..." />
            </div>
            <div className="actions">
              <button type="submit" className="btn btn-primary">Book Appointment</button>
            </div>
          </form>
        </div>

        {/* Update profile */}
        <div className="card" >
          <h2>🧑‍💼 Update Profile</h2>
          <form onSubmit={handleProfileSubmit} style={{ marginTop: "12px" }}>
            <div className="grid" style={{ display: "grid", gap: "10px" }}>
              <input type="text" name="username" className="input" placeholder="Username" value={profile.username} onChange={handleProfileChange} />
              <input type="email" name="email" className="input" placeholder="Email" value={profile.email} onChange={handleProfileChange} />
              <input type="password" name="password" className="input" placeholder="New Password" value={profile.password} onChange={handleProfileChange} />
              <input type="number" name="age" className="input" placeholder="Age" value={profile.age} onChange={handleProfileChange} />
              <input type="text" name="address" className="input" placeholder="Address" value={profile.address} onChange={handleProfileChange} />
              <textarea name="medical_history" className="textarea" placeholder="Medical history" value={profile.medical_history} onChange={handleProfileChange} />
            </div>
            <div className="actions" style={{ marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary">Update Profile</button>
            </div>
          </form>
        </div>
      </div>

      {/* Appointments table */}
      <div className="section">
        <h2>📅 My Appointments</h2>
        {appointments.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center" }}>No appointments yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text)" }}>
            <thead>
              <tr>
                {["Doctor", "Date & Time", "Status", "Notes", "Cancel"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map(appt => {
                const doctor = doctors.find(d => d.id === appt.doctor_id);
                const statusColor =
                  appt.status === "confirmed" ? "var(--success)" :
                  appt.status === "cancelled" ? "var(--danger)" :
                  appt.status === "pending" ? "var(--warning)" : "var(--muted)";

                return (
                  <tr key={appt.id}>
                    <td style={{ padding: "8px" }}>{doctor?.username || "Unknown"}</td>
                    <td style={{ padding: "8px" }}>{formatIST(appt.appointment_date)}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: statusColor,
                        border: `1px solid ${statusColor}40`,
                        background: "rgba(255,255,255,0.05)",
                      }}>{appt.status}</span>
                    </td>
                    <td style={{ padding: "8px" }}>{appt.notes || "—"}</td>
                    <td style={{ padding: "8px" }}>
                      {appt.status !== "cancelled" && (
                        <button className="btn-cancel" onClick={() => handleCancel(appt.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
