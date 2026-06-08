import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createBooking, getBookingsByUser, getBookingById, updateBooking, deleteBooking } from '../dal/bookings.js';
import { findUserById } from '../dal/users.js';
import { getDestinationById } from '../dal/destinations.js';
import { sendCancellationEmail, sendGuestInvitation } from '../utils/mailer.js';

const router = Router();

function generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'PP';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const totalAmount = Number(req.body.totalAmount) || 0;
    const bookingData = {
      id: generateBookingId(),
      userId: req.user.id,
      type: req.body.type || 'package',
      status: 'pending',
      packageId: req.body.packageId || null,
      destinationId: req.body.destinationId,
      subPlace: req.body.subPlace || null,
      venue: req.body.venue || null,
      dates: req.body.dates || {},
      guestCount: req.body.guestCount || 0,
      accommodation: req.body.accommodation || null,
      style: req.body.style || null,
      groomName: req.body.groomName || '',
      brideName: req.body.brideName || '',
      weddingType: req.body.weddingType || '',
      transportRequired: req.body.transportRequired || false,
      personalVendors: req.body.personalVendors || [],
      notes: req.body.notes || '',
      selectedVendors: req.body.selectedVendors || [],
      timeline: req.body.timeline || [],
      guests: req.body.guests || [],
      totalAmount,
      breakdown: req.body.breakdown || {},
      payment: {
        amount: totalAmount,
        paidAmount: 0,
        status: 'pending',
        transactionId: null,
        paidAt: null,
        method: null,
        paymentType: null,
        breakdown: req.body.breakdown || {},
        history: []
      },
      editableAfterBooking: ['guests', 'timeline', 'contactInfo'],
      createdAt: new Date().toISOString()
    };

    const booking = await createBooking(bookingData);
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking.', details: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const bookings = await getBookingsByUser(req.user.id);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings.', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking.', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    const allowedFields = booking.editableAfterBooking || ['guests', 'timeline', 'contactInfo'];
    const updates = {};

    if (req.body.guests && allowedFields.includes('guests')) updates.guests = req.body.guests;
    if (req.body.timeline && allowedFields.includes('timeline')) updates.timeline = req.body.timeline;
    if (req.body.phone && allowedFields.includes('contactInfo')) updates.phone = req.body.phone;

    if (booking.status === 'pending') {
      if (req.body.dates) updates.dates = req.body.dates;
      if (req.body.guestCount) updates.guestCount = req.body.guestCount;
      if (req.body.selectedVendors) updates.selectedVendors = req.body.selectedVendors;
    }

    const updated = await updateBooking(req.params.id, updates);

    // Send invitation emails to newly added guests (if booking is confirmed)
    if (req.body.guests && booking.status === 'confirmed') {
      const oldEmails = new Set((booking.guests || []).map(g => typeof g === 'string' ? null : g.email).filter(Boolean));
      const newGuests = req.body.guests.filter(g => g.email && !oldEmails.has(g.email));

      if (newGuests.length > 0) {
        (async () => {
          try {
            const destination = await getDestinationById(booking.destinationId);
            const coupleName = `${booking.groomName || ''} & ${booking.brideName || ''}`.trim() || 'The couple';
            for (const guest of newGuests) {
              try {
                await sendGuestInvitation(guest.email, {
                  coupleName,
                  groomName: booking.groomName || '',
                  brideName: booking.brideName || '',
                  destination: destination ? destination.name : 'Your destination',
                  venue: booking.venue || (destination ? destination.name : ''),
                  weddingDate: booking.dates?.wedding || 'TBD',
                  weddingType: booking.weddingType || '',
                  transportRequired: booking.transportRequired || false,
                  transportInfo: destination?.transportation || null
                });
              } catch (inviteErr) {
                console.error(`   Guest invite failed for ${guest.email}:`, inviteErr.message);
              }
            }
          } catch (err) {
            console.error('Guest invitation batch failed:', err.message);
          }
        })();
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking.', details: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    const updates = {};
    if (req.body.status) updates.status = req.body.status;

    const updated = await updateBooking(req.params.id, updates);

    // Send cancellation email in background (non-blocking)
    if (req.body.status === 'cancelled') {
      (async () => {
        try {
          const user = await findUserById(req.user.id);
          const destination = await getDestinationById(booking.destinationId);
          if (user && user.email) {
            await sendCancellationEmail(user.email, {
              name: user.name,
              bookingId: booking.id,
              destination: destination ? destination.name : 'Your destination'
            });
          }

          // Send cancellation notification to guests who were invited
          if (booking.guests && booking.guests.length > 0 && booking.status === 'confirmed') {
            const coupleName = `${booking.groomName || ''} & ${booking.brideName || ''}`.trim() || (user ? user.name : 'The couple');
            for (const guest of booking.guests) {
              const guestEmail = typeof guest === 'string' ? null : guest.email;
              if (guestEmail) {
                try {
                  await sendCancellationEmail(guestEmail, {
                    name: guest.name || 'Guest',
                    bookingId: booking.id,
                    destination: destination ? destination.name : 'The venue',
                    isGuestNotification: true,
                    coupleName
                  });
                } catch (guestEmailErr) {
                  console.error(`   Guest cancellation email failed for ${guestEmail}:`, guestEmailErr.message);
                }
              }
            }
          }
        } catch (emailErr) {
          console.error('Failed to send cancellation email:', emailErr.message);
        }
      })();
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking.', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    await deleteBooking(req.params.id);
    res.json({ message: 'Booking deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking.', details: err.message });
  }
});

export default router;
