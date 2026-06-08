import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  imageUrl: { type: String },
  description: { type: String },
  climate: { type: String },
  bestSeason: { type: String },
  pricePerDay: { type: Number, required: true },
  isInternational: { type: Boolean, default: false },
  highlights: [String],
  subPlaces: [{
    name: { type: String, required: true },
    type: { type: String }, // e.g. "Palace", "Beach", "Garden", "Resort"
    capacity: { type: Number },
    description: { type: String }
  }]
});

export default mongoose.model('Destination', destinationSchema);
