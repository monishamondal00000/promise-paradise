import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PackageCard from '../components/PackageCard';

export default function Packages() {
  const { API, user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [filters, setFilters] = useState({ destinationId: '', maxPrice: '' });

  useEffect(() => {
    API.get('/packages').then(res => setPackages(res.data)).catch(() => {});
    API.get('/destinations').then(res => setDestinations(res.data)).catch(() => {});
  }, [API]);

  const filteredPackages = packages.filter(p => {
    const destId = p.destinationId || p.destination;
    const price = p.basePrice || p.price;
    if (filters.destinationId && destId !== filters.destinationId) return false;
    if (filters.maxPrice && price > Number(filters.maxPrice)) return false;
    return true;
  });

  const handleSelect = (pkgId) => {
    if (!user) { navigate('/login?returnUrl=/book-package/' + pkgId); return; }
    navigate('/book-package/' + pkgId);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold text-dark tracking-tight mb-6">Wedding Packages</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <select value={filters.destinationId} onChange={(e) => setFilters({...filters, destinationId: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer shadow-sm">
          <option value="">All Destinations</option>
          {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold bg-white appearance-none cursor-pointer shadow-sm">
          <option value="">Any Budget</option>
          <option value="2000000">Under ₹20L</option>
          <option value="3500000">Under ₹35L</option>
          <option value="5000000">Under ₹50L</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map(pkg => (
          <PackageCard key={pkg.id} pkg={pkg} onSelect={handleSelect} />
        ))}
      </div>
      {filteredPackages.length === 0 && <p className="text-center text-gray-400 mt-12">No packages match your filters</p>}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-gray-100 text-center">
        <p className="font-serif text-gold text-lg">Promise Paradise</p>
        <p className="text-gray-400 text-xs mt-1">promiseparadisesupport@gmail.com · Kolkata, India</p>
        <p className="text-gray-500 text-xs mt-1">© 2026 Promise Paradise. All rights reserved.</p>
      </footer>
    </div>
  );
}
