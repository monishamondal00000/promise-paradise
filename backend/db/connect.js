import mongoose from 'mongoose';

let usingFallback = false;

export async function connectDB() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI === 'YOUR_MONGO_URI_HERE') {
    console.warn('⚠️  No MONGODB_URI found — running in JSON fallback mode');
    usingFallback = true;
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅  MongoDB connected');
  } catch (err) {
    console.warn('⚠️  MongoDB failed — switching to JSON fallback mode:', err.message);
    usingFallback = true;
  }
}

export const isUsingFallback = () => usingFallback;
