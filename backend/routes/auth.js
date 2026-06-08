import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createUser, findUserByEmail, findUserById, updateUser, findUserByPhone } from '../dal/users.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateOTP, storeOTP, verifyOTP, canResendOTP } from '../utils/otpStore.js';
import { sendSMS } from '../utils/smsService.js';
import { sendOTPEmail } from '../utils/mailer.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: !!user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    isAdmin: !!user.isAdmin,
    profilePicture: user.profilePicture || null
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    // Verify OTP
    if (!otp) {
      return res.status(400).json({ error: 'OTP verification is required.' });
    }
    const otpResult = verifyOTP(phone, otp);
    if (!otpResult.valid) {
      return res.status(400).json({ error: otpResult.error });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      id: uuidv4(),
      name,
      email,
      phone,
      passwordHash,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required.' });
    }

    // Check if input is a phone number or email
    const isPhone = /^\+?\d[\d\s\-]{8,}$/.test(email.trim());
    let user;
    if (isPhone) {
      user = await findUserByPhone(email.trim());
    } else {
      user = await findUserByEmail(email.trim());
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.', details: err.message });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    if (email) {
      const existing = await findUserByEmail(email);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Email already in use by another account.' });
      }
    }

    let updated = await updateUser(req.user.id, updates);
    if (!updated && req.user.email) {
      const byEmail = await findUserByEmail(req.user.email);
      if (byEmail) updated = await updateUser(byEmail.id, updates);
    }
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.', details: err.message });
  }
});

// Upload profile picture (base64)
router.put('/profile-picture', authMiddleware, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture) {
      return res.status(400).json({ error: 'No image data provided.' });
    }
    // Validate it's a data URL (base64 image)
    if (!profilePicture.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format.' });
    }
    // Limit size ~2MB in base64
    if (profilePicture.length > 2 * 1024 * 1024 * 1.37) {
      return res.status(400).json({ error: 'Image too large. Max 2MB.' });
    }

    let updated = await updateUser(req.user.id, { profilePicture });
    if (!updated && req.user.email) {
      const byEmail = await findUserByEmail(req.user.email);
      if (byEmail) updated = await updateUser(byEmail.id, { profilePicture });
    }
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload profile picture.', details: err.message });
  }
});

// Delete profile picture
router.delete('/profile-picture', authMiddleware, async (req, res) => {
  try {
    let updated = await updateUser(req.user.id, { profilePicture: null });
    if (!updated && req.user.email) {
      const byEmail = await findUserByEmail(req.user.email);
      if (byEmail) updated = await updateUser(byEmail.id, { profilePicture: null });
    }
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove profile picture.', details: err.message });
  }
});

// ─── OTP Endpoints ───────────────────────────────────────────

// Send OTP to phone (and email)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, email, name } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Check if email or phone already registered
    if (email) {
      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered. Please login instead.' });
      }
    }
    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered. Please login instead.' });
    }

    // Check cooldown
    const cooldown = canResendOTP(phone);
    if (!cooldown.canResend) {
      return res.status(429).json({ error: `Please wait ${cooldown.waitSeconds} seconds before requesting another OTP.`, waitSeconds: cooldown.waitSeconds });
    }

    const otp = generateOTP();
    storeOTP(phone, otp, email);

    // Send SMS
    const smsMessage = `Your Promise Paradise verification OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    const smsResult = await sendSMS(phone, smsMessage);

    // Also send to email if provided
    let emailSent = false;
    if (email) {
      const emailResult = await sendOTPEmail(email, otp, name || '');
      emailSent = emailResult.success;
    }

    res.json({
      success: true,
      message: 'OTP sent successfully.',
      smsSent: smsResult.success,
      emailSent,
      mock: smsResult.mock || false
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP.', details: err.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone, email, name } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const cooldown = canResendOTP(phone);
    if (!cooldown.canResend) {
      return res.status(429).json({ error: `Please wait ${cooldown.waitSeconds} seconds before requesting another OTP.`, waitSeconds: cooldown.waitSeconds });
    }

    const otp = generateOTP();
    storeOTP(phone, otp, email);

    const smsMessage = `Your Promise Paradise verification OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    const smsResult = await sendSMS(phone, smsMessage);

    let emailSent = false;
    if (email) {
      const emailResult = await sendOTPEmail(email, otp, name || '');
      emailSent = emailResult.success;
    }

    res.json({
      success: true,
      message: 'OTP resent successfully.',
      smsSent: smsResult.success,
      emailSent,
      mock: smsResult.mock || false
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP.', details: err.message });
  }
});

export default router;
