import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  destinationId: { type: String, required: true },
  imageUrl: { type: String },
  description: { type: String },
  durationDays: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  guestCapacity: { type: Number, required: true },
  editableFields: [String],
  includes: {
    venue: { type: Boolean, default: false },
    catering: { type: Boolean, default: false },
    decor: { type: Boolean, default: false },
    photography: { type: Boolean, default: false },
    accommodation: { type: Boolean, default: false },
    mehendi: { type: Boolean, default: false },
    haldi: { type: Boolean, default: false },
    sangeet: { type: Boolean, default: false },
    reception: { type: Boolean, default: false },
    honeymoonSuite: { type: Boolean, default: false }
  }
});

export default mongoose.model('Package', packageSchema);
