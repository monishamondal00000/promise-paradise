import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ['photographer', 'caterer', 'decorator', 'mehendi', 'band', 'pandit', 'florist', 'videographer'],
    required: true
  },
  name: { type: String, required: true },
  priceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  rating: { type: Number, min: 1, max: 5 },
  portfolio: [String],
  destinationIds: [String]
});

export default mongoose.model('Vendor', vendorSchema);
