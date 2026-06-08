import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import AIChat from './components/AIChat';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Packages from './pages/Packages';
import PackageFlow from './pages/PackageFlow';
import CustomFlow from './pages/CustomFlow';
import Payment from './pages/Payment';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import AIAssistant from './pages/AIAssistant';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile';
import AdminPanel from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (!user.isAdmin) return <Navigate to="/dashboard" />;
  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <Toast />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore-packages" element={<Packages />} />
        <Route path="/wedding-gallery" element={<Gallery />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/book-package/:packageId?" element={<ProtectedRoute><PackageFlow /></ProtectedRoute>} />
        <Route path="/plan-wedding" element={<ProtectedRoute><CustomFlow /></ProtectedRoute>} />
        <Route path="/checkout/:bookingId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/my-weddings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/my-weddings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
        <Route path="/wedding-concierge" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

        {/* Legacy redirects */}
        <Route path="/packages" element={<Navigate to="/explore-packages" replace />} />
        <Route path="/custom-flow" element={<Navigate to="/plan-wedding" replace />} />
        <Route path="/package-flow/:packageId?" element={<Navigate to="/book-package/:packageId?" replace />} />
        <Route path="/payment/:bookingId" element={<Navigate to="/checkout/:bookingId" replace />} />
        <Route path="/bookings" element={<Navigate to="/my-weddings" replace />} />
        <Route path="/bookings/:id" element={<Navigate to="/my-weddings/:id" replace />} />
        <Route path="/ai-assistant" element={<Navigate to="/wedding-concierge" replace />} />
      </Routes>
      {user && !user.isAdmin && <AIChat />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}