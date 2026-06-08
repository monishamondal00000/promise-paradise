import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineUsers, HiOutlineClock, HiOutlineArrowLeft, HiOutlineDocumentText, HiOutlineXCircle, HiOutlineExclamationCircle, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineCreditCard, HiOutlineCheckCircle, HiOutlineSparkles, HiOutlineHome } from 'react-icons/hi';
import { FiChevronDown, FiShoppingBag, FiMapPin, FiPackage, FiHeart } from 'react-icons/fi';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editingGuests, setEditingGuests] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [editableTimeline, setEditableTimeline] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [guestList, setGuestList] = useState([]);
  const [newGuest, setNewGuest] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    API.get(`/bookings/${id}`).then(res => {
      setBooking(res.data);
      // Normalize guest list: support both old string[] and new object[]
      const guests = (res.data.guests || []).map(g =>
        typeof g === 'string' ? { name: g, phone: '', email: '' } : g
      );
      setGuestList(guests);
    }).catch(() => navigate('/my-weddings'));
    API.get('/destinations').then(res => setDestinations(res.data)).catch(() => {});
    API.get('/vendors').then(res => setVendors(res.data)).catch(() => {});
    API.get('/packages').then(res => setPackages(res.data)).catch(() => {});
  }, [id, navigate]);

  const getDestName = (did) => destinations.find(d => d.id === did)?.name || did;
  const getDestCity = (did) => destinations.find(d => d.id === did)?.city || '';
  const getVendorName = (vid) => vendors.find(v => v.id === vid)?.name || vid;
  const getVendorCategory = (vid) => vendors.find(v => v.id === vid)?.category || '';
  const getPkgName = (pid) => packages.find(p => p.id === pid)?.name || '';
  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price || 0);

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await API.patch(`/bookings/${id}`, { status: 'cancelled' });
      setBooking({ ...booking, status: 'cancelled' });
      setCancelConfirm(false);
      // Calculate refund based on policy
      const weddingDate = booking.dates?.wedding;
      let refundPct = 100;
      if (weddingDate) {
        const daysUntilWedding = Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilWedding < 7) refundPct = 20;
        else if (daysUntilWedding < 15) refundPct = 50;
        else if (daysUntilWedding < 30) refundPct = 75;
        else refundPct = 100;
      }
      showToast(`Booking cancelled. ${refundPct}% refund will be processed to your original payment method within 7-10 business days.`, 'info');
    } catch {
      showToast('Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveGuests = async () => {
    try {
      await API.put(`/bookings/${id}`, { guests: guestList });
      setBooking({ ...booking, guests: guestList });
      setEditingGuests(false);
      showToast('Guest list updated successfully', 'success');
    } catch {
      showToast('Failed to update guest list', 'error');
    }
  };

  const startEditTimeline = () => {
    setEditableTimeline(JSON.parse(JSON.stringify(booking.timeline || [])));
    setEditingTimeline(true);
  };

  const handleSaveTimeline = async () => {
    try {
      await API.put(`/bookings/${id}`, { timeline: editableTimeline });
      setBooking({ ...booking, timeline: editableTimeline });
      setEditingTimeline(false);
      showToast('Timeline updated successfully', 'success');
    } catch {
      showToast('Failed to update timeline', 'error');
    }
  };

  const getSavedTemplates = () => {
    try { return JSON.parse(localStorage.getItem('pp_timeline_templates') || '[]'); } catch { return []; }
  };

  const applyTemplate = (tl) => {
    // Only apply if same number of days
    const currentDays = editableTimeline.length;
    if (tl.length !== currentDays) {
      showToast(`Template has ${tl.length} days but your booking has ${currentDays} days. Cannot apply.`, 'error');
      return;
    }
    setEditableTimeline(JSON.parse(JSON.stringify(tl)));
    setShowTemplates(false);
    showToast('Template applied!', 'success');
  };

  const addEventToDay = (dayIdx) => {
    const t = [...editableTimeline];
    t[dayIdx].events.push({ name: '', time: '', venue: '' });
    setEditableTimeline(t);
  };

  const removeEvent = (dayIdx, evIdx) => {
    const t = [...editableTimeline];
    t[dayIdx].events.splice(evIdx, 1);
    setEditableTimeline(t);
  };

  const updateEvent = (dayIdx, evIdx, field, value) => {
    const t = [...editableTimeline];
    t[dayIdx].events[evIdx][field] = value;
    setEditableTimeline(t);
  };

  const addGuest = () => {
    if (newGuest.name.trim() || newGuest.email.trim() || newGuest.phone.trim()) {
      setGuestList([...guestList, { name: newGuest.name.trim(), phone: newGuest.phone.trim(), email: newGuest.email.trim() }]);
      setNewGuest({ name: '', phone: '', email: '' });
    }
  };

  const removeGuest = (index) => {
    setGuestList(guestList.filter((_, i) => i !== index));
  };

  if (!booking) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading booking details...</div></div>;

  const statusColors = {
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200'
  };

  const paidAmount = booking.payment?.paidAmount ?? (booking.payment?.status === 'paid' ? (booking.payment.amount || booking.totalAmount) : 0);
  const remainingAmount = (booking.totalAmount || booking.payment?.amount || 0) - paidAmount;

  // Resolve the package object (for package bookings) and derive its vendors
  const pkg = booking.type === 'package' ? packages.find(p => p.id === booking.packageId) : null;
  const packageVendors = pkg && Array.isArray(pkg.vendors)
    ? pkg.vendors.map(vid => vendors.find(v => v.id === vid)).filter(Boolean)
    : [];

  // For the Vendors section: package = packageVendors, custom = booking.selectedVendors
  const vendorList = booking.type === 'package'
    ? packageVendors.map(v => ({ id: v.id, name: v.name, category: v.category, cost: null }))
    : (booking.selectedVendors || []).map(v =>
        typeof v === 'object' ? v : { id: v, name: getVendorName(v), category: getVendorCategory(v), cost: null }
      );

  // Accommodation label
  const accommodationLabels = {
    'hotel block': 'Hotel Block',
    'villa': 'Private Villa',
    'resort buyout': 'Resort Buyout',
    'mixed': 'Mixed'
  };

  // Duration (days)
  const durationDays = booking.timeline?.length || (pkg ? (parseInt(pkg.duration) || null) : null);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/my-weddings')} className="text-gold hover:text-gold/80 flex items-center gap-1">
          <HiOutlineArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-dark">
              {booking.type === 'package'
                ? (getPkgName(booking.packageId) || 'Package Booking')
                : (booking.groomName && booking.brideName
                  ? `${booking.groomName} & ${booking.brideName}`
                  : 'Custom Wedding')}
            </h1>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
              booking.type === 'package'
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'bg-blush/40 text-rose-700 border border-rose-200'
            }`}>
              {booking.type === 'package' ? 'Package' : 'Custom'}
            </span>
          </div>
          <p className="text-gray-500 text-sm font-mono">Booking #{booking.id}</p>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
        </span>
      </div>

      <div className="space-y-6">
        {/* Destination & Date */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-serif font-semibold text-dark mb-4 flex items-center gap-2">
            <HiOutlineLocationMarker className="w-5 h-5 text-gold" /> Destination & Date
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destination</p>
              <p className="font-semibold text-dark">{getDestName(booking.destinationId)}</p>
              <p className="text-xs text-gray-500">{getDestCity(booking.destinationId)}</p>
              {booking.subPlace && (
                <p className="text-xs text-gold mt-1 font-medium">📍 {booking.subPlace}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Wedding Date</p>
              <p className="font-semibold text-dark">{booking.dates?.wedding || 'TBD'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Guests</p>
              <p className="font-semibold text-dark">{booking.guestCount || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Wedding Plan Details (flow-specific) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-serif font-semibold text-dark mb-4 flex items-center gap-2">
            {booking.type === 'package' ? <FiPackage className="w-5 h-5 text-gold" /> : <FiHeart className="w-5 h-5 text-gold" />}
            Wedding Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booking.type === 'package' && pkg && (
              <>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Package</p>
                  <p className="font-semibold text-dark">{pkg.name}</p>
                  {pkg.tier && <p className="text-xs text-gray-500 capitalize">{pkg.tier} tier</p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-semibold text-dark">{pkg.duration || `${durationDays || 'N/A'} days`}</p>
                </div>
              </>
            )}
            {booking.type === 'custom' && (
              <>
                {booking.weddingType && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ceremony Style</p>
                    <p className="font-semibold text-dark">{booking.weddingType}</p>
                  </div>
                )}
                {durationDays && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                    <p className="font-semibold text-dark">{durationDays} day{durationDays > 1 ? 's' : ''}</p>
                  </div>
                )}
              </>
            )}
            {booking.accommodation && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><HiOutlineHome className="w-3 h-3" /> Accommodation</p>
                <p className="font-semibold text-dark">{accommodationLabels[booking.accommodation] || booking.accommodation}</p>
              </div>
            )}
            {booking.notes && (
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Special Requests</p>
                <p className="text-sm text-dark whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Package inclusions */}
          {booking.type === 'package' && pkg?.includes?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">What's Included</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pkg.includes.map((inc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-dark">
                    <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Guest List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-dark flex items-center gap-2">
              <HiOutlineUsers className="w-5 h-5 text-gold" /> Guest List
            </h3>
            {booking.status !== 'cancelled' && (
              <button
                onClick={() => setEditingGuests(!editingGuests)}
                className="text-sm text-gold font-medium hover:text-gold/80 flex items-center gap-1"
              >
                <HiOutlinePencil className="w-4 h-4" /> {editingGuests ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>

          {editingGuests ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                  placeholder="Name"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                />
                <input
                  type="text"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                  placeholder="Phone"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                />
                <input
                  type="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                  placeholder="Email"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                />
              </div>
              <button onClick={addGuest} disabled={!newGuest.name && !newGuest.email && !newGuest.phone} className="px-5 py-2.5 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 flex items-center gap-1 disabled:opacity-40">
                <HiOutlinePlus className="w-4 h-4" /> Add Guest
              </button>
              {/* Editable table */}
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">#</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Name</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Phone</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Email</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {guestList.map((guest, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-dark">{guest.name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{guest.phone || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{guest.email || '—'}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => removeGuest(i)} className="text-red-400 hover:text-red-600">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {guestList.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No guests added yet</p>}
              </div>
              <button
                onClick={handleSaveGuests}
                className="w-full py-2.5 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 transition-all"
              >
                Save Guest List
              </button>
            </div>
          ) : (
            <div>
              {guestList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">#</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Name</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Phone</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {guestList.map((guest, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-dark">{guest.name || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{guest.phone || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{guest.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No guests added yet. Click Edit to add your guest list.</p>
              )}
            </div>
          )}
        </div>

        {/* Vendors */}
        {vendorList.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif font-semibold text-dark mb-4 flex items-center gap-2">
              <FiShoppingBag className="w-5 h-5 text-gold" /> Your Vendors
              <span className="text-xs text-gray-400 font-normal">({vendorList.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vendorList.map((v, i) => {
                const fullVendor = vendors.find(vd => vd.id === v.id);
                return (
                  <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center text-gold text-sm font-bold flex-shrink-0">
                      {v.category?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.category}</p>
                      {fullVendor?.city && <p className="text-xs text-gray-500 mt-0.5">{fullVendor.city}</p>}
                      {fullVendor?.rating && <p className="text-xs text-gold">★ {fullVendor.rating}</p>}
                      {fullVendor?.priceRange && <p className="text-xs text-gray-500">{fullVendor.priceRange}</p>}
                      {v.cost && <p className="text-xs text-gold font-medium mt-1">₹{formatPrice(v.cost)}</p>}
                      {fullVendor?.phone && <p className="text-xs text-gray-400 mt-1">📞 {fullVendor.phone}</p>}
                      {fullVendor?.email && <p className="text-xs text-gray-400 truncate">✉ {fullVendor.email}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            {booking.type === 'package' && (
              <p className="text-xs text-gray-400 italic mt-3">Vendors are pre-selected as part of this package.</p>
            )}
          </div>
        )}

        {/* Personal Vendors */}
        {booking.personalVendors?.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif font-semibold text-dark mb-4 flex items-center gap-2">
              <FiHeart className="w-5 h-5 text-gold" /> Your Personal Vendors
              <span className="text-xs text-gray-400 font-normal">({booking.personalVendors.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {booking.personalVendors.map((pv, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-sm font-bold flex-shrink-0">
                    {pv.category?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{pv.name}</p>
                    <p className="text-xs text-gray-500">{pv.category}</p>
                    {pv.phone && <p className="text-xs text-gray-400 mt-1">{pv.phone}</p>}
                    {pv.email && <p className="text-xs text-gray-400 truncate">{pv.email}</p>}
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">Self-managed</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 italic mt-3">Personal vendors are managed by you. Their cost is not included in the platform billing.</p>
          </div>
        )}

        {/* Timeline Accordion */}
        {booking.timeline && booking.timeline.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-semibold text-dark flex items-center gap-2">
                <HiOutlineCalendar className="w-5 h-5 text-gold" /> Wedding Timeline
              </h3>
              {booking.status !== 'cancelled' && !editingTimeline && (
                <button onClick={startEditTimeline} className="text-sm text-gold font-medium hover:text-gold/80 flex items-center gap-1">
                  <HiOutlinePencil className="w-4 h-4" /> Edit
                </button>
              )}
              {editingTimeline && (
                <div className="flex gap-2">
                  <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-full font-medium hover:bg-indigo-100 flex items-center gap-1">
                    <HiOutlineSparkles className="w-3.5 h-3.5" /> Templates
                  </button>
                  <button onClick={() => setEditingTimeline(false)} className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-full font-medium hover:bg-gray-50">Cancel</button>
                  <button onClick={handleSaveTimeline} className="px-3 py-1.5 text-xs bg-gold text-white rounded-full font-medium hover:bg-gold/90">Save</button>
                </div>
              )}
            </div>

            {!editingTimeline ? (
              <div className="space-y-3">
                {booking.timeline.map((day, dayIdx) => (
                  <div key={dayIdx} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-gray-50 hover:bg-gold/5 transition-all"
                    >
                      <span className="font-medium text-dark">Day {day.day}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{day.events?.length || 0} events</span>
                        <FiChevronDown className={`w-4 h-4 transform transition-transform ${expandedDay === dayIdx ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {expandedDay === dayIdx && (
                      <div className="px-5 py-4 space-y-3 border-t">
                        {day.events?.map((event, evIdx) => (
                          <div key={evIdx} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-gold rounded-full mt-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-dark">{event.name || 'Event'}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-2">
                                {event.time && <span className="flex items-center gap-0.5"><HiOutlineClock className="w-3 h-3" /> {event.time}</span>}
                                {event.venue && <span className="flex items-center gap-0.5"><FiMapPin className="w-3 h-3" /> {event.venue}</span>}
                              </p>
                              {event.notes && <p className="text-xs text-gray-500 mt-1">{event.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 italic">Edit event names, timings, or add events. Days cannot be added or removed.</p>
                {editableTimeline.map((day, dayIdx) => (
                  <div key={dayIdx} className="border border-gray-200 rounded-xl p-4">
                    <h4 className="font-medium text-dark text-sm mb-3">Day {day.day}</h4>
                    <div className="space-y-2">
                      {day.events?.map((event, evIdx) => (
                        <div key={evIdx} className="flex gap-2 items-center">
                          <input value={event.name} onChange={(e) => updateEvent(dayIdx, evIdx, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" placeholder="Event name" />
                          <input type="time" value={event.time} onChange={(e) => updateEvent(dayIdx, evIdx, 'time', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none w-28" />
                          <input value={event.venue || ''} onChange={(e) => updateEvent(dayIdx, evIdx, 'venue', e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" placeholder="Venue" />
                          <button onClick={() => removeEvent(dayIdx, evIdx)} className="text-red-400 hover:text-red-600 p-1"><HiOutlineTrash className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addEventToDay(dayIdx)} className="text-gold text-xs font-medium hover:underline mt-2 flex items-center gap-1">
                      <HiOutlinePlus className="w-3 h-3" /> Add Event
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
              <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="font-serif text-lg font-bold text-dark mb-1">Saved Templates</h3>
                  <p className="text-xs text-gray-500 mb-4">Only templates with {editableTimeline.length} day{editableTimeline.length > 1 ? 's' : ''} can be applied.</p>
                  {getSavedTemplates().length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No saved templates yet. Create templates from the AI Assistant or booking flow.</p>
                  ) : (
                    <div className="space-y-2">
                      {getSavedTemplates().map(t => (
                        <div key={t.id} className={`p-3 border rounded-xl ${t.timeline.length === editableTimeline.length ? 'border-gold/30 hover:border-gold cursor-pointer' : 'border-gray-100 opacity-50'}`} onClick={() => t.timeline.length === editableTimeline.length && applyTemplate(t.timeline)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-dark">{t.name}</span>
                            <span className="text-xs text-gray-400">{t.days} day{t.days > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowTemplates(false)} className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-dark">Close</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-dark flex items-center gap-2">
              <HiOutlineCreditCard className="w-5 h-5 text-gold" /> Payment
            </h3>
            {booking.status === 'confirmed' && (
              <button
                onClick={() => setShowReceipt(true)}
                className="text-sm text-gold font-medium hover:text-gold/80 flex items-center gap-1"
              >
                <HiOutlineDocumentText className="w-4 h-4" /> View Receipt
              </button>
            )}
          </div>
          <div className="space-y-2 text-sm">
            {booking.breakdown && (
              <>
                {booking.breakdown.venue > 0 && <div className="flex justify-between"><span className="text-gray-500">Venue</span><span className="text-dark">₹{formatPrice(booking.breakdown.venue)}</span></div>}
                {booking.breakdown.base > 0 && <div className="flex justify-between"><span className="text-gray-500">Package Base</span><span className="text-dark">₹{formatPrice(booking.breakdown.base)}</span></div>}
                {booking.breakdown.vendors > 0 && <div className="flex justify-between"><span className="text-gray-500">Vendors</span><span className="text-dark">₹{formatPrice(booking.breakdown.vendors)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">GST (18%)</span><span className="text-dark">₹{formatPrice(booking.breakdown.gst)}</span></div>
              </>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3">
              <span className="text-dark">Total Amount</span>
              <span className="text-gold">₹{formatPrice(booking.totalAmount)}</span>
            </div>
            {booking.status !== 'cancelled' && remainingAmount > 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  {paidAmount > 0 && (
                    <>
                      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm text-emerald-700 font-medium">Paid: ₹{formatPrice(paidAmount)}</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-amber-700 font-medium">Remaining: ₹{formatPrice(remainingAmount)}</p>
                <p className="text-xs text-amber-600 mt-1">Complete full payment to confirm your booking and notify guests</p>
                <button
                  onClick={() => navigate(`/checkout/${booking.id}?mode=remaining`)}
                  className="mt-3 px-5 py-2 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90 flex items-center gap-1.5 shadow-sm"
                >
                  <HiOutlineCreditCard className="w-4 h-4" /> Pay Remaining Balance
                </button>
              </div>
            )}
            {booking.status === 'pending' && remainingAmount <= 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-700 font-medium">Payment Pending</p>
                <p className="text-xs text-amber-600 mt-1">Complete payment to confirm your booking</p>
                <button onClick={() => navigate(`/checkout/${booking.id}`)} className="mt-3 px-5 py-2 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90 flex items-center gap-1.5">
                  <HiOutlineCreditCard className="w-4 h-4" /> Pay Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {(booking.status === 'confirmed' || booking.status === 'pending') && (
            <button onClick={() => setCancelConfirm(true)} className="px-6 py-3 border border-red-200 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-all flex items-center gap-1.5">
              <HiOutlineXCircle className="w-4 h-4" /> Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Popup */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCancelConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-[fadeInUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiOutlineExclamationCircle className="w-9 h-9 text-amber-600" />
            </div>
            <h3 className="font-serif text-xl font-bold text-dark text-center mb-2">Cancel This Booking?</h3>
            <p className="text-gray-500 text-sm text-center mb-2">
              Are you sure you want to cancel your wedding booking? This action cannot be undone.
            </p>
            {(() => {
              const weddingDate = booking.dates?.wedding;
              let refundPct = 100;
              let refundNote = 'Full refund (100%)';
              if (weddingDate) {
                const daysUntil = Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysUntil < 7) { refundPct = 20; refundNote = '20% refund (less than 7 days to wedding)'; }
                else if (daysUntil < 15) { refundPct = 50; refundNote = '50% refund (7-14 days to wedding)'; }
                else if (daysUntil < 30) { refundPct = 75; refundNote = '75% refund (15-29 days to wedding)'; }
                else { refundPct = 100; refundNote = '100% refund (30+ days to wedding)'; }
              }
              return (
                <p className="text-emerald-600 text-sm text-center mb-6 font-medium">
                  {refundNote} — will be processed to your original payment method within 7-10 business days.
                </p>
              );
            })()}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[fadeInUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <HiOutlineDocumentText className="w-10 h-10 text-gold mx-auto mb-2" />
              <h3 className="font-serif text-xl font-bold text-dark">Payment Receipt</h3>
              <p className="text-gray-400 text-xs mt-1">Booking #{booking.id}</p>
            </div>

            <div className="space-y-3 text-sm border-t border-b border-gray-100 py-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Booking Type</span>
                <span className="text-dark capitalize font-medium">{booking.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destination</span>
                <span className="text-dark font-medium">{getDestName(booking.destinationId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Wedding Date</span>
                <span className="text-dark font-medium">{booking.dates?.wedding || 'TBD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="text-dark capitalize font-medium">{booking.payment?.method || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID</span>
                <span className="text-dark font-mono text-xs">{booking.payment?.transactionId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid On</span>
                <span className="text-dark font-medium">{booking.payment?.paidAt ? new Date(booking.payment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="text-dark font-bold">₹{formatPrice(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="text-emerald-600 font-bold">₹{formatPrice(paidAmount)}</span>
              </div>
              {remainingAmount > 0 && (
                <div className="flex justify-between bg-amber-50 -mx-2 px-2 py-2 rounded-lg">
                  <span className="text-amber-700 font-medium">Remaining Balance</span>
                  <span className="text-amber-700 font-bold">₹{formatPrice(remainingAmount)}</span>
                </div>
              )}
            </div>

            {remainingAmount > 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Remaining balance of ₹{formatPrice(remainingAmount)} is due before your event date.
              </p>
            )}

            <button
              onClick={() => setShowReceipt(false)}
              className="w-full mt-6 py-3 bg-gold text-white rounded-xl font-medium text-sm hover:bg-gold/90 transition-all"
            >
              Close
            </button>
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