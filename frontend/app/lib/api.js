export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    let message = "Request failed";
    try { const data = await res.json(); message = data.detail || JSON.stringify(data); } catch {}
    throw new Error(message);
  }
  try { return await res.json(); } catch { return null; }
}

