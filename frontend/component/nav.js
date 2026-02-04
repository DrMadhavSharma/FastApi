"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Nav() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(Boolean(token));
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        {/* Brand */}
        <div className="brand">
          <img
            src="https://fastapi-6mjn.onrender.com/static/logo.png"
            alt="ArogyaSys Logo"
            style={{ width: 28, height: 28 }}
          />
          <span>ArogyaSys</span>
        </div>

        {/* Auth action */}
        <div>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="btn btn-primary"
            >
              Logout
            </button>
          ) : (
            <a
              href="/login"
              className="btn btn-primary"
            >
              Login
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
