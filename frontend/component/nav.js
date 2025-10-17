"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Nav = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on load
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    router.push("https://fastapi-6mjn.onrender.com/login");
  };

  return (
    <div className="nav">
      <div className="container nav-inner">
        {/* Brand */}
        <div className="brand">
          <span className="brand-badge" />
          <span>Hospital App</span>
        </div>

        {/* Right side: login/logout button */}
        <div>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="btn btn-primary"
              style={{ cursor: "pointer" }}
            >
              Logout
            </button>
          ) : (
            <a href="https://fastapi-frontend-h1vg.onrender.com/login" className="btn btn-primary">
              Login
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Nav;
