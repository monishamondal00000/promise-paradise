import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../context/AuthContext';
import { HiOutlineArrowRight, HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineCreditCard, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi';
import { FiHeart, FiPackage, FiCpu, FiImage, FiPlus } from 'react-icons/fi';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    API.get('/bookings').then(res => setBookings(res.data)).catch(() => {});
    API.get('/destinations').then(res => setDestinations(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const getDestName = (id) => destinations.find(d => d.id === id)?.name || 'Destination';
  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price || 0);

  const totalSpent = bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + (b.payment?.paidAmount || 0), 0);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gray-50/50">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your wedding plans</p>
        </div>

        {/* Top Row - Summary + Quick Start */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* Summary Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 p-6">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="pr-6">
                <p className="text-sm text-gray-500 mb-1">Bookings</p>
                <p className="text-3xl font-semibold text-gray-900">{bookings.length}</p>
                <div className="flex items-center gap-2 mt-2">
                  {confirmedCount > 0 && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{confirmedCount} confirmed</span>}
                  {pendingCount > 0 && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{pendingCount} pending</span>}
                </div>
              </div>
              <div className="px-6">
                <p className="text-sm text-gray-500 mb-1">Total Investment</p>
                <p className="text-3xl font-semibold text-gray-900">₹{formatPrice(totalSpent)}</p>
                <p className="text-xs text-gray-400 mt-2">Across all bookings</p>
              </div>
              <div className="pl-6">
                <p className="text-sm text-gray-500 mb-1">Destinations</p>
                <p className="text-3xl font-semibold text-gray-900">{destinations.length}</p>
                <p className="text-xs text-gray-400 mt-2">Available locations</p>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white relative overflow-hidden ${bookings.length === 0 ? 'ring-2 ring-gold ring-offset-2 animate-pulse-slow' : ''}`}>
            {bookings.length === 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-ping" />
            )}
            <p className="text-sm text-gray-300 mb-2">Ready to begin?</p>
            <p className="text-lg font-semibold mb-4">Start your wedding journey</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/plan-wedding')}
                className="w-full py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <FiHeart className="w-4 h-4" /> Custom Wedding
              </button>
              <button
                onClick={() => navigate('/explore-packages')}
                className="w-full py-2.5 bg-gold text-gray-900 rounded-lg text-sm font-medium hover:bg-gold/90 transition-all flex items-center justify-center gap-2"
              >
                <FiPackage className="w-4 h-4" /> Browse Packages
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Bookings + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Bookings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">Your Bookings</h2>
                {bookings.length > 0 && (
                  <button onClick={() => navigate('/my-weddings')} className="text-xs text-gold font-medium hover:underline flex items-center gap-1">
                    View all <HiOutlineArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {bookings.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FiHeart className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm mb-1">No bookings yet</p>
                  <p className="text-gray-400 text-xs mb-4">Plan your first dream wedding</p>
                  <button onClick={() => navigate('/plan-wedding')} className="text-sm text-gold font-medium hover:underline">
                    Get started →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {bookings.slice(0, 5).map(b => (
                    <div
                      key={b.id}
                      onClick={() => navigate(`/my-weddings/${b.id}`)}
                      className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          b.status === 'confirmed' ? 'bg-emerald-50' : b.status === 'pending' ? 'bg-amber-50' : 'bg-red-50'
                        }`}>
                          {b.status === 'confirmed'
                            ? <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                            : b.status === 'pending'
                              ? <HiOutlineClock className="w-5 h-5 text-amber-500" />
                              : <FiPackage className="w-5 h-5 text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {b.type === 'package' ? 'Package Booking' : 'Custom Wedding'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <HiOutlineLocationMarker className="w-3 h-3" /> {getDestName(b.destinationId)}
                            </span>
                            {b.dates?.wedding && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <HiOutlineCalendar className="w-3 h-3" /> {b.dates.wedding}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">₹{formatPrice(b.totalAmount)}</p>
                        <p className={`text-xs mt-0.5 capitalize ${
                          b.status === 'confirmed' ? 'text-emerald-600' : b.status === 'pending' ? 'text-amber-600' : 'text-red-500'
                        }`}>{b.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">

            {/* Upcoming Event */}
            {activeBookings.length > 0 && activeBookings[0].dates?.wedding && (
              <div className="bg-white rounded-xl border border-gray-200/60 p-5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Upcoming Event</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                    <HiOutlineCalendar className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activeBookings[0].dates.wedding}</p>
                    <p className="text-xs text-gray-400">{getDestName(activeBookings[0].destinationId)}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/my-weddings/${activeBookings[0].id}`)}
                  className="w-full py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition-all"
                >
                  View details
                </button>
              </div>
            )}

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-200/60 p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-1">
                {[
                  { icon: <FiCpu className="w-4 h-4" />, label: 'AI Wedding Assistant', path: '/wedding-concierge' },
                  { icon: <FiImage className="w-4 h-4" />, label: 'Wedding Gallery', path: '/wedding-gallery' },
                  { icon: <HiOutlineCreditCard className="w-4 h-4" />, label: 'My Bookings', path: '/my-weddings' },
                ].map((link, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                  >
                    <span className="text-gray-400">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-gray-50 rounded-xl border border-gray-200/60 p-5">
              <p className="text-sm font-medium text-gray-900 mb-1">Need help planning?</p>
              <p className="text-xs text-gray-500 mb-3">Our AI assistant can help you choose destinations, compare packages, and build timelines.</p>
              <button
                onClick={() => navigate('/wedding-concierge')}
                className="text-xs text-gold font-medium hover:underline flex items-center gap-1"
              >
                Chat with assistant <HiOutlineArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}