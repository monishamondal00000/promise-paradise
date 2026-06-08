import { isUsingFallback } from '../db/connect.js';
import { readJSON } from '../utils/jsonStore.js';
import Vendor from '../models/Vendor.js';

export async function getAllVendors(filters = {}) {
  if (isUsingFallback()) {
    let data = readJSON('vendors');
    if (filters.category) {
      data = data.filter(v => v.category === filters.category);
    }
    if (filters.destinationId) {
      data = data.filter(v => v.destinationIds.includes(filters.destinationId));
    }
    return data;
  }
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.destinationId) query.destinationIds = filters.destinationId;
  return Vendor.find(query);
}

export async function getVendorById(id) {
  if (isUsingFallback()) {
    const data = readJSON('vendors');
    return data.find(v => v.id === id) || null;
  }
  return Vendor.findOne({ id });
}
