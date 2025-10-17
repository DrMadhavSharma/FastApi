"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [role, setRole] = useState("patient");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Patient-specific fields
  const [age, setAge] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [address, setAddress] = useState("");

  // Doctor-specific fields
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isValidBase = username.length >= 2 && email.includes("@") && password.length >= 6;
  const isValidRole =
    role === "patient"
      ? true
      : specialization.trim().length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const isDoctor = role === "doctor";
      const endpoint = isDoctor
        ? "https://fastapi-6mjn.onrender.com/register/doctor"
        : "https://fastapi-6mjn.onrender.com/register/patient";

      const payload = isDoctor
        ? {
            username,
            email,
            password,
            specialization,
            bio,
            availability
          }
        : {
            username,
            email,
            password,
            age: age ? Number(age) : undefined,
            medical_history: medicalHistory,
            address
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Registration failed");
      }
      setSuccess("Registered successfully. You can now login.");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wire-center">
      <div className="wire-card">
        <h1 className="wire-title">Register</h1>
        <form onSubmit={handleSubmit}>
          <div className="wire-field">
            <label className="wire-label" htmlFor="role">Role</label>
            <select className="wire-input" id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          <div className="wire-field">
            <label className="wire-label" htmlFor="username">Username</label>
            <input className="wire-input" id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Your name" />
          </div>

          <div className="wire-field">
            <label className="wire-label" htmlFor="email">Email</label>
            <input className="wire-input" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>

          <div className="wire-field">
            <label className="wire-label" htmlFor="password">Password</label>
            <input className="wire-input" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters" minLength={6} />
          </div>

          {role === "patient" ? (
            <div className="section">
              <h3>Patient Details</h3>
              <div className="wire-field">
                <label className="wire-label" htmlFor="age">Age</label>
                <input className="wire-input" id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div className="wire-field">
                <label className="wire-label" htmlFor="medical_history">Medical History</label>
                <textarea className="wire-input" id="medical_history" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
              </div>
              <div className="wire-field">
                <label className="wire-label" htmlFor="address">Address</label>
                <input className="wire-input" id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="section">
              <h3>Doctor Details</h3>
              <div className="wire-field">
                <label className="wire-label" htmlFor="specialization">Specialization</label>
                <input className="wire-input" id="specialization" type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
              </div>
              <div className="wire-field">
                <label className="wire-label" htmlFor="bio">Bio</label>
                <textarea className="wire-input" id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="wire-field">
                <label className="wire-label" htmlFor="availability">Availability</label>
                <input className="wire-input" id="availability" type="text" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Mon-Fri 9am-5pm" />
              </div>
            </div>
          )}

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          <div className="wire-actions">
            <button className="wire-button" type="submit" disabled={loading || !(isValidBase && isValidRole)}>{loading ? "Registering..." : "Register"}</button>
            <p className="wire-helper">Already have an account? <a className="wire-link" href="https://fastapi-6mjn.onrender.com/login">Login</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}


