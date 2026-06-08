import dotenv from 'dotenv';
dotenv.config();

/**
 * Send SMS using Fast2SMS free tier API (India)
 * Set FAST2SMS_API_KEY in .env to enable real SMS delivery.
 * Falls back to console logging when no API key is configured.
 */
export async function sendSMS(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  
  // Normalize phone - remove +91, spaces, dashes
  const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
  
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
    console.log(`[SMS] No API key configured. OTP for ${cleanPhone}: ${message.match(/\d{6}/)?.[0] || message}`);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone
      })
    });

    const data = await response.json();
    if (data.return === true) {
      console.log(`[SMS] Sent to ${cleanPhone}`);
      return { success: true };
    } else {
      console.log(`[SMS] Service unavailable, OTP sent via email only. (${data.message})`);
      return { success: false, mock: true };
    }
  } catch (err) {
    console.log(`[SMS] Service unavailable, OTP sent via email only.`);
    return { success: false, mock: true };
  }
}
