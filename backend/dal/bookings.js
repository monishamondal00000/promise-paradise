import { isUsingFallback } from '../db/connect.js';
import { readJSON, writeJSON } from '../utils/jsonStore.js';
import Booking from '../models/Booking.js';

export async function createBooking(bookingData) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    bookings.push(bookingData);
    writeJSON('bookings', bookings);
    return bookingData;
  }
  const booking = new Booking(bookingData);
  return booking.save();
}

export async function getBookingsByUser(userId) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    return bookings.filter(b => b.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return Booking.find({ userId }).sort({ createdAt: -1 });
}

export async function getBookingById(id) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    return bookings.find(b => b.id === id) || null;
  }
  return Booking.findOne({ id });
}

export async function updateBooking(id, updates) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    bookings[index] = { ...bookings[index], ...updates };
    writeJSON('bookings', bookings);
    return bookings[index];
  }
  return Booking.findOneAndUpdate({ id }, updates, { new: true });
}

export async function deleteBooking(id) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    const deleted = bookings.splice(index, 1)[0];
    writeJSON('bookings', bookings);
    return deleted;
  }
  return Booking.findOneAndDelete({ id });
}
