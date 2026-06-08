import { isUsingFallback } from '../db/connect.js';
import { readJSON } from '../utils/jsonStore.js';
import Destination from '../models/Destination.js';

export async function getAllDestinations(filters = {}) {
  if (isUsingFallback()) {
    let data = readJSON('destinations');
    if (filters.isInternational !== undefined) {
      data = data.filter(d => d.isInternational === (filters.isInternational === 'true' || filters.isInternational === true));
    }
    if (filters.maxPrice) {
      data = data.filter(d => d.pricePerDay <= Number(filters.maxPrice));
    }
    if (filters.season) {
      data = data.filter(d => d.bestSeason.toLowerCase().includes(filters.season.toLowerCase()));
    }
    return data;
  }
  const query = {};
  if (filters.isInternational !== undefined) query.isInternational = filters.isInternational === 'true' || filters.isInternational === true;
  if (filters.maxPrice) query.pricePerDay = { $lte: Number(filters.maxPrice) };
  if (filters.season) query.bestSeason = { $regex: filters.season, $options: 'i' };
  return Destination.find(query);
}

export async function getDestinationById(id) {
  if (isUsingFallback()) {
    const data = readJSON('destinations');
    return data.find(d => d.id === id) || null;
  }
  return Destination.findOne({ id });
}
