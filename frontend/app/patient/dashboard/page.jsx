"use client";

import { useEffect, useState } from "react";

export default function PatientDashboard({ token }) {
  const [user, setUser] = useState({ name: "Patient" });
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({
    doctor_id: "",
    appointment_date: "",
    notes: "",
  });

  const API_URL = "http://localhost:8000";

  // Fetch doctors and appointments
  useEffect(() => {
    async function fetchData() {
      try {const token = localStorage.getItem("access_token");
        if (!token) {
  console.error("Token not found in localStorage");
}

        const [apptRes, docRes] = await Promise.all([
          fetch(`${API_URL}/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/doctors`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const appts = await apptRes.json();
        const docs = await docRes.json();
        setAppointments(appts.appointments || []);
        setDoctors(docs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  // Handle booking input changes
  const handleChange = (e) => {
    setBooking({ ...booking, [e.target.name]: e.target.value });
  };

  // Submit appointment booking
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/appointments/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_id: booking.doctor_id,
          appointment_date: new Date(booking.appointment_date).toISOString(),
          notes: booking.notes,
        }),
      });
      if (!res.ok) throw new Error("Booking failed");
      const data = await res.json();
      alert(data.message);
      setAppointments([...appointments, data.appointment]);
      setBooking({ doctor_id: "", appointment_date: "", notes: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Welcome, {user.name}</h1>

      <section>
        <h2>Book an Appointment</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Doctor:
            <select
              name="doctor_id"
              value={booking.doctor_id}
              onChange={handleChange}
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.username} - {doc.specialization}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date & Time:
            <input
              type="datetime-local"
              name="appointment_date"
              value={booking.appointment_date}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Notes:
            <textarea
              name="notes"
              value={booking.notes}
              onChange={handleChange}
            />
          </label>
          <button type="submit">Book Appointment</button>
        </form>
      </section>

      <section>
        <h2>My Appointments</h2>
        {appointments.length === 0 ? (
          <p>No appointments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
            {(appointments || []).map((appt) => (
              <tr key={appt.id}>
                <td>{appt.doctor_id}</td>
                <td>{appt.doctor_name}</td>
                <td>{new Date(appt.appointment_date).toLocaleString()}</td>
                <td>{appt.status}</td>
                <td>{appt.notes}</td>
              </tr>
            ))}
          </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
