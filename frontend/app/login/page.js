"use client";
import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import { useRouter } from "next/navigation";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isValid = email.includes("@") && password.length ;
  const router = useRouter();
  const {user,setUser} = useContext(UserContext)
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://fastapi-6mjn.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Login failed");
      }
      const data = await res.json();
      console.log(data);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("role", data.role);
        
      }
      setUser({
             id: data?.user_id ?? "",
             email: data?.email ?? "",
             username: data?.username ?? "ppu",
             role: data?.role?? ""
             });
      // Simple redirect based on role
      const role = data.role;
      if (role === "doctor") {
       router.push("/doctor");
    } else if (role === "patient") {
       router.push("/patient/dashboard");
    } else if (role === "admin") {
       router.push("/admin");
    } else {
       router.push("/");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wire-center">
      <div className="wire-card">
        <h1 className="wire-title">Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="wire-field">
            <label className="wire-label" htmlFor="email">Email</label>
            <input className="wire-input" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@gmail.com" />
          </div>
          <div className="wire-field">
            <label className="wire-label" htmlFor="password">Password</label>
            <input className="wire-input" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="wire-actions">
            <button className="wire-button" type="submit" disabled={loading || !isValid}>{loading ? "Logging in..." : "Login"}</button>
            <p className="wire-helper">Do not have an account? <a className="wire-link" href="/register">Register</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}


