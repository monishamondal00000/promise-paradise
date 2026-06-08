import { isUsingFallback } from '../db/connect.js';
import { readJSON } from '../utils/jsonStore.js';
import Package from '../models/Package.js';

export async function getAllPackages(filters = {}) {
  if (isUsingFallback()) {
    let data = readJSON('packages');
    if (filters.destinationId) {
      data = data.filter(p => (p.destinationId || p.destination) === filters.destinationId);
    }
    if (filters.maxPrice) {
      data = data.filter(p => (p.basePrice || p.price) <= Number(filters.maxPrice));
    }
    if (filters.minGuests) {
      const getGuests = (p) => parseInt(String(p.guestCapacity || p.guestCount || '0').replace(/[^0-9]/g, ''));
      data = data.filter(p => getGuests(p) >= Number(filters.minGuests));
    }
    return data;
  }
  const query = {};
  if (filters.destinationId) query.destinationId = filters.destinationId;
  if (filters.maxPrice) query.basePrice = { $lte: Number(filters.maxPrice) };
  if (filters.minGuests) query.guestCapacity = { $gte: Number(filters.minGuests) };
  return Package.find(query);
}

export async function getPackageById(id) {
  if (isUsingFallback()) {
    const data = readJSON('packages');
    return data.find(p => p.id === id) || null;
  }
  return Package.findOne({ id });
}
