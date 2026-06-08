import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getBookingById, updateBooking } from '../dal/bookings.js';
import { findUserById, findUserByEmail } from '../dal/users.js';
import { getDestinationById } from '../dal/destinations.js';
import { readJSON, writeJSON } from '../utils/jsonStore.js';
import { sendBookingConfirmation, sendGuestInvitation } from '../utils/mailer.js';

const router = Router();

async function resolveUser(req) {
  let user = await findUserById(req.user.id);
  if (!user && req.user.email) user = await findUserByEmail(req.user.email);
  if (!user && req.user.email) user = { id: req.user.id, name: req.user.email.split('@')[0], email: req.user.email };
  return user;
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bookingId, amount, method, paymentType } = req.body;
    console.log('\n💳 PAYMENT REQUEST  bookingId=', bookingId, 'amount=', amount, 'method=', method, 'type=', paymentType, 'userId=', req.user.id, 'email=', req.user.email);

    const booking = await getBookingById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    const totalAmount = Number(booking.totalAmount || booking.payment?.amount || 0);
    const alreadyPaid = Number(booking.payment?.paidAmount || 0);
    const remaining = Math.max(totalAmount - alreadyPaid, 0);

    let payNow;
    if (paymentType === 'remaining') payNow = remaining;
    else if (paymentType === 'partial') payNow = Number(amount) || Math.round(totalAmount * 0.3);
    else payNow = Number(amount) || remaining || totalAmount;
    if (remaining > 0) payNow = Math.min(payNow, remaining);

    const transactionId = 'PP' + Date.now();
    const paidAt = new Date().toISOString();
    const newPaidTotal = alreadyPaid + payNow;
    const isNowFullyPaid = newPaidTotal >= totalAmount;

    const historyEntry = { transactionId, amount: payNow, method: method || 'card', paymentType: paymentType || 'full', paidAt };

    const paymentUpdate = {
      payment: {
        ...booking.payment,
        amount: totalAmount,
        paidAmount: newPaidTotal,
        status: isNowFullyPaid ? 'paid' : 'partial',
        transactionId,
        paidAt,
        method: method || 'card',
        paymentType: paymentType || 'full',
        history: [...(booking.payment?.history || []), historyEntry]
      },
      status: isNowFullyPaid ? 'confirmed' : 'pending'
    };

    const updated = await updateBooking(bookingId, paymentUpdate);

    try {
      const payments = readJSON('payments');
      payments.push({ id: transactionId, bookingId, userId: req.user.id, amount: payNow, method: method || 'card', paymentType: paymentType || 'full', status: 'paid', paidAt });
      writeJSON('payments', payments);
    } catch (e) {
      console.error('   ⚠ payments.json:', e.message);
    }

    const user = await resolveUser(req);
    const destination = await getDestinationById(booking.destinationId).catch(() => null);
    console.log('   resolved user:', user?.email || 'NOT FOUND', '| destination:', destination?.name || booking.destinationId);

    const remainingAfter = Math.max(totalAmount - newPaidTotal, 0);

    // Send email in background (non-blocking)
    if (user && user.email) {
      (async () => {
        try {
          if (isNowFullyPaid) {
            // Send full confirmation email only when fully paid
            await sendBookingConfirmation(user.email, {
              name: user.name,
              bookingId: booking.id,
              destination: destination ? destination.name : 'Your destination',
              weddingDate: booking.dates?.wedding || 'TBD',
              totalPaid: newPaidTotal.toLocaleString('en-IN'),
              remainingBalance: 0,
              isFullPayment: true
            });
          } else {
            // Send partial payment acknowledgement (not full confirmation)
            await sendBookingConfirmation(user.email, {
              name: user.name,
              bookingId: booking.id,
              destination: destination ? destination.name : 'Your destination',
              weddingDate: booking.dates?.wedding || 'TBD',
              totalPaid: payNow.toLocaleString('en-IN'),
              remainingBalance: remainingAfter,
              isFullPayment: false
            });
          }
        } catch (emailErr) {
          console.error('   Email failed:', emailErr.message);
        }

        // Send guest invitation emails ONLY when booking is fully confirmed (full payment)
        if (isNowFullyPaid && booking.guests && booking.guests.length > 0) {
          const coupleName = `${booking.groomName || ''} & ${booking.brideName || ''}`.trim() || user.name;
          for (const guest of booking.guests) {
            const guestEmail = typeof guest === 'string' ? null : guest.email;
            if (guestEmail) {
              try {
                await sendGuestInvitation(guestEmail, {
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
                console.error(`   Guest invite failed for ${guestEmail}:`, inviteErr.message);
              }
            }
          }
        }
      })();
    } else {
      console.log('   No user email — skipping confirmation email');
    }

    res.json({ success: true, transactionId, booking: updated });
  } catch (err) {
    console.error('💥 Payment error:', err);
    res.status(500).json({ error: 'Payment failed.', details: err.message });
  }
});

router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await getBookingById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

    const totalAmount = Number(booking.totalAmount || booking.payment?.amount || 0);
    const alreadyPaid = Number(booking.payment?.paidAmount || 0);
    const remaining = Math.max(totalAmount - alreadyPaid, 0);

    res.json({ bookingId: booking.id, amount: totalAmount, paidAmount: alreadyPaid, remaining, breakdown: booking.breakdown || booking.payment?.breakdown || {}, status: 'ready' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate payment.', details: err.message });
  }
});

export default router;
