import React from 'react'

const Nav = () => {
  return (
      <div className="nav">
          <div className="container nav-inner">
            <div className="brand">
              <span className="brand-badge" />
              <span>Hospital App</span>
            </div>
            <div className="nav-links">
              <a className="nav-link" href="/">Home</a>
              <a className="nav-link" href="/login">Login</a>
              <a className="nav-link" href="/register">Register</a>
              <a className="nav-link" href="/admin">Admin</a>
              <a className="nav-link" href="/doctor">Doctor</a>
              <a className="nav-link" href="/patient">Patient</a>
            </div>
          </div>
        </div>
  )
}

export default Nav
