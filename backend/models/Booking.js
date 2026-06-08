import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['package', 'custom'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  packageId: { type: String },
  destinationId: { type: String, required: true },
  dates: {
    wedding: { type: String },
    checkIn: { type: String },
    checkOut: { type: String }
  },
  guestCount: { type: Number },
  selectedVendors: [String],
  timeline: [{
    eventName: String,
    date: String,
    time: String,
    venue: String,
    notes: String
  }],
  guests: [{
    name: String,
    email: String,
    phone: String,
    rsvp: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    plusOne: { type: Boolean, default: false },
    dietaryPref: String,
    accommodation: String
  }],
  payment: {
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    transactionId: String,
    paidAt: Date,
    method: String,
    breakdown: mongoose.Schema.Types.Mixed
  },
  editableAfterBooking: { type: [String], default: ['guests', 'timeline', 'contactInfo'] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', bookingSchema);
