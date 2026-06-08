import React from 'react';

export default function PackageCard({ pkg, onSelect }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN').format(price);
  };

  const includedItems = Array.isArray(pkg.includes) ? pkg.includes : [];
  const price = pkg.basePrice || pkg.price;
  const duration = pkg.durationDays || pkg.duration;
  const guests = pkg.guestCapacity || pkg.guestCount;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img
          src={pkg.imageUrl}
          alt={pkg.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        {pkg.tier && (
          <span className="absolute top-3 right-3 bg-gold text-white text-xs px-2 py-1 rounded-full capitalize">{pkg.tier}</span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-dark">{pkg.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-gold font-bold text-lg">₹{formatPrice(price)}</span>
          <span className="text-xs text-gray-400">{duration} · {guests} guests</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {includedItems.slice(0, 4).map(item => (
            <span key={item} className="text-xs bg-blush/50 text-dark px-2 py-0.5 rounded-full capitalize">{item}</span>
          ))}
          {includedItems.length > 4 && (
            <span className="text-xs text-gray-400">+{includedItems.length - 4} more</span>
          )}
        </div>
        <button
          onClick={() => onSelect(pkg.id)}
          className="mt-4 w-full py-2.5 bg-gold text-white rounded-full hover:bg-gold/90 transition-all text-sm font-medium"
        >
          Select Package
        </button>
      </div>
    </div>
  );
}
