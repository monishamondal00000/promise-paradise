import React from 'react';

export default function DestinationCard({ destination, onViewPackages }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN').format(price);
  };

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img
          src={destination.imageUrl}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {destination.isInternational && (
          <span className="absolute top-3 right-3 bg-gold text-white text-xs px-2 py-1 rounded-full">International</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-lg font-semibold text-dark">{destination.name}</h3>
        <p className="text-sm text-gray-500">{destination.country}</p>
        <p className="text-gold font-medium mt-2">From ₹{formatPrice(destination.pricePerDay)}/day</p>
        <button
          onClick={() => onViewPackages(destination.id)}
          className="mt-3 w-full py-2 text-sm border border-gold text-gold rounded-full hover:bg-gold hover:text-white transition-all"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
