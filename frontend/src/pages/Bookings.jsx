import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineTrash, HiOutlineCreditCard, HiOutlineEye, HiOutlineXCircle, HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationCircle, HiOutlineUsers } from 'react-icons/hi';
import { FiPackage, FiHeart } from 'react-icons/fi';

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    API.get('/bookings').then(res => setBookings(res.data)).catch(() => {});
    API.get('/destinations').then(res => setDestinations(res.data)).catch(() => {});
    API.get('/packages').then(res => setPackages(res.data)).catch(() => {});
  }, []);

  const getDestName = (id) => destinations.find(d => d.id === id)?.name || 'Unknown';
  const getPkgName = (id) => packages.find(p => p.id === id)?.name || 'Custom Wedding';
  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price || 0);

  const handleCancel = async (id) => {
    try {
      await API.patch(`/bookings/${id}`, { status: 'cancelled' });
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      setCancelConfirm(null);
      showToast('Booking cancelled. Full refund will be processed to original payment source.', 'info');
    } catch {
      showToast('Failed to cancel booking', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/bookings/${id}`);
      setBookings(bookings.filter(b => b.id !== id));
      setDeleteConfirm(null);
      showToast('Booking removed from your records', 'success');
    } catch {
      showToast('Failed to delete booking', 'error');
    }
  };

  const statusConfig = {
    confirmed: { color: 'bg-emerald-100 text-emerald-700', icon: <HiOutlineCheckCircle className="w-3.5 h-3.5" />, label: 'Confirmed' },
    pending: { color: 'bg-amber-100 text-amber-700', icon: <HiOutlineClock className="w-3.5 h-3.5" />, label: 'Pending Payment' },
    cancelled: { color: 'bg-red-100 text-red-700', icon: <HiOutlineXCircle className="w-3.5 h-3.5" />, label: 'Cancelled' }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-dark tracking-tight mb-1">My Bookings</h1>
        <p className="text-gray-500 text-sm">Manage your wedding bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart className="w-14 h-14 text-gold/40 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No bookings yet</p>
          <p className="text-gray-400 text-sm mt-2 mb-6">Start planning your dream wedding today</p>
          <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90 transition-all shadow-md">
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
            const status = statusConfig[booking.status] || statusConfig.pending;
            return (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gold/20 to-blush/30 rounded-xl flex items-center justify-center shrink-0">
                        {booking.type === 'package' ? <FiPackage className="w-6 h-6 text-gold" /> : <HiOutlineUsers className="w-6 h-6 text-gold" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-dark text-lg">
                            {booking.type === 'package'
                              ? getPkgName(booking.packageId)
                              : (booking.groomName && booking.brideName
                                ? `${booking.groomName} & ${booking.brideName}`
                                : 'Custom Wedding')}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            booking.type === 'package'
                              ? 'bg-gold/15 text-gold border border-gold/30'
                              : 'bg-blush/40 text-rose-700 border border-rose-200'
                          }`}>
                            {booking.type === 'package' ? 'Package' : 'Custom'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500 flex items-center gap-1"><HiOutlineLocationMarker className="w-4 h-4" /> {getDestName(booking.destinationId)}</span>
                          {booking.dates?.wedding && <span className="text-sm text-gray-500 flex items-center gap-1"><HiOutlineCalendar className="w-4 h-4" /> {booking.dates.wedding}</span>}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-1">ID: {booking.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      <span className="font-bold text-gold text-lg">₹{formatPrice(booking.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/my-weddings/${booking.id}`)}
                      className="px-5 py-2 bg-gold/10 text-gold rounded-full text-sm font-medium hover:bg-gold/20 transition-all flex items-center gap-1.5"
                    >
                      <HiOutlineEye className="w-4 h-4" /> View Details
                    </button>

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => setCancelConfirm(booking.id)}
                        className="px-5 py-2 border border-red-200 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-all flex items-center gap-1.5"
                      >
                        <HiOutlineXCircle className="w-4 h-4" /> Cancel Booking
                      </button>
                    )}

                    {booking.status === 'pending' && (
                      <button
                        onClick={() => setCancelConfirm(booking.id)}
                        className="px-5 py-2 border border-red-200 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-all flex items-center gap-1.5"
                      >
                        <HiOutlineXCircle className="w-4 h-4" /> Cancel
                      </button>
                    )}

                    {booking.status === 'cancelled' && (
                      <button
                        onClick={() => setDeleteConfirm(booking.id)}
                        className="px-5 py-2 border border-gray-200 text-gray-500 rounded-full text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1.5"
                      >
                        <HiOutlineTrash className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Popup */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCancelConfirm(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-[fadeInUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineExclamationCircle className="w-9 h-9 text-amber-600" />
            </div>
            <h3 className="font-serif text-xl font-bold text-dark text-center mb-2">Cancel This Booking?</h3>
            <p className="text-gray-500 text-sm text-center mb-2">
              Are you sure you want to cancel this wedding booking? This action cannot be undone.
            </p>
            <p className="text-emerald-600 text-sm text-center mb-6 font-medium">
              Don't worry — the full amount will be refunded to your original payment method within 5-7 business days.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-all"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-[fadeInUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineTrash className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-serif text-xl font-bold text-dark text-center mb-2">Delete Booking?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              This will permanently remove this cancelled booking from your records. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
              >
                Keep It
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          0% { transform: translateY(20px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}