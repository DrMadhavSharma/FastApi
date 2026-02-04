"use client";
import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Brand */}
        <div className="brand">
          <img
            src="https://fastapi-6mjn.onrender.com/static/logo.png"
            alt="ArogyaSys Logo"
            style={{ width: 20, height: 20 }}
          />
          <span>ArogyaSys</span>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </div>

        {/* Social Links (text-safe, professional) */}
        <div className="social-icons">
          <a href="https://twitter.com" target="_blank" rel="noreferrer">
            Twitter
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>

        {/* Copyright */}
        <div className="copyright">
          © {new Date().getFullYear()} ArogyaSys. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
