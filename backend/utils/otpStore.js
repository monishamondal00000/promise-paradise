// In-memory OTP store with expiry
// Structure: { phone: { otp, expiresAt, email } }
const store = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_COOLDOWN_MS = 30 * 1000; // 30 seconds between resends

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(phone, otp, email) {
  store.set(phone, {
    otp,
    email,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    sentAt: Date.now()
  });
}

export function verifyOTP(phone, otp) {
  const entry = store.get(phone);
  if (!entry) return { valid: false, error: 'No OTP found. Please request a new one.' };
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return { valid: false, error: 'OTP expired. Please request a new one.' };
  }
  if (entry.otp !== otp) {
    return { valid: false, error: 'Invalid OTP. Please try again.' };
  }
  store.delete(phone);
  return { valid: true };
}

export function canResendOTP(phone) {
  const entry = store.get(phone);
  if (!entry) return { canResend: true };
  const elapsed = Date.now() - entry.sentAt;
  if (elapsed < OTP_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
    return { canResend: false, waitSeconds };
  }
  return { canResend: true };
}

export function getStoredEntry(phone) {
  return store.get(phone) || null;
}
