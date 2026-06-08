import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB, isUsingFallback } from './db/connect.js';

import authRoutes from './routes/auth.js';
import destinationRoutes from './routes/destinations.js';
import packageRoutes from './routes/packages.js';
import vendorRoutes from './routes/vendors.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payment.js';
import aiRoutes from './routes/ai.js';
import emailRoutes from './routes/email.js';
import adminRoutes from './routes/admin.js';
import { ensureAdminUser } from './utils/seedAdmin.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isUsingFallback() ? 'JSON Fallback' : 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

async function start() {
  await connectDB();
  await ensureAdminUser();

  if (isUsingFallback()) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📂  Running in JSON FALLBACK mode');
    console.log('   • No advanced aggregation queries');
    console.log('   • No transactions (sequential writes)');
    console.log('   • Data stored on local disk');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗄️   Running in MongoDB mode');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  app.listen(PORT, () => {
    console.log(`🚀  Promise Paradise backend running on http://localhost:${PORT}`);
  });
}

start();
