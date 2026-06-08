import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { API } from '../../context/AuthContext';
import Stepper from '../../components/Stepper';
import { showToast } from '../../components/Toast';
import { HiOutlineSparkles, HiOutlineStar, HiOutlineX } from 'react-icons/hi';

const steps = ['Select Package', 'Wedding Details', 'Timeline', 'Review'];

const weddingTypes = [
  'Hindu Traditional', 'Hindu Vedic', 'Muslim (Nikah)', 'Christian', 'Sikh (Anand Karaj)',
  'Jain', 'Buddhist', 'Parsi (Lagan)', 'Arya Samaj', 'Inter-faith', 'Court Marriage + Reception'
];

export default function PackageFlow() {
  const navigate = useNavigate();
  const { packageId } = useParams();
  const location = useLocation();
  const agentPrefill = location.state?.agentPrefill;
  const [currentStep, setCurrentStep] = useState(packageId ? 1 : 0);
  const [packages, setPackages] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showVenueReviews, setShowVenueReviews] = useState(null);
  const [customization, setCustomization] = useState({
    weddingDate: '', guestCount: 100, accommodation: 'hotel block', notes: '',
    groomName: '', brideName: '', weddingType: ''
  });
  const [timeline, setTimeline] = useState([]);
  const [guestList, setGuestList] = useState([]);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', phone: '' });

  // AI Timeline
  const [aiTimelineLoading, setAiTimelineLoading] = useState(false);
  const [aiTimelineSuggestion, setAiTimelineSuggestion] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const getSavedTemplates = () => {
    try { return JSON.parse(localStorage.getItem('pp_timeline_templates') || '[]'); } catch { return []; }
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
      const dest = destinations.find(d => d.id === selectedPkg?.destination);
      const res = await API.post('/ai/timeline', {
        days: numDays || 3,
        style: selectedPkg?.name || 'Traditional Indian',
        guestCount: customization.guestCount,
        destination: dest?.name || '',
        notes: customization.notes || ''
      });
      setAiTimelineSuggestion(res.data.timeline);
    } catch {
      showToast('AI timeline generation failed. Try again.', 'error');
    } finally {
      setAiTimelineLoading(false);
    }
  };

  // Filters for package selection
  const [pkgFilter, setPkgFilter] = useState({ tier: 'all', search: '', sort: 'discount' });

  useEffect(() => {
    API.get('/packages').then(res => {
      setPackages(res.data);
      if (packageId) {
        const found = res.data.find(p => p.id === packageId);
        if (found) {
          setSelectedPkg(found);
          generatePackageTimeline(found);
          // If we arrived from the AI agent with a full prefill, populate everything and jump to Review
          if (agentPrefill && agentPrefill.fromAgent) {
            setCustomization({
              weddingDate: agentPrefill.weddingDate || '',
              guestCount: agentPrefill.guestCount || 100,
              accommodation: agentPrefill.accommodation || 'hotel block',
              groomName: agentPrefill.groomName || '',
              brideName: agentPrefill.brideName || '',
              weddingType: agentPrefill.weddingType || '',
              notes: ''
            });
            setCurrentStep(agentPrefill.jumpToStep != null ? agentPrefill.jumpToStep : 3);
          }
        }
      }
    }).catch(() => {});
    API.get('/vendors').then(res => setVendors(res.data)).catch(() => {});
    API.get('/destinations').then(res => setDestinations(res.data)).catch(() => {});
  }, [packageId]);

  const getDestName = (id) => destinations.find(d => d.id === id)?.name || id;
  const getVendorName = (id) => vendors.find(v => v.id === id)?.name || id;
  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price);
  const getDiscountReason = (pkg) => (pkg?.discount > 25 ? (pkg.discountReason || 'Season Offer') : null);

  const filteredPackages = useMemo(() => {
    let result = [...packages];
    if (pkgFilter.tier !== 'all') result = result.filter(p => p.tier === pkgFilter.tier);
    if (pkgFilter.search) {
      const s = pkgFilter.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
    }
    if (pkgFilter.sort === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (pkgFilter.sort === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (pkgFilter.sort === 'discount') result.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    else result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [packages, pkgFilter]);

  const generatePackageTimeline = (pkg) => {
    const days = parseInt(pkg.duration) || 3;
    const templates = {
      1: [{ day: 1, events: [{ name: 'Wedding Ceremony & Reception', time: '10:00', venue: '' }] }],
      2: [
        { day: 1, events: [{ name: 'Mehendi & Sangeet', time: '16:00', venue: '' }] },
        { day: 2, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Reception Dinner', time: '19:00', venue: '' }] }
      ],
      3: [
        { day: 1, events: [{ name: 'Haldi & Mehendi', time: '10:00', venue: '' }] },
        { day: 2, events: [{ name: 'Sangeet Night', time: '19:00', venue: '' }] },
        { day: 3, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Grand Reception', time: '19:00', venue: '' }] }
      ]
    };
    setTimeline(templates[Math.min(days, 3)] || templates[3]);
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPkg(pkg);
    generatePackageTimeline(pkg);
    setCurrentStep(1);
  };

  const calculateTotal = () => selectedPkg ? selectedPkg.price : 0;

  const handleAddGuest = () => {
    if (newGuest.name || newGuest.email || newGuest.phone) {
      setGuestList([...guestList, { ...newGuest }]);
      setNewGuest({ name: '', email: '', phone: '' });
    }
  };

  const handleBooking = async () => {
    try {
      const total = calculateTotal();
      const gst = Math.round(total * 0.18);
      const res = await API.post('/bookings', {
        type: 'package',
        packageId: selectedPkg.id,
        destinationId: selectedPkg.destination,
        venue: selectedVenue ? selectedVenue.name : null,
        dates: { wedding: customization.weddingDate },
        guestCount: customization.guestCount,
        accommodation: customization.accommodation,
        groomName: customization.groomName,
        brideName: customization.brideName,
        weddingType: customization.weddingType,
        guests: guestList,
        timeline,
        totalAmount: total + gst,
        breakdown: { base: selectedPkg.price, gst, total: total + gst }
      });
      // Clear AI agent chat after successful booking
      try { localStorage.removeItem('pp_agent_v1'); } catch {}
      navigate('/checkout/' + res.data.id);
    } catch (err) {
      alert('Booking failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Consistent nav buttons (same as CustomFlow)
  const NavButtons = ({ canNext = true, nextLabel = 'Continue', onNext }) => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {steps.length}
          {selectedPkg && <span className="ml-4 text-gold font-medium">₹{formatPrice(calculateTotal())}</span>}
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

      {/* Step 0: Select Package */}
      {currentStep === 0 && (
        <div>
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Choose your perfect package</h2>
            <p className="text-gray-500">All-inclusive packages with pre-selected venues, vendors, and planning</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8 items-center">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Search</label>
              <input
                type="text"
                placeholder="Search packages..."
                value={pkgFilter.search}
                onChange={(e) => setPkgFilter({...pkgFilter, search: e.target.value})}
                className="px-4 py-2 border border-gray-200 rounded-full text-sm w-56 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Budget Tier</label>
              <select value={pkgFilter.tier} onChange={(e) => setPkgFilter({...pkgFilter, tier: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gold appearance-none cursor-pointer shadow-sm">
                <option value="all">All Tiers</option>
                <option value="budget">Budget</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-medium mb-1 ml-1">Sort By</label>
              <select value={pkgFilter.sort} onChange={(e) => setPkgFilter({...pkgFilter, sort: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gold appearance-none cursor-pointer shadow-sm">
                <option value="discount">Best Discount</option>
                <option value="name">Name: A-Z</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
            <span className="text-sm text-gray-400 ml-auto self-end pb-1">{filteredPackages.length} packages</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {filteredPackages.map(pkg => (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-gold/30 transition-all cursor-pointer group"
              >
                <div className="relative overflow-hidden">
                  <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                    pkg.tier === 'luxury' ? 'bg-gold text-white' :
                    pkg.tier === 'premium' ? 'bg-purple-500 text-white' :
                    pkg.tier === 'standard' ? 'bg-blue-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>{pkg.tier}</span>
                  {pkg.discount > 0 && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-lg animate-pulse">
                      {pkg.discount}% OFF
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-lg font-bold text-dark mb-1">{pkg.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{getDestName(pkg.destination)} · {pkg.duration} · {pkg.guestCount}</p>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      {pkg.discount > 0 && pkg.originalPrice && (
                        <p className="text-sm text-gray-400 line-through">₹{formatPrice(pkg.originalPrice)}</p>
                      )}
                      <p className="text-lg font-bold text-gold">₹{formatPrice(pkg.price)}</p>
                    </div>
                    <span className="text-xs text-gray-400">{pkg.includes?.length || 0} inclusions</span>
                  </div>
                  {getDiscountReason(pkg) && (
                    <p className="mt-3 text-xs font-medium text-emerald-600">Reason: {getDiscountReason(pkg)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Customize */}
      {currentStep === 1 && selectedPkg && (
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Customize your {selectedPkg.name}</h2>
            <p className="text-gray-500">Personalize the package details for your celebration</p>
          </div>

          {/* Package summary card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">
            <div className="flex flex-col md:flex-row">
              <img src={selectedPkg.imageUrl} alt="" className="w-full md:w-48 h-48 md:h-auto object-cover" />
              <div className="p-6 flex-1">
                <h3 className="font-serif text-xl font-bold text-dark mb-1">{selectedPkg.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{getDestName(selectedPkg.destination)} · {selectedPkg.duration} · {selectedPkg.guestCount}</p>
                <div className="flex items-center gap-3 mb-3">
                  {selectedPkg.discount > 0 && selectedPkg.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">₹{formatPrice(selectedPkg.originalPrice)}</span>
                  )}
                  <span className="text-gold font-bold text-lg">₹{formatPrice(selectedPkg.price)}</span>
                  {selectedPkg.discount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{selectedPkg.discount}% OFF</span>
                  )}
                </div>
                {getDiscountReason(selectedPkg) && (
                  <p className="text-sm text-emerald-600 font-medium mb-3">Reason: {getDiscountReason(selectedPkg)}</p>
                )}
                {/* Included vendors */}
                {selectedPkg.vendors && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">PRE-SELECTED VENDORS</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPkg.vendors.map((vid, i) => (
                        <span key={i} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full">{getVendorName(vid)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
            <h4 className="font-serif font-semibold text-dark mb-4">What's Included</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedPkg.includes?.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gold">✓</span> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Customization form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-5">
            <h4 className="font-serif font-semibold text-dark">Your Details</h4>

            {/* Couple Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Groom's Name <span className="text-red-400">*</span></label>
                <input type="text" value={customization.groomName} onChange={(e) => setCustomization({...customization, groomName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" placeholder="Enter groom's full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Bride's Name <span className="text-red-400">*</span></label>
                <input type="text" value={customization.brideName} onChange={(e) => setCustomization({...customization, brideName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" placeholder="Enter bride's full name" />
              </div>
            </div>

            {/* Wedding Ceremony Type */}
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Ceremony Style</label>
              <select value={customization.weddingType} onChange={(e) => setCustomization({...customization, weddingType: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer">
                <option value="">Select your ceremony style...</option>
                {weddingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Venue Selection */}
            {(() => {
              const pkgDest = destinations.find(d => d.id === selectedPkg.destination);
              if (!pkgDest || !pkgDest.subPlaces?.length) return null;
              return (
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">Choose Venue <span className="text-xs text-gray-400 font-normal">({pkgDest.subPlaces.length} available)</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pkgDest.subPlaces.map((venue, idx) => (
                      <div key={idx} onClick={() => setSelectedVenue(venue)} className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${selectedVenue?.name === venue.name ? 'border-gold bg-gold/5' : 'border-gray-100 hover:border-blush'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-dark">{venue.name}</span>
                          <div className="flex items-center gap-1">
                            {venue.reviews?.length > 0 && (
                              <button onClick={(e) => { e.stopPropagation(); setShowVenueReviews(venue); }} className="text-xs text-indigo-500 hover:text-indigo-700 underline">Reviews</button>
                            )}
                            {selectedVenue?.name === venue.name && <span className="text-gold text-xs">✓</span>}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{venue.type}{venue.capacity > 0 ? ` · Up to ${venue.capacity} guests` : ''}</p>
                      </div>
                    ))}
                  </div>

                  {/* Transportation Info */}
                  {selectedVenue && pkgDest.transportation && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <h5 className="text-sm font-semibold text-blue-800 mb-2">Getting There — Travel Details</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Nearest Airport</p>
                          <p className="text-blue-900">{pkgDest.transportation.nearestAirport}</p>
                          <p className="text-xs text-blue-700">Approx. {pkgDest.transportation.airportDistance} from venue</p>
                        </div>
                        {pkgDest.transportation.railwayStation !== 'N/A (No railway)' && pkgDest.transportation.railwayStation !== 'N/A' && (
                          <div>
                            <p className="text-xs text-blue-600 font-medium">Nearest Railway Station</p>
                            <p className="text-blue-900">{pkgDest.transportation.railwayStation}</p>
                            <p className="text-xs text-blue-700">Approx. {pkgDest.transportation.railwayDistance} from venue</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 font-medium">Transport Options</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pkgDest.transportation.transportModes?.map((m, i) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 font-medium">✓ Travel costs are included in your package price</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Wedding Date <span className="text-red-400">*</span> <span className="text-xs text-gray-400">(min. 15 days from today)</span></label>
                <input type="date" value={customization.weddingDate} min={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} onChange={(e) => setCustomization({...customization, weddingDate: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-2">Accommodation</label>
                <select value={customization.accommodation} onChange={(e) => setCustomization({...customization, accommodation: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer">
                  <option value="resort buyout">Resort Buyout</option>
                  <option value="hotel block">Hotel Block</option>
                  <option value="villa">Private Villa</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Est. Guest Count: <span className="text-gold font-bold text-lg">{customization.guestCount}</span></label>
              <input type="range" min="10" max="500" step="10" value={customization.guestCount} onChange={(e) => setCustomization({...customization, guestCount: Number(e.target.value)})} className="w-full accent-gold" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10 (Intimate)</span><span>500 (Grand)</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-2">Special Requests (optional)</label>
              <textarea value={customization.notes} onChange={(e) => setCustomization({...customization, notes: e.target.value})} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold resize-none" placeholder="Any special requirements, dietary needs, theme preferences..." />
            </div>
          </div>

          {/* Guest List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-24 space-y-4">
            <h4 className="font-serif font-semibold text-dark">Guest List <span className="text-xs text-gray-400 font-normal">(optional)</span></h4>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium">Guest list can be added later</p>
              <p className="text-xs text-blue-600 mt-1">After booking, you can manage your full guest list (names, phone numbers, emails) from the booking details page.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input placeholder="Name (optional)" value={newGuest.name} onChange={(e) => setNewGuest({...newGuest, name: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
              <input placeholder="Email (optional)" type="email" value={newGuest.email} onChange={(e) => setNewGuest({...newGuest, email: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
              <input placeholder="Phone (optional)" value={newGuest.phone} onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})} className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-gold focus:outline-none" />
            </div>
            <button onClick={handleAddGuest} disabled={!newGuest.name && !newGuest.email && !newGuest.phone} className="px-5 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium hover:bg-gold/20 transition-all disabled:opacity-40">
              + Add Guest
            </button>
            {guestList.length > 0 && (
              <div className="border-t pt-4">
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
          <NavButtons canNext={!!customization.weddingDate && !!customization.groomName && !!customization.brideName} nextLabel="View Timeline" />
        </div>
      )}

      {/* Step 2: Timeline (pre-generated from package) */}
      {currentStep === 2 && (
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Your wedding timeline</h2>
                <p className="text-gray-500">Pre-planned based on {selectedPkg?.name}. Edit event names, times, and venues.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSaveTemplate(true)} className="text-xs text-gold border border-gold/30 px-3 py-1.5 rounded-full hover:bg-gold/5 transition-all">Save as Template</button>
                {savedTemplates.length > 0 && (
                  <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all">My Templates</button>
                )}
              </div>
            </div>
          </div>

          {/* Save Template Modal */}
          {showSaveTemplate && (
            <div className="bg-white border border-gold/30 rounded-2xl p-5 mb-4 shadow-md">
              <h4 className="font-semibold text-dark text-sm mb-3">Save Current Timeline as Template</h4>
              <div className="flex gap-3">
                <input type="text" placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold" />
                <button onClick={() => templateName.trim() && saveTemplate(templateName.trim(), timeline)} disabled={!templateName.trim()} className="px-5 py-2.5 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 disabled:opacity-40">Save</button>
                <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Templates Panel */}
          {showTemplates && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
              <h4 className="font-semibold text-dark text-sm mb-3">My Saved Templates</h4>
              {savedTemplates.length === 0 ? (
                <p className="text-sm text-gray-400">No saved templates yet.</p>
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

          {/* AI Suggestion */}
          {aiTimelineLoading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <HiOutlineSparkles className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">AI is creating your timeline...</span>
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

          <div className="space-y-6 mb-24">
            {timeline.map((day, dayIdx) => (
              <div key={dayIdx} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-gold/10 to-blush/20 px-6 py-4 border-b flex justify-between items-center">
                  <h3 className="font-serif text-lg font-semibold text-dark">Day {day.day}</h3>
                  <span className="text-sm text-gray-500">{day.events.length} event{day.events.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-6 space-y-4">
                  {day.events.map((event, evIdx) => (
                    <div key={evIdx} className="border border-gray-100 rounded-xl p-4 hover:border-gold/30 transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={event.name} onChange={(e) => { const t = [...timeline]; t[dayIdx].events[evIdx].name = e.target.value; setTimeline(t); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" placeholder="Event" />
                        <input type="time" value={event.time} onChange={(e) => { const t = [...timeline]; t[dayIdx].events[evIdx].time = e.target.value; setTimeline(t); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" />
                        <input value={event.venue} onChange={(e) => { const t = [...timeline]; t[dayIdx].events[evIdx].venue = e.target.value; setTimeline(t); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none" placeholder="Venue" />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { const t = [...timeline]; t[dayIdx].events.push({ name: '', time: '', venue: '' }); setTimeline(t); }} className="text-gold text-sm font-medium hover:underline">+ Add Event</button>
                </div>
              </div>
            ))}
            {/* AI regenerate button */}
            <button onClick={() => generateAITimeline(timeline.length || 3)} disabled={aiTimelineLoading} className="w-full py-3 bg-gold text-white rounded-2xl text-sm font-medium hover:bg-gold/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
              <HiOutlineSparkles className="w-4 h-4" /> {aiTimelineLoading ? 'Generating...' : 'Regenerate Timeline with AI'}
            </button>
            <p className="text-xs text-gray-400 text-center italic">You can edit the timeline freely or use AI to regenerate it.</p>
          </div>
          <NavButtons nextLabel="Review Booking" />
        </div>
      )}

      {/* Step 3: Review */}
      {currentStep === 3 && selectedPkg && (
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-dark mb-2">Confirm your booking</h2>
            <p className="text-gray-500">Review everything before we lock it in</p>
          </div>
          <div className="space-y-6 mb-24">
            {/* Couple Names Header */}
            {(customization.groomName || customization.brideName) && (
              <div className="bg-gradient-to-r from-gold/10 to-blush/20 rounded-2xl p-6 text-center border border-gold/20">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Celebrating the union of</p>
                <h3 className="font-serif text-2xl font-bold text-dark">{customization.groomName} <span className="text-gold">&</span> {customization.brideName}</h3>
                {customization.weddingType && <p className="text-sm text-gray-500 mt-1">{customization.weddingType} Ceremony</p>}
              </div>
            )}

            {/* Package */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="flex">
                <img src={selectedPkg.imageUrl} alt="" className="w-32 h-auto object-cover hidden md:block" />
                <div className="p-6 flex-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedPkg.tier === 'luxury' ? 'bg-gold/20 text-gold' : 'bg-blue-100 text-blue-700'
                  }`}>{selectedPkg.tier}</span>
                  <h3 className="font-serif text-xl font-bold text-dark mt-2">{selectedPkg.name}</h3>
                  <p className="text-sm text-gray-500">{getDestName(selectedPkg.destination)} · {selectedPkg.duration}</p>
                  <p className="text-sm text-gray-500 mt-1">Date: {customization.weddingDate} · {customization.guestCount} guests</p>
                  {selectedVenue && <p className="text-sm text-gold mt-1">Venue: {selectedVenue.name}</p>}
                </div>
              </div>
            </div>

            {/* Included vendors */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h4 className="font-serif font-semibold text-dark mb-4">Package Vendors</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPkg.vendors?.map((vid, i) => {
                  const v = vendors.find(vn => vn.id === vid);
                  return v ? (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center text-gold text-xs font-bold">{v.category?.[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-dark">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.category}</p>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Timeline summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <h4 className="font-serif font-semibold text-dark mb-4">Timeline Summary</h4>
              {timeline.map((day, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-sm font-medium text-gold mb-1">Day {day.day}</p>
                  {day.events.map((ev, j) => (
                    <p key={j} className="text-sm text-gray-600 ml-4">• {ev.name || 'Event'} {ev.time && `at ${ev.time}`}</p>
                  ))}
                </div>
              ))}
            </div>

            {/* Cost */}
            <div className="bg-gradient-to-br from-dark to-gray-800 p-6 rounded-2xl text-white">
              <h4 className="font-serif font-semibold mb-4">Payment Summary</h4>
              <div className="space-y-2 text-sm">
                {selectedPkg.discount > 0 && selectedPkg.originalPrice && (
                  <div className="flex justify-between"><span className="text-gray-300">Original Price</span><span className="line-through text-gray-400">₹{formatPrice(selectedPkg.originalPrice)}</span></div>
                )}
                {selectedPkg.discount > 0 && (
                  <div className="flex justify-between"><span className="text-emerald-400">Discount ({selectedPkg.discount}%)</span><span className="text-emerald-400">-₹{formatPrice(selectedPkg.originalPrice - selectedPkg.price)}</span></div>
                )}
                {getDiscountReason(selectedPkg) && (
                  <div className="flex justify-between"><span className="text-emerald-300">Reason</span><span className="text-emerald-300">{getDiscountReason(selectedPkg)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-300">Package Price</span><span>₹{formatPrice(selectedPkg.price)}</span></div>
                <div className="flex justify-between"><span className="text-gray-300">GST (18%)</span><span>₹{formatPrice(Math.round(selectedPkg.price * 0.18))}</span></div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-600 pt-3 mt-3">
                  <span>Total</span>
                  <span className="text-gold">₹{formatPrice(selectedPkg.price + Math.round(selectedPkg.price * 0.18))}</span>
                </div>
              </div>
            </div>
          </div>
          <NavButtons nextLabel="Proceed to Payment" onNext={handleBooking} />
        </div>
      )}
    </div>
  );
}