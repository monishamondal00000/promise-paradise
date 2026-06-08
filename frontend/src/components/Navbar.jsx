import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${isActive(to) ? 'text-gold' : 'text-dark hover:text-gold'}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-ivory/95 backdrop-blur-md border-b border-blush/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="font-serif text-2xl font-bold text-gold italic tracking-tight">
            Promise Paradise
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {user?.isAdmin ? (
              <>
                {navLink('/admin', 'Admin Panel')}
              </>
            ) : (
              <>
                {navLink('/', 'Home')}
                {navLink('/explore-packages', 'Packages')}
                {user && navLink('/dashboard', 'Dashboard')}
                {user && navLink('/my-weddings', 'My Bookings')}
                {user && navLink('/wedding-concierge', 'AI Assistant')}
                {navLink('/wedding-gallery', 'Gallery')}
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.isAdmin ? (
                  <span className="hidden sm:inline-flex items-center text-xs px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30">👑 Admin</span>
                ) : (
                  <Link
                    to="/profile"
                    title={user.name}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-gold to-amber-400 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all uppercase select-none overflow-hidden"
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      (user.name?.trim()?.[0] || user.email?.[0] || '?').toUpperCase()
                    )}
                  </Link>
                )}
                <button onClick={logout} className="px-5 py-2 text-sm border border-gold text-gold rounded-full hover:bg-gold hover:text-white transition-all duration-300">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-dark hover:text-gold transition-colors font-medium">Login</Link>
                <Link to="/register" className="px-5 py-2 text-sm bg-gold text-white rounded-full hover:bg-gold/90 transition-all shadow-sm">Register</Link>
              </>
            )}
            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-dark p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-ivory border-t border-blush/30 px-4 py-4 space-y-3">
          {user?.isAdmin ? (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Admin Panel</Link>
          ) : (
            <>
              <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Home</Link>
              <Link to="/explore-packages" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Packages</Link>
              {user && <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Dashboard</Link>}
              {user && <Link to="/my-weddings" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">My Bookings</Link>}
              {user && <Link to="/wedding-concierge" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">AI Assistant</Link>}
              {user && <Link to="/profile" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Profile</Link>}
              <Link to="/wedding-gallery" onClick={() => setMobileOpen(false)} className="block text-sm text-dark py-1">Gallery</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}