"use client";
import React from "react";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        {/* Brand with glow */}
        <div className="brand">
          <span className="brand-badge glow" />
          <span>Hospital App</span>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </div>

        {/* Social Icons */}
        <div className="social-icons">
          <a href="https://twitter.com" target="_blank" rel="noreferrer">
            🐦
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            📘
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            📸
          </a>
        </div>

        {/* Copyright */}
        <div className="copyright">
          &copy; {new Date().getFullYear()} Hospital App. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
