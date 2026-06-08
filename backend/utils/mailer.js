import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

// Verify transporter on startup
transporter.verify().then(() => {
  console.log(' Email transporter verified — ready to send emails');
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER}`);
}).catch(err => {
  console.error(' Email transporter verification FAILED:', err.message);
  console.error('   Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
});

// Shared beige email wrapper
function emailWrapper(content) {
  return `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8D5C4; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #C9A96E, #E8D5C4); padding: 30px; text-align: center;">
        <h1 style="color: #2C2C2C; font-size: 28px; margin: 0;">Promise Paradise</h1>
        <p style="color: #2C2C2C; margin: 5px 0 0; font-size: 14px;">Where Forever Begins</p>
      </div>
      <div style="padding: 30px; background: #FAF7F2;">
        ${content}
      </div>
      <div style="background: #2C2C2C; padding: 20px; text-align: center;">
        <p style="color: #C9A96E; margin: 0; font-size: 13px;">promiseparadisesupport@gmail.com</p>
        <p style="color: #888; font-size: 11px; margin: 5px 0 0;">2026 Promise Paradise. All rights reserved.</p>
      </div>
    </div>
  `;
}

export async function sendOTPEmail(to, otp, name) {
  const content = `
    <h2 style="color: #2C2C2C; margin-top: 0;">Verify Your Account</h2>
    <p style="color: #555; line-height: 1.6;">Hi ${name || 'there'},</p>
    <p style="color: #555; line-height: 1.6;">Your OTP for Promise Paradise registration is:</p>
    <div style="text-align: center; margin: 25px 0;">
      <span style="font-size: 36px; font-weight: bold; color: #C9A96E; letter-spacing: 8px; background: #FFF8F0; padding: 15px 30px; border-radius: 12px; border: 2px solid #E8D5C4;">${otp}</span>
    </div>
    <p style="color: #555; line-height: 1.6;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
    <p style="color: #888; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Promise Paradise" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your OTP: ${otp} — Promise Paradise Verification`,
      html: emailWrapper(content)
    });
    console.log(`[Email] OTP sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('[Email] OTP send failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendBookingConfirmation(to, bookingData) {
  const { name, bookingId, destination, weddingDate, totalPaid, remainingBalance, isFullPayment } = bookingData;

  const remaining = Number(remainingBalance || 0);
  const showRemaining = remaining > 0;

  const subject = isFullPayment
    ? `Booking Confirmed - #${bookingId}`
    : `Payment Received (Booking Pending) - #${bookingId}`;

  const content = `
    <h2 style="color: #2C2C2C; margin-top: 0;">${isFullPayment ? `Congratulations, ${name}!` : `Payment Received, ${name}`}</h2>
    <p style="color: #555; line-height: 1.6;">${isFullPayment ? 'Your wedding booking is fully confirmed! All guests will be notified.' : 'We have received your partial payment. Your booking will be confirmed once the full amount is paid.'} Here are the details:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Booking ID</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${bookingId}</td></tr>
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Destination</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${destination}</td></tr>
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Wedding Date</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${weddingDate}</td></tr>
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Amount Paid</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${totalPaid}</td></tr>
      ${showRemaining ? `<tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #b45309;">Remaining Balance</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #b45309;">${Number(remaining).toLocaleString('en-IN')}</td></tr>` : ''}
    </table>
    ${showRemaining ? `<div style="background: #FEF3C7; padding: 14px; border-radius: 8px; margin: 14px 0; border-left: 4px solid #C9A96E;"><p style="margin: 0; color: #92400E; font-size: 14px;"><strong>Remaining balance of ${Number(remaining).toLocaleString('en-IN')}</strong> is due before your event date. You can pay anytime from your booking page.</p></div>` : ''}
    <h3 style="color: #C9A96E; margin-top: 24px;">Next Steps</h3>
    <ul style="color: #555; line-height: 2; padding-left: 20px;">
      <li>Our team will contact you within 24 hours</li>
      <li>Start adding your guests from the dashboard</li>
      <li>Use our AI assistant for timeline planning</li>
      ${showRemaining ? '<li>Pay remaining balance from your booking detail page</li>' : ''}
    </ul>
    <p style="color: #888; font-size: 13px; margin-top: 24px;">Thank you for choosing Promise Paradise. We are honoured to be part of your special day.</p>
  `;

  const html = emailWrapper(content);

  try {
    console.log(`\n   BOOKING CONFIRMATION EMAIL`);
    console.log(`   To: ${to} | Booking: ${bookingId} | Paid: ${totalPaid} | Remaining: ${remaining}`);
    const info = await transporter.sendMail({
      from: `"Promise Paradise" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`   Sent OK — ${info.messageId}\n`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`   FAILED — ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

export async function sendCancellationEmail(to, bookingData) {
  const { name, bookingId, destination, isGuestNotification, coupleName } = bookingData;

  const content = isGuestNotification ? `
    <h2 style="color: #2C2C2C; margin-top: 0;">Wedding Event Update</h2>
    <p style="color: #555; line-height: 1.6;">Dear ${name},</p>
    <p style="color: #555; line-height: 1.6;">We regret to inform you that the wedding celebration of <strong>${coupleName}</strong> at <strong>${destination}</strong> has been cancelled.</p>
    <p style="color: #555; line-height: 1.6;">We apologize for any inconvenience. If you have any questions, please reach out to the couple directly.</p>
    <p style="color: #888; font-size: 13px; margin-top: 24px;">Thank you for your understanding.</p>
  ` : `
    <h2 style="color: #2C2C2C; margin-top: 0;">Booking Cancelled</h2>
    <p style="color: #555; line-height: 1.6;">Hi ${name}, your booking <strong>#${bookingId}</strong> for <strong>${destination}</strong> has been cancelled.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Booking ID</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${bookingId}</td></tr>
      <tr><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; font-weight: bold; color: #2C2C2C;">Destination</td><td style="padding: 10px 8px; border-bottom: 1px solid #E8D5C4; color: #555;">${destination}</td></tr>
    </table>
    <p style="color: #555; line-height: 1.6;">If this was a mistake, please contact our support team or create a new booking through our platform.</p>
    <p style="color: #555; line-height: 1.6;">Any paid amount will be refunded to your original payment method within 5-7 business days.</p>
    <p style="color: #888; font-size: 13px; margin-top: 24px;">We hope to help you plan your dream wedding in the future.</p>
  `;

  const html = emailWrapper(content);

  try {
    console.log(`\n   CANCELLATION EMAIL`);
    console.log(`   To: ${to} | Booking: ${bookingId}`);
    const info = await transporter.sendMail({
      from: `"Promise Paradise" <${process.env.GMAIL_USER}>`,
      to,
      subject: isGuestNotification
        ? `Wedding Event Cancelled - ${coupleName}'s Celebration`
        : `Booking Cancelled - #${bookingId}`,
      html
    });
    console.log(`   Sent OK — ${info.messageId}\n`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`   FAILED — ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

export async function sendGuestInvitation(to, inviteData) {
  const { coupleName, destination, weddingDate, venue, groomName, brideName, weddingType, transportInfo, transportRequired } = inviteData;

  const transportSection = transportInfo ? `
    <div style="margin-top: 20px; padding: 16px; background: #EFF6FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
      <h3 style="color: #1E40AF; margin: 0 0 10px 0; font-size: 15px;">🚗 How to Reach</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #1E40AF; font-weight: bold; font-size: 13px;">Nearest Airport:</td><td style="padding: 4px 0; color: #374151; font-size: 13px;">${transportInfo.nearestAirport} (${transportInfo.airportDistance})</td></tr>
        ${transportInfo.railwayStation && transportInfo.railwayStation !== 'N/A (No railway)' && transportInfo.railwayStation !== 'N/A' ? `<tr><td style="padding: 4px 0; color: #1E40AF; font-weight: bold; font-size: 13px;">Nearest Railway Station:</td><td style="padding: 4px 0; color: #374151; font-size: 13px;">${transportInfo.railwayStation} (${transportInfo.railwayDistance})</td></tr>` : ''}
      </table>
      ${transportRequired ? '<p style="color: #059669; font-size: 13px; margin: 10px 0 0 0; font-weight: bold;">✓ Transportation from airport/station to venue will be arranged for you.</p>' : '<p style="color: #6B7280; font-size: 12px; margin: 10px 0 0 0;">Please arrange your own transportation from the airport/station to the venue.</p>'}
    </div>
  ` : '';

  const content = `
    <div style="text-align: center;">
      <div style="margin-bottom: 20px;">
        <p style="color: #C9A96E; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Together with their families</p>
      </div>
      <h2 style="color: #C9A96E; margin: 10px 0 5px 0; font-size: 16px;">You are cordially invited to the wedding of</h2>
      <h1 style="color: #2C2C2C; font-size: 28px; margin: 10px 0; font-family: Georgia, serif;">${groomName || coupleName?.split('&')[0]?.trim() || 'Groom'} <span style="color: #C9A96E;">&</span> ${brideName || coupleName?.split('&')[1]?.trim() || 'Bride'}</h1>
      ${weddingType ? `<p style="color: #6B7280; font-size: 14px; margin: 5px 0;">${weddingType} Ceremony</p>` : ''}
      <div style="margin: 25px 0; padding: 20px; background: #FAF7F2; border-radius: 12px; border: 1px solid #E8D5C4;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <tr><td style="padding: 8px; font-weight: bold; color: #2C2C2C;">📅 Date</td><td style="padding: 8px; color: #555;">${weddingDate || 'To be announced'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #2C2C2C;">📍 Venue</td><td style="padding: 8px; color: #555;">${venue || destination}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #2C2C2C;">🌍 Destination</td><td style="padding: 8px; color: #555;">${destination}</td></tr>
        </table>
      </div>
      ${transportSection}
      <div style="margin-top: 20px; padding: 14px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; color: #92400E; font-size: 13px;"><strong>📌 Please plan to arrive a day before the ceremony</strong> to settle in and join the pre-wedding festivities.</p>
      </div>
      <p style="color: #888; margin-top: 30px; font-size: 13px;">We look forward to celebrating this special moment with you!</p>
      <p style="color: #C9A96E; font-size: 12px; margin-top: 10px;">With love & blessings</p>
    </div>
  `;

  const html = emailWrapper(content);

  try {
    console.log(`\n   GUEST INVITATION EMAIL`);
    console.log(`   To: ${to} | Couple: ${coupleName}`);
    const info = await transporter.sendMail({
      from: `"Promise Paradise" <${process.env.GMAIL_USER}>`,
      to,
      subject: `You're Invited! ${groomName || ''} & ${brideName || ''}'s Wedding Celebration`,
      html
    });
    console.log(`   Sent OK — ${info.messageId}\n`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`   FAILED — ${error.message}\n`);
    return { success: false, error: error.message };
  }
}
