import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { readJSON, writeJSON } from '../utils/jsonStore.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// Generic CRUD factory for JSON-backed collections
function makeCrud(name, prefix) {
  router.get(`/${name}`, (req, res) => {
    res.json(readJSON(name));
  });

  router.post(`/${name}`, (req, res) => {
    const items = readJSON(name);
    const item = { ...req.body };
    if (!item.id) item.id = `${prefix}-${uuidv4().slice(0, 8)}`;
    items.push(item);
    writeJSON(name, items);
    res.status(201).json(item);
  });

  router.put(`/${name}/:id`, (req, res) => {
    const items = readJSON(name);
    const idx = items.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: `${name} not found.` });
    items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
    writeJSON(name, items);
    res.json(items[idx]);
  });

  router.delete(`/${name}/:id`, (req, res) => {
    const items = readJSON(name);
    const idx = items.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: `${name} not found.` });
    const removed = items.splice(idx, 1)[0];
    writeJSON(name, items);
    res.json({ message: 'Deleted', item: removed });
  });
}

makeCrud('destinations', 'dest');
makeCrud('packages', 'pkg');
makeCrud('vendors', 'v');

// Bookings: read + delete only (no create/edit for admin)
router.get('/bookings', (req, res) => {
  const bookings = readJSON('bookings');
  const users = readJSON('users');
  const destinations = readJSON('destinations');
  // Enrich bookings with user name and destination name
  const enriched = bookings.map(b => {
    const user = users.find(u => u.id === b.userId);
    const dest = destinations.find(d => d.id === b.destinationId);
    return {
      ...b,
      userName: user ? user.name : (b.userId || 'Unknown'),
      userEmail: user ? user.email : '',
      destinationName: dest ? dest.name : (b.destinationId || 'Unknown')
    };
  });
  res.json(enriched);
});

router.delete('/bookings/:id', (req, res) => {
  const items = readJSON('bookings');
  const idx = items.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found.' });
  const removed = items.splice(idx, 1)[0];
  writeJSON('bookings', items);
  res.json({ message: 'Deleted', item: removed });
});

// Users: safe view (no passwordHash) + booking counts
router.get('/users', (req, res) => {
  const users = readJSON('users');
  const bookings = readJSON('bookings');
  const summary = users.map(u => {
    const userBookings = bookings.filter(b => b.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      isAdmin: !!u.isAdmin,
      bookingCount: userBookings.length,
      confirmedBookings: userBookings.filter(b => b.status === 'confirmed').length,
      pendingBookings: userBookings.filter(b => b.status === 'pending').length,
      cancelledBookings: userBookings.filter(b => b.status === 'cancelled').length
    };
  });
  res.json(summary);
});

router.delete('/users/:id', (req, res) => {
  const users = readJSON('users');
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  if (users[idx].isAdmin || users[idx].email === 'adminpp@gmail.com') {
    return res.status(400).json({ error: 'Cannot delete admin user.' });
  }
  const removed = users.splice(idx, 1)[0];
  writeJSON('users', users);

  // Also delete all bookings belonging to this user
  const bookings = readJSON('bookings');
  const filtered = bookings.filter(b => b.userId !== removed.id);
  if (filtered.length !== bookings.length) {
    writeJSON('bookings', filtered);
  }

  res.json({ message: 'User removed', user: { id: removed.id, email: removed.email }, bookingsDeleted: bookings.length - filtered.length });
});

// Stats endpoint
router.get('/stats', (req, res) => {
  const users = readJSON('users');
  const bookings = readJSON('bookings');
  const destinations = readJSON('destinations');
  const packages = readJSON('packages');
  const vendors = readJSON('vendors');
  const revenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.payment?.paidAmount || 0), 0);
  res.json({
    users: users.length,
    bookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    destinations: destinations.length,
    packages: packages.length,
    vendors: vendors.length,
    revenue
  });
});

export default router;
