import { Router } from 'express';
import { sendBookingConfirmation, sendGuestInvitation } from '../utils/mailer.js';

const router = Router();

router.post('/confirmation', async (req, res) => {
  try {
    const { to, bookingData } = req.body;
    const result = await sendBookingConfirmation(to, bookingData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email.', details: err.message });
  }
});

router.post('/invite', async (req, res) => {
  try {
    const { to, inviteData } = req.body;
    const result = await sendGuestInvitation(to, inviteData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invite.', details: err.message });
  }
});

export default router;
