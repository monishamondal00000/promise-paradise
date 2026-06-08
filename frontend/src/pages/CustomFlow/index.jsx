import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import Stepper from '../../components/Stepper';
import { showToast } from '../../components/Toast';
import { HiOutlineCalendar, HiOutlinePhone, HiOutlineSearch, HiOutlineSparkles, HiOutlineStar, HiOutlineX } from 'react-icons/hi';

const steps = ['Destination & Venue', 'Wedding Details', 'Guests', 'Vendors', 'Review'];
const weddingTypes = [
  'Hindu Traditional', 'Hindu Vedic', 'Muslim (Nikah)', 'Christian', 'Sikh (Anand Karaj)',
  'Jain', 'Buddhist', 'Parsi (Lagan)', 'Arya Samaj', 'Inter-faith', 'Court Marriage + Reception'
];
const accommodationMultiplier = { 'resort buyout': 2.0, 'villa': 1.6, 'hotel block': 1.0, 'mixed': 0.8 };

export default function CustomFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const agentPrefill = location.state?.agentPrefill;
  const [currentStep, setCurrentStep] = useState(0);
  const [destinations, setDestinations] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Form state
  const [selectedDest, setSelectedDest] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showVenueReviews, setShowVenueReviews] = useState(null);
  const [groomName, setGroomName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [weddingType, setWeddingType] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [accommodation, setAccommodation] = useState('hotel block');
  const [timeline, setTimeline] = useState([]);
  const [guestCount, setGuestCount] = useState(100);
  const [guestList, setGuestList] = useState([]);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', phone: '' });
  const [selectedVendors, setSelectedVendors] = useState({});
  const [personalVendors, setPersonalVendors] = useState([]);
  const [showAddPersonalVendor, setShowAddPersonalVendor] = useState(false);
  const [newPersonalVendor, setNewPersonalVendor] = useState({ name: '', category: '', phone: '', email: '' });
  const [transportRequired, setTransportRequired] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  const venueRef = useRef(null);

  // Filters
  const [destFilter, setDestFilter] = useState({ country: 'all', sort: 'name', search: '' });
  const [destPage, setDestPage] = useState(0);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSort, setVendorSort] = useState('rating');
  const DEST_PER_PAGE = 8;

  // AI Timeline
  const [aiTimelineLoading, setAiTimelineLoading] = useState(false);
  const [aiTimelineSuggestion, setAiTimelineSuggestion] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Load saved templates from localStorage
  const getSavedTemplates = () => {
    try {
      return JSON.parse(localStorage.getItem('pp_timeline_templates') || '[]');
    } catch { return []; }
  };
  const [savedTemplates, setSavedTemplates] = useState(getSavedTemplates);

  const saveTemplate = (name, tl) => {
    const templates = getSavedTemplates();
    templates.push({ id: Date.now(), name, timeline: tl, days: tl.length, createdAt: new Date().toISOString() });
    localStorage.setItem('pp_timeline_templates', JSON.stringify(templates));
    setSavedTemplates(templates);
    setShowSaveTemplate(false);
    setTemplateName('');
    showToast(`Template "${name}" saved!`, 'success');
  };

  const deleteTemplate = (id) => {
    const templates = getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem('pp_timeline_templates', JSON.stringify(templates));
    setSavedTemplates(templates);
  };

  const applyTemplate = (tl) => {
    setTimeline(tl);
    setShowTemplates(false);
    showToast('Template applied!', 'success');
  };

  const generateAITimeline = async (numDays) => {
    setAiTimelineLoading(true);
    setAiTimelineSuggestion(null);
    try {
      const res = await API.post('/ai/timeline', {
        days: numDays || 3,
        style: weddingType || 'Traditional Indian',
        guestCount,
        destination: selectedDest?.name || '',
        notes: ''
      });
      setAiTimelineSuggestion(res.data.timeline);
    } catch (err) {
      showToast('AI timeline generation failed. Try again.', 'error');
    } finally {
      setAiTimelineLoading(false);
    }
  };

  // Derive vendor categories from actual vendor data
  const vendorCategories = useMemo(() => {
    const cats = [...new Set(vendors.map(v => v.category))];
    return cats.length > 0 ? cats : [];
  }, [vendors]);

  useEffect(() => {
    if (vendorCategories.length > 0 && !activeCategory) {
      setActiveCategory(vendorCategories[0]);
    }
  }, [vendorCategories]);

  useEffect(() => {
    API.get('/destinations').then(res => {
      setDestinations(res.data);
      // If we arrived from the AI agent with a full prefill, populate everything and jump to Review
      if (agentPrefill && agentPrefill.fromAgent) {
        const found = res.data.find(d => d.id === agentPrefill.destinationId);
        if (found) {
          setSelectedDest(found);
          if (agentPrefill.weddingDate) setWeddingDate(agentPrefill.weddingDate);
          if (agentPrefill.accommodation) setAccommodation(agentPrefill.accommodation);
          if (agentPrefill.guestCount) setGuestCount(agentPrefill.guestCount);
          if (agentPrefill.groomName) setGroomName(agentPrefill.groomName);
          if (agentPrefill.brideName) setBrideName(agentPrefill.brideName);
          if (agentPrefill.weddingType) setWeddingType(agentPrefill.weddingType);
          if (agentPrefill.timeline) setTimeline(agentPrefill.timeline);
          if (agentPrefill.selectedVendors) setSelectedVendors(agentPrefill.selectedVendors);
          setCurrentStep(agentPrefill.jumpToStep != null ? agentPrefill.jumpToStep : 4);
          return;
        }
      }
      // Preselect destination from URL query param and stay on step 0 to select venue
      const destParam = searchParams.get('destination');
      if (destParam) {
        const found = res.data.find(d => d.id === destParam);
        if (found) {
          setSelectedDest(found);
          setCurrentStep(0);
          // Calculate which page this destination is on and navigate to it
          const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name));
          const idx = sorted.findIndex(d => d.id === destParam);
          if (idx >= 0) {
            setDestPage(Math.floor(idx / DEST_PER_PAGE));
          }
          setTimeout(() => venueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
        }
      }
    }).catch(() => {});
    API.get('/vendors').then(res => setVendors(res.data)).catch(() => {});
  }, [searchParams]);

  // Number of days derived from timeline
  const days = timeline.length || 1;

  // Filtered destinations
  const filteredDests = useMemo(() => {
    let result = [...destinations];
    if (destFilter.country !== 'all') {
      result = result.filter(d => destFilter.country === 'india' ? !d.isInternational : d.isInternational);
    }
    if (destFilter.search) {
      const s = destFilter.search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(s) || d.country.toLowerCase().includes(s) || d.city?.toLowerCase().includes(s));
    }
    if (destFilter.sort === 'price-low') result.sort((a, b) => a.pricePerDay - b.pricePerDay);
    else if (destFilter.sort === 'price-high') result.sort((a, b) => b.pricePerDay - a.pricePerDay);
    else result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [destinations, destFilter]);

  const destPages = Math.ceil(filteredDests.length / DEST_PER_PAGE);
  const pagedDests = filteredDests.slice(destPage * DEST_PER_PAGE, (destPage + 1) * DEST_PER_PAGE);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    let result = vendors.filter(v => v.category === activeCategory);
    if (vendorSearch) {
      const s = vendorSearch.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(s) || v.city?.toLowerCase().includes(s));
    }
    if (vendorSort === 'rating') result.sort((a, b) => b.rating - a.rating);
    else if (vendorSort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [vendors, activeCategory, vendorSearch, vendorSort]);

  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price);

  // Venue cost = pricePerDay * days * accommodation multiplier
  const venueCost = () => {
    if (!selectedDest) return 0;
    return Math.round(selectedDest.pricePerDay * days * (accommodationMultiplier[accommodation] || 1));
  };

  // Vendor cost calculation
  const getVendorCost = (v) => {
    if (!v || !v.priceRange) return 0;
    const nums = v.priceRange.match(/[\d,]+/g);
    if (!nums || nums.length === 0) return 0;
    const min = parseInt(nums[0].replace(/,/g, ''));
    const max = nums.length > 1 ? parseInt(nums[1].replace(/,/g, '')) : min;

    // Per-plate vendors (Catering, Invitations) - based on guest count
    if (v.category === 'Catering' || v.category === 'Invitations') {
      const perUnit = min + (max - min) * 0.5;
      const cost = Math.round((perUnit * guestCount) / 10000) * 10000;
      return Math.max(cost, 10000);
    }

    // Other vendors - base + day scaling
    const dayFactor = Math.min(days / 3, 2);
    const base = min + (max - min) * 0.35;
    const cost = Math.round((base * dayFactor) / 10000) * 10000;
    return Math.max(min, Math.min(cost, max));
  };

  const vendorsCost = () => {
    let total = 0;
    Object.values(selectedVendors).forEach(v => { total += getVendorCost(v); });
    return total;
  };

  const totalCost = () => venueCost() + vendorsCost();

  // Timeline templates
  const generateTimeline = (numDays) => {
    const templates = {
      1: [{ day: 1, events: [{ name: 'Wedding Ceremony & Reception', time: '10:00', venue: '' }] }],
      2: [
        { day: 1, events: [{ name: 'Mehendi & Sangeet', time: '16:00', venue: '' }] },
        { day: 2, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Reception Dinner', time: '19:00', venue: '' }] }
      ],
      3: [
        { day: 1, events: [{ name: 'Haldi Ceremony', time: '10:00', venue: '' }, { name: 'Mehendi Evening', time: '16:00', venue: '' }] },
        { day: 2, events: [{ name: 'Sangeet Night', time: '19:00', venue: '' }] },
        { day: 3, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Grand Reception', time: '19:00', venue: '' }] }
      ],
      5: [
        { day: 1, events: [{ name: 'Welcome Dinner', time: '19:00', venue: '' }] },
        { day: 2, events: [{ name: 'Haldi Ceremony', time: '10:00', venue: '' }] },
        { day: 3, events: [{ name: 'Mehendi Afternoon', time: '14:00', venue: '' }] },
        { day: 4, events: [{ name: 'Sangeet & Cocktail Night', time: '19:00', venue: '' }] },
        { day: 5, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Reception & After-Party', time: '19:00', venue: '' }] }
      ]
    };
    return templates[numDays] || templates[3];
  };

  const handleAddDay = () => {
    setTimeline([...timeline, { day: timeline.length + 1, events: [{ name: '', time: '', venue: '' }] }]);
  };

  const handleAddGuest = () => {
    if (newGuest.name || newGuest.email || newGuest.phone) {
      setGuestList([...guestList, { ...newGuest }]);
      setNewGuest({ name: '', email: '', phone: '' });
    }
  };

  const handleSubmitBooking = async () => {
    try {
      const total = totalCost();
      const gst = Math.round(total * 0.18);
      const res = await API.post('/bookings', {
        type: 'custom',
        destinationId: selectedDest.id,
        destinationName: selectedDest.name,
        venue: selectedVenue ? selectedVenue.name : null,
        dates: { wedding: weddingDate },
        guestCount,
        accommodation,
        groomName,
        brideName,
        weddingType,
        transportRequired,
        selectedVendors: Object.entries(selectedVendors).map(([cat, v]) => ({ id: v.id, name: v.name, category: cat, cost: getVendorCost(v) })),
        personalVendors,
        timeline,
        guests: guestList,
        totalAmount: total + gst,
        breakdown: { venue: venueCost(), vendors: vendorsCost(), gst, total: total + gst }
      });
      // Clear AI agent chat after successful booking
      try { localStorage.removeItem('pp_agent_v1'); } catch {}
      navigate('/checkout/' + res.data.id);
    } catch (err) {
      showToast('Booking failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // Navigation buttons
  const NavButtons = ({ canNext = true, nextLabel = 'Continue', onNext }) => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {steps.length}
          {selectedDest && <span className="ml-4 text-gold font-medium">Est. ₹{formatPrice(totalCost())}</span>}
        </div>
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep(currentStep - 1)} className="px-6 py-2.5 border-2 border-gold text-gold rounded-full text-sm font-medium hover:bg-gold/5 transition-all">
              ← Back
            </button>
          )}
          <button
            onClick={onNext || (() => setCurrentStep(currentStep + 1))}
            disabled={!canNext}
            className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all ${canNext ? 'bg-gold text-white hover:bg-gold/90 shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {nextLabel} →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 max-w-6xl mx-auto">
      {/* Venue Reviews Modal */}
      {showVenueReviews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowVenueReviews(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-xl font-bold text-dark">{showVenueReviews.name} — Reviews</h3>
              <button onClick={() => setShowVenueReviews(null)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{showVenueReviews.type} · {showVenueReviews.capacity > 0 ? `Up to ${showVenueReviews.capacity} guests` : ''}</p>
            {showVenueReviews.youtubeReviewUrl && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                <a href={showVenueReviews.youtubeReviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  Watch Video Review on YouTube
                </a>
              </div>
            )}
            {showVenueReviews.reviews?.length > 0 ? (
              <div className="space-y-4">
                {showVenueReviews.reviews.map((review, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-dark text-sm">{review.reviewer}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, s) => (
                          <HiOutlineStar key={s} className={`w-4 h-4 ${s < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                    <p className="text-xs text-gray-400 mt-2">{review.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No reviews available for this venue yet.</p>
            )}
          </div>
        </div>
      )}

      <Stepper steps={steps} currentStep={currentStep} onStepClick={(i) => setCurrentStep(i)} />

      {/* Step 0: Destination */}
      {currentStep === 0 && (
        <div>
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Where will your love story unfold?</h2>
            <p className="text-gray-500">Choose from {destinations.length} stunning destinations across India and the world</p>
          </div>

          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Search</label>
              <input type="text" placeholder="Search destinations..." value={destFilter.search} onChange={(e) => { setDestFilter({...destFilter, search: e.target.value}); setDestPage(0); }} className="px-4 py-2 border border-gray-200 rounded-full text-sm w-64 focus:outline-none focus:border-gold" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Location</label>
              <select value={destFilter.country} onChange={(e) => { setDestFilter({...destFilter, country: e.target.value}); setDestPage(0); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer shadow-sm">
                <option value="all">All Locations</option>
                <option value="india">India</option>
                <option value="international">International</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Sort By</label>
              <select value={destFilter.sort} onChange={(e) => setDestFilter({...destFilter, sort: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer shadow-sm">
                <option value="name">Name: A-Z</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
            <span className="text-sm text-gray-400 ml-auto self-end pb-1">{filteredDests.length} results</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pagedDests.map(dest => (
              <div key={dest.id} onClick={() => { setSelectedDest(dest); setSelectedVenue(null); setTimeout(() => venueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all hover:shadow-lg group ${selectedDest?.id === dest.id ? 'border-gold shadow-lg ring-2 ring-gold/20' : 'border-transparent hover:border-blush'}`}>
                <div className="relative overflow-hidden">
                  <img src={dest.imageUrl} alt={dest.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                  {dest.isInternational && <span className="absolute top-2 right-2 bg-dark/70 text-white text-xs px-2 py-0.5 rounded-full">International</span>}
                  {selectedDest?.id === dest.id && <div className="absolute top-2 left-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-serif font-semibold text-dark">{dest.name}</h3>
                  <p className="text-xs text-gray-500">{dest.city || dest.country}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm font-medium text-gold">₹{formatPrice(dest.pricePerDay)}/day</p>
                    {(dest.subPlaces?.length > 0) && <p className="text-xs text-gray-500">{dest.subPlaces.length} venue{dest.subPlaces.length > 1 ? 's' : ''}</p>}
                  </div>
                  {!dest.subPlaces?.length && <p className="text-xs text-gray-400 mt-1">{dest.bestSeason}</p>}
                </div>
              </div>
            ))}
          </div>

          {destPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button onClick={() => setDestPage(Math.max(0, destPage - 1))} disabled={destPage === 0} className="px-4 py-2 border rounded-full text-sm disabled:opacity-30">← Prev</button>
              {Array.from({ length: destPages }).map((_, i) => (
                <button key={i} onClick={() => setDestPage(i)} className={`w-8 h-8 rounded-full text-sm ${i === destPage ? 'bg-gold text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setDestPage(Math.min(destPages - 1, destPage + 1))} disabled={destPage === destPages - 1} className="px-4 py-2 border rounded-full text-sm disabled:opacity-30">Next →</button>
            </div>
          )}
          {/* Venue Selection */}
          {selectedDest && selectedDest.subPlaces?.length > 0 && (
            <div ref={venueRef} className="mt-8 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-serif text-lg font-semibold text-dark mb-1">Choose a Venue at {selectedDest.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedDest.subPlaces.length} venue{selectedDest.subPlaces.length > 1 ? 's' : ''} available · Price remains the same</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedDest.subPlaces.map((venue, idx) => (
                  <div key={idx} onClick={() => setSelectedVenue(venue)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedVenue?.name === venue.name ? 'border-gold bg-gold/5 ring-1 ring-gold/20' : 'border-gray-100 hover:border-blush'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-dark text-sm">{venue.name}</h4>
                      <div className="flex items-center gap-1">
                        {venue.reviews?.length > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); setShowVenueReviews(venue); }} className="text-xs text-indigo-500 hover:text-indigo-700 underline">Reviews</button>
                        )}
                        {selectedVenue?.name === venue.name && <span className="text-gold text-xs">✓</span>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{venue.type}</p>
                    {venue.capacity > 0 && <p className="text-xs text-gray-400 mt-0.5">Up to {venue.capacity} guests</p>}
                    {venue.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{venue.description}</p>}
                  </div>
                ))}
              </div>

              {/* Transportation Details */}
              {selectedVenue && selectedDest.transportation && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <h5 className="text-sm font-semibold text-blue-800 mb-2">Getting There — Travel Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Nearest Airport</p>
                      <p className="text-blue-900">{selectedDest.transportation.nearestAirport}</p>
                      <p className="text-xs text-blue-700">Approx. {selectedDest.transportation.airportDistance} from venue</p>
                    </div>
                    {selectedDest.transportation.railwayStation !== 'N/A (No railway)' && selectedDest.transportation.railwayStation !== 'N/A' && (
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Nearest Railway Station</p>
                        <p className="text-blue-900">{selectedDest.transportation.railwayStation}</p>
                        <p className="text-xs text-blue-700">Approx. {selectedDest.transportation.railwayDistance} from venue</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-blue-600 font-medium">Transport Options</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDest.transportation.transportModes?.map((m, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Transportation checkbox for guests */}
                  <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transportRequired}
                        onChange={(e) => setTransportRequired(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-gold rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-dark">Arrange guest transportation from airport/railway station?</p>
                        <p className="text-xs text-gray-500 mt-1">We'll coordinate pickup/drop for your guests from the nearest transport hub to the venue.</p>
                      </div>
                    </label>
                    {transportRequired && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700">Transportation charges are not included in the platform billing. Payments for transport will be settled directly after the event — not charged here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <NavButtons canNext={!!selectedDest && (!selectedDest.subPlaces?.length || !!selectedVenue)} nextLabel="Wedding Details" />
        </div>
      )}

      {/* Step 1: Celebration Details (merged) */}
      {currentStep === 1 && (
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Design your celebration at {selectedDest?.name}</h2>
            <p className="text-gray-500">Tell us about yourselves, set the date, style, and plan your event timeline</p>
          </div>

          {/* Couple Names & Wedding Type */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-5 mb-6">
            <h4 className="font-serif font-semibold text-dark">About the Couple</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Groom's Name <span className="text-red-400">*</span></label>
                <input type="text" value={groomName} onChange={(e) => setGroomName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" placeholder="Enter groom's full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Bride's Name <span className="text-red-400">*</span></label>
                <input type="text" value={brideName} onChange={(e) => setBrideName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" placeholder="Enter bride's full name" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Ceremony Style</label>
              <select value={weddingType} onChange={(e) => setWeddingType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer">
                <option value="">Select your ceremony style...</option>
                {weddingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Style + Accommodation */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Wedding Date <span className="text-red-400">*</span> <span className="text-xs text-gray-400">(min. 15 days from today)</span></label>
                <input type="date" value={weddingDate} min={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} onChange={(e) => setWeddingDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Accommodation</label>
                <select value={accommodation} onChange={(e) => setAccommodation(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer">
                  <option value="resort buyout">Resort Buyout (2x)</option>
                  <option value="hotel block">Hotel Block (1x)</option>
                  <option value="villa">Private Villa (1.6x)</option>
                  <option value="mixed">Mixed (0.8x)</option>
                </select>
              </div>
            </div>
            <div className="bg-blush/20 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-dark">Venue cost ({days} day{days > 1 ? 's' : ''} × ₹{formatPrice(selectedDest?.pricePerDay || 0)} × {accommodationMultiplier[accommodation]}x)</span>
              <span className="text-gold font-bold">₹{formatPrice(venueCost())}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg font-semibold text-dark">Event Timeline</h3>
              <div className="flex items-center gap-2">
                {timeline.length > 0 && (
                  <>
                    <button onClick={() => setShowSaveTemplate(true)} className="text-xs text-gold border border-gold/30 px-3 py-1.5 rounded-full hover:bg-gold/5 transition-all">Save as Template</button>
                    <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all">My Templates</button>
                  </>
                )}
                <span className="text-sm text-gray-500">{days} day{days > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Save Template Modal */}
            {showSaveTemplate && (
              <div className="bg-white border border-gold/30 rounded-2xl p-5 mb-4 shadow-md">
                <h4 className="font-semibold text-dark text-sm mb-3">Save Current Timeline as Template</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Template name (e.g., 3-Day Royal Rajputana)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold"
                  />
                  <button onClick={() => templateName.trim() && saveTemplate(templateName.trim(), timeline)} disabled={!templateName.trim()} className="px-5 py-2.5 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 disabled:opacity-40">Save</button>
                  <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Saved Templates Panel */}
            {showTemplates && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
                <h4 className="font-semibold text-dark text-sm mb-3">My Saved Templates</h4>
                {savedTemplates.length === 0 ? (
                  <p className="text-sm text-gray-400">No saved templates yet. Create a timeline and save it!</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedTemplates.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gold/5 transition-all">
                        <div>
                          <p className="text-sm font-medium text-dark">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.days} days · {t.timeline.reduce((sum, d) => sum + d.events.length, 0)} events</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => applyTemplate(t.timeline)} className="px-3 py-1.5 bg-gold text-white rounded-lg text-xs font-medium hover:bg-gold/90">Apply</button>
                          <button onClick={() => deleteTemplate(t.id)} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {timeline.length === 0 && (
              <div className="bg-white p-8 rounded-2xl text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gold/10 rounded-full flex items-center justify-center">
                  <HiOutlineCalendar className="w-6 h-6 text-gold" />
                </div>
                <p className="text-gray-600 mb-4">Start with a template or ask AI</p>
                <div className="flex flex-wrap gap-3 justify-center mb-4">
                  {[1, 2, 3, 5].map(d => (
                    <button key={d} onClick={() => setTimeline(generateTimeline(d))} className="px-5 py-2.5 border-2 border-gold text-gold rounded-xl text-sm hover:bg-gold/10 font-medium transition-all">
                      {d}-Day
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <p className="text-xs text-gray-400 mb-3">Or let AI create a custom plan</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {[2, 3, 4, 5].map(d => (
                      <button key={d} onClick={() => generateAITimeline(d)} disabled={aiTimelineLoading} className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center gap-1.5">
                        <HiOutlineSparkles className="w-3.5 h-3.5" /> {d}-Day
                      </button>
                    ))}
                  </div>
                </div>
                {savedTemplates.length > 0 && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs text-gray-400 mb-3">Or apply a saved template</p>
                    <button onClick={() => setShowTemplates(true)} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-all">Browse My Templates ({savedTemplates.length})</button>
                  </div>
                )}
              </div>
            )}

            {/* AI Suggestion Preview */}
            {aiTimelineLoading && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-4 text-center">
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <HiOutlineSparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-sm font-medium">AI is creating your perfect timeline...</span>
                </div>
              </div>
            )}

            {aiTimelineSuggestion && !aiTimelineLoading && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5"><HiOutlineSparkles className="w-4 h-4" /> AI-Generated Timeline</h4>
                  <div className="flex gap-2">
                    <button onClick={() => { setTimeline(aiTimelineSuggestion); setAiTimelineSuggestion(null); showToast('AI timeline applied!', 'success'); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">✓ Use This</button>
                    <button onClick={() => setAiTimelineSuggestion(null)} className="px-4 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-xs hover:bg-indigo-100">Dismiss</button>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiTimelineSuggestion.map((day, i) => (
                    <div key={i} className="bg-white/80 rounded-xl p-3">
                      <p className="text-xs font-medium text-indigo-600 mb-1">Day {day.day}</p>
                      {day.events.map((ev, j) => (
                        <p key={j} className="text-xs text-gray-600 ml-3">• {ev.name} {ev.time && <span className="text-gray-400">at {ev.time}</span>}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {timeline.length > 0 && (
              <div className="space-y-4">
                {timeline.map((day, dayIdx) => (
                  <div key={dayIdx} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                      <h4 className="font-serif font-semibold text-dark">Day {day.day}</h4>
                      <button onClick={() => { const t = [...timeline]; t.splice(dayIdx, 1); t.forEach((d, i) => d.day = i + 1); setTimeline(t); }} className="text-red-400 text-xs hover:text-red-600">Remove Day</button>
                    </div>
                    <div className="p-4 space-y-3">
                      {day.events.map((event, evIdx) => (
                        <div key={evIdx} className="flex gap-2 items-center">
                          <input value={event.name} onChange={(e) => { const t = [...timeline]; t[dayIdx].events[evIdx].name = e.target.value; setTimeline(t); }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" placeholder="Event name" />
                          <input type="time" value={event.time} onChange={(e) => { const t = [...timeline]; t[dayIdx].events[evIdx].time = e.target.value; setTimeline(t); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none w-28" />
                          <button onClick={() => { const t = [...timeline]; t[dayIdx].events.splice(evIdx, 1); if (t[dayIdx].events.length === 0) { t.splice(dayIdx, 1); t.forEach((d, i) => d.day = i + 1); } setTimeline(t); }} className="text-red-400 text-xs px-2 hover:bg-red-50 rounded">✕</button>
                        </div>
                      ))}
                      <button onClick={() => { const t = [...timeline]; t[dayIdx].events.push({ name: '', time: '', venue: '' }); setTimeline(t); }} className="text-gold text-xs font-medium hover:underline">+ Add Event</button>
                    </div>
                  </div>
                ))}
                <button onClick={handleAddDay} className="w-full py-3 border-2 border-dashed border-gold/50 rounded-2xl text-gold text-sm font-medium hover:bg-gold/5 transition-all">
                  + Add Day {timeline.length + 1}
                </button>
                <div className="flex gap-3 mt-3">
                  <button onClick={() => generateAITimeline(timeline.length || 3)} disabled={aiTimelineLoading} className="flex-1 py-2.5 border border-indigo-300 text-indigo-600 rounded-xl text-xs font-medium hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <HiOutlineSparkles className="w-3.5 h-3.5" /> {aiTimelineLoading ? 'Generating...' : 'Regenerate with AI'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <NavButtons canNext={!!weddingDate && timeline.length > 0 && !!groomName && !!brideName} nextLabel="Guest Details" />
        </div>
      )}

      {/* Step 2: Guests */}
      {currentStep === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">How many guests?</h2>
            <p className="text-gray-500">This helps us calculate catering and invitation costs</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
            <label className="block text-sm font-medium text-dark mb-3">Estimated Guest Count: <span className="text-gold font-bold text-lg">{guestCount}</span></label>
            <input type="range" min="10" max="500" step="10" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="w-full accent-gold" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10 (Intimate)</span><span>500 (Grand)</span></div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm mb-24">
            <h4 className="font-semibold text-dark mb-4">Guest List <span className="text-xs text-gray-400 font-normal">(optional)</span></h4>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-700 font-medium">Guest list can be added later</p>
              <p className="text-xs text-blue-600 mt-1">After booking, you can manage your full guest list (names, phone numbers, emails) from the booking details page.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input placeholder="Name (optional)" value={newGuest.name} onChange={(e) => setNewGuest({...newGuest, name: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
              <input placeholder="Email (optional)" type="email" value={newGuest.email} onChange={(e) => setNewGuest({...newGuest, email: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
              <input placeholder="Phone (optional)" value={newGuest.phone} onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
            </div>
            <button onClick={handleAddGuest} disabled={!newGuest.name && !newGuest.email && !newGuest.phone} className="px-5 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-all disabled:opacity-40">
              + Add Guest
            </button>

            {guestList.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="text-sm font-medium text-dark mb-3">{guestList.length} guest{guestList.length !== 1 ? 's' : ''} added</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {guestList.map((g, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-dark">{g.name || g.email || g.phone}</span>
                      <button onClick={() => setGuestList(guestList.filter((_, idx) => idx !== i))} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <NavButtons nextLabel="Choose Vendors" />
        </div>
      )}

      {/* Step 3: Vendors */}
      {currentStep === 3 && (
        <div>
          <div className="mb-6">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Handpick your dream team</h2>
            <p className="text-gray-500">Costs are calculated based on {guestCount} guests and {days} days</p>
          </div>

          {/* Personal Vendor Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-dashed border-gold/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-serif font-semibold text-dark">Your Personal Vendors</h4>
                <p className="text-xs text-gray-500 mt-1">Already have a vendor? Add them here — their cost won't be included in platform billing.</p>
              </div>
              <button onClick={() => setShowAddPersonalVendor(!showAddPersonalVendor)} className="px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-all">
                + Add Own Vendor
              </button>
            </div>

            {showAddPersonalVendor && (
              <div className="bg-gold/5 p-4 rounded-xl mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" placeholder="Vendor Name" value={newPersonalVendor.name} onChange={(e) => setNewPersonalVendor({...newPersonalVendor, name: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
                  <select value={newPersonalVendor.category} onChange={(e) => setNewPersonalVendor({...newPersonalVendor, category: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none bg-white appearance-none cursor-pointer">
                    <option value="">Select Category</option>
                    {vendorCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  <input type="text" placeholder="Phone (optional)" value={newPersonalVendor.phone} onChange={(e) => setNewPersonalVendor({...newPersonalVendor, phone: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
                  <input type="email" placeholder="Email (optional)" value={newPersonalVendor.email} onChange={(e) => setNewPersonalVendor({...newPersonalVendor, email: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (newPersonalVendor.name && newPersonalVendor.category) {
                      setPersonalVendors([...personalVendors, { ...newPersonalVendor, id: 'pv-' + Date.now() }]);
                      setNewPersonalVendor({ name: '', category: '', phone: '', email: '' });
                      setShowAddPersonalVendor(false);
                      showToast('Personal vendor added!', 'success');
                    }
                  }} disabled={!newPersonalVendor.name || !newPersonalVendor.category} className="px-5 py-2 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 disabled:opacity-40">Add</button>
                  <button onClick={() => setShowAddPersonalVendor(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
                <p className="text-xs text-amber-600">Personal vendors are managed by you. Their cost is NOT included in our pricing — you'll pay them directly.</p>
              </div>
            )}

            {personalVendors.length > 0 && (
              <div className="space-y-2">
                {personalVendors.map((pv, i) => (
                  <div key={pv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-dark">{pv.name}</p>
                      <p className="text-xs text-gray-500">{pv.category}{pv.phone ? ` · ${pv.phone}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Self-managed</span>
                      <button onClick={() => setPersonalVendors(personalVendors.filter((_, idx) => idx !== i))} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Vendors */}
          <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
            {vendorCategories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setVendorSearch(''); }} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1 ${activeCategory === cat ? 'bg-gold text-white shadow-md' : 'bg-white border border-gray-200 hover:border-gold text-gray-600'}`}>
                {cat} {selectedVendors[cat] && <span className="w-4 h-4 bg-white/30 rounded-full text-xs flex items-center justify-center">✓</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-6">
            <input type="text" placeholder={`Search ${activeCategory} vendors...`} value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gold" />
            <select value={vendorSort} onChange={(e) => setVendorSort(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gold appearance-none cursor-pointer shadow-sm">
              <option value="rating">Top Rated</option>
              <option value="name">A-Z</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
            {filteredVendors.map(v => {
              const isSelected = selectedVendors[activeCategory]?.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (isSelected) {
                      const updated = {...selectedVendors};
                      delete updated[activeCategory];
                      setSelectedVendors(updated);
                    } else {
                      setSelectedVendors({...selectedVendors, [activeCategory]: v});
                    }
                  }}
                  className={`bg-white p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-gold ring-2 ring-gold/20' : 'border-gray-100 hover:border-gold/50'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-dark">{v.name}</h4>
                      <p className="text-xs text-gray-400">{v.city}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="text-amber-500 text-xs">★</span>
                      <span className="text-xs font-medium text-amber-700">{v.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{v.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-gray-400">{v.priceRange}</p>
                    <p className="text-sm font-bold text-gold">₹{formatPrice(getVendorCost(v))}</p>
                  </div>
                  {v.specialties && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {v.specialties.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-3 space-y-1">
                    <p className="text-xs text-gray-500 flex items-center gap-1"><HiOutlinePhone className="w-3 h-3" /> {v.phone}</p>
                    <p className="text-xs text-gray-500">✉ {v.email}</p>
                  </div>
                </div>
              );
            })}
            {filteredVendors.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <HiOutlineSearch className="w-6 h-6 text-gray-400" />
                </div>
                <p>No vendors found.</p>
              </div>
            )}
          </div>

          <NavButtons canNext={Object.keys(selectedVendors).length > 0 || personalVendors.length > 0} nextLabel="Review" />
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <div className="max-w-3xl mx-auto">
          {!selectedDest ? (
            <div className="text-center py-12 text-gray-400">Loading destination details...</div>
          ) : (
          <>
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Your dream wedding, at a glance</h2>
            <p className="text-gray-500">Review & proceed to payment</p>
          </div>

          {agentPrefill?.fromAgent && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="text-indigo-500 text-lg mt-0.5">✨</span>
              <div>
                <p className="text-sm text-indigo-700 font-medium">AI-curated wedding plan</p>
                <p className="text-xs text-indigo-600 mt-0.5">These details were assembled by AI based on your conversation. You can go back to any step above to make changes before paying.</p>
              </div>
            </div>
          )}
          <div className="space-y-6 mb-24">
            {/* Couple & Destination */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="flex">
                <img src={selectedDest?.imageUrl} alt="" className="w-32 h-auto object-cover hidden md:block" />
                <div className="p-6 flex-1">
                  {(groomName || brideName) && (
                    <p className="text-sm font-medium text-gold mb-1">{groomName} & {brideName}</p>
                  )}
                  <h3 className="font-serif text-xl font-bold text-dark">{selectedDest?.name}</h3>
                  <p className="text-sm text-gray-500">{selectedDest?.city} · {days} day{days > 1 ? 's' : ''}</p>
                  <p className="text-sm text-gray-500 mt-1">{weddingDate} · ~{guestCount} guests · {accommodation}</p>
                  {weddingType && <p className="text-sm text-gray-500 mt-1">Ceremony: {weddingType}</p>}
                  {selectedVenue && <p className="text-sm text-gold mt-1">Venue: {selectedVenue.name}</p>}
                  {transportRequired && <p className="text-xs text-blue-600 mt-1">Guest transportation arranged</p>}
                </div>
              </div>
            </div>

            {/* Vendors */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h4 className="font-serif font-semibold text-dark mb-4">Selected Vendors ({Object.keys(selectedVendors).length + personalVendors.length})</h4>
              <div className="space-y-3">
                {Object.entries(selectedVendors).map(([cat, v]) => (
                  <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-dark">{v.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({cat})</span>
                    </div>
                    <span className="text-sm text-gold font-medium">₹{formatPrice(getVendorCost(v))}</span>
                  </div>
                ))}
                {personalVendors.map((pv) => (
                  <div key={pv.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-dark">{pv.name}</span>
                      <span className="text-xs text-amber-600 ml-2">(Personal — {pv.category})</span>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Self-managed</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h4 className="font-serif font-semibold text-dark mb-4">Timeline ({days} days)</h4>
              {timeline.map((day, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-sm font-medium text-gold mb-1">Day {day.day}</p>
                  {day.events.map((ev, j) => (
                    <p key={j} className="text-sm text-gray-600 ml-4">• {ev.name || 'Event'} {ev.time && `at ${ev.time}`}</p>
                  ))}
                </div>
              ))}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-gradient-to-br from-dark to-gray-800 p-6 rounded-2xl text-white">
              <h4 className="font-serif font-semibold mb-4">Estimated Cost Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-300">Venue ({days} days × {accommodation})</span><span>₹{formatPrice(venueCost())}</span></div>
                {Object.entries(selectedVendors).map(([cat, v]) => (
                  <div key={cat} className="flex justify-between"><span className="text-gray-300">{cat} — {v.name}</span><span>₹{formatPrice(getVendorCost(v))}</span></div>
                ))}
                <div className="flex justify-between"><span className="text-gray-300">GST (18%)</span><span>₹{formatPrice(Math.round(totalCost() * 0.18))}</span></div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-600 pt-3 mt-3">
                  <span>Total</span>
                  <span className="text-gold">₹{formatPrice(totalCost() + Math.round(totalCost() * 0.18))}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">* This is a tentative estimate. Final amount may vary based on actual guest count, vendor negotiations, and customizations. Any difference will be adjusted (refunded or charged) after the event.</p>
            </div>
          </div>
          <NavButtons nextLabel="Proceed to Payment" onNext={handleSubmitBooking} />
          </>
          )}
        </div>
      )}
    </div>
  );
}
