"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkAuth = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      const res = await fetch("https://fastapi-6mjn.onrender.com/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Invalid token");

      setIsLoggedIn(true);
    } catch {
      // Token expired or invalid
      localStorage.removeItem("access_token");
      setIsLoggedIn(false);
    }
  };

  // Run on mount & every route change
  useEffect(() => {
    checkAuth();
  }, [pathname]);

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
            <button onClick={handleLogout} className="btn btn-primary">
              Logout
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="btn btn-primary"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
