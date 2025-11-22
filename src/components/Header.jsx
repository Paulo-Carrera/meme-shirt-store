import React, { useState } from 'react';
import './Header.css';
import '../styles/global.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  return (
    <header className="site-header">
      {/* Left side: Logo + Fun badge */}
      <div className="logo-container">
        <div className="logo">
          <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            MemeThreads
          </a>
          <span className="sale-badge">🔥 New Drop</span>
        </div>
      </div>

      {/* Right side: Nav + Burger */}
      <div className="header-right">
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="/">Home</a>
          <a href="/checkout">Checkout</a>
          <a href="/contact">Contact</a>
          <a href="/about">About</a>
        </nav>

        <div className="burger-menu" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </header>
  );
};

export default Header;