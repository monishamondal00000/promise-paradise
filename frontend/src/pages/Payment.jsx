import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { HiOutlineCreditCard, HiOutlineDeviceMobile, HiOutlineLibrary, HiOutlineLockClosed, HiOutlineDocumentText, HiOutlineX, HiOutlineShieldCheck } from 'react-icons/hi';

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // 'remaining' | null
  const isRemainingMode = mode === 'remaining';

  const [booking, setBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [payFull, setPayFull] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [hasSeenRefundPolicy, setHasSeenRefundPolicy] = useState(false);

  useEffect(() => {
    API.get(`/bookings/${bookingId}`).then(res => {
      setBooking(res.data);
      // Show refund policy popup on first visit
      if (!hasSeenRefundPolicy && !isRemainingMode) {
        setShowRefundPolicy(true);
        setHasSeenRefundPolicy(true);
      }
    }).catch(() => navigate('/my-weddings'));
  }, [bookingId, navigate]);

  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price || 0);
  const totalAmount = booking?.totalAmount || booking?.payment?.amount || 0;
  const paidSoFar = booking?.payment?.paidAmount || 0;
  const remainingDue = Math.max(totalAmount - paidSoFar, 0);

  // payableAmount: if remaining mode → remaining; else if pay-full → total; else 30%
  const payableAmount = isRemainingMode
    ? remainingDue
    : (payFull ? totalAmount : Math.round(totalAmount * 0.3));

  // Validation
  const isFormValid = () => {
    if (paymentMethod === 'card') {
      return cardDetails.number.replace(/\s/g, '').length >= 16 && cardDetails.name.trim().length > 2 && cardDetails.expiry.length === 5 && cardDetails.cvv.length >= 3;
    }
    if (paymentMethod === 'upi') {
      return upiId.includes('@') && upiId.length > 5;
    }
    if (paymentMethod === 'netbanking') {
      return bank.length > 0 && bankAccount.length >= 8 && bankIfsc.length >= 6;
    }
    return false;
  };

  const handlePayment = async () => {
    if (!isFormValid()) {
      showToast('Please fill all payment details correctly', 'error');
      return;
    }
    setProcessing(true);
    try {
      // Random processing delay 1-4 seconds to simulate real payment
      const delay = 1000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await API.post('/payment', {
        bookingId,
        amount: payableAmount,
        method: paymentMethod,
        paymentType: isRemainingMode ? 'remaining' : (payFull ? 'full' : 'partial')
      });
      // Show success animation
      setPaymentSuccess(true);
    } catch (err) {
      showToast('Payment failed. Please try again.', 'error');
      setProcessing(false);
    }
  };

  // Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
        <div className="text-center max-w-md w-full">
          {/* Animated checkmark */}
          <div className="relative mx-auto w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-[bounceIn_0.6s_ease-out]">
              <svg className="w-14 h-14 text-white animate-[drawCheck_0.4s_ease-out_0.3s_both]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-white font-bold mb-3 animate-[fadeInUp_0.5s_ease-out_0.4s_both]">
            Payment Successful!
          </h1>
          <p className="text-indigo-200 text-lg mb-2 animate-[fadeInUp_0.5s_ease-out_0.5s_both]">
            {(payFull || isRemainingMode) ? 'Your wedding booking is confirmed' : 'Partial payment received — booking pending'}
          </p>
          <p className="text-gray-400 text-sm mb-8 animate-[fadeInUp_0.5s_ease-out_0.6s_both]">
            Amount paid: <span className="text-emerald-300 font-bold">₹{formatPrice(payableAmount)}</span>
          </p>

          {/* Booking summary card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8 animate-[fadeInUp_0.5s_ease-out_0.7s_both]">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-400">Booking ID</span>
              <span className="text-white font-mono">{bookingId}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-400">Status</span>
              {(payFull || isRemainingMode) ? (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">Confirmed</span>
              ) : (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">Pending — Pay Remaining to Confirm</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Payment Method</span>
              <span className="text-white capitalize">{paymentMethod}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 animate-[fadeInUp_0.5s_ease-out_0.8s_both]">
            <button
              onClick={() => navigate(`/my-weddings/${bookingId}`)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <HiOutlineDocumentText className="w-5 h-5" /> View Booking
            </button>
          </div>

          {/* Partial payment note */}
          {!payFull && !isRemainingMode && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl animate-[fadeInUp_0.5s_ease-out_0.9s_both]">
              <p className="text-indigo-200 text-sm text-center">
                Your booking is <span className="text-amber-300 font-semibold">pending confirmation</span>. Pay the remaining <span className="text-white font-semibold">₹{formatPrice(totalAmount - payableAmount)}</span> to confirm your booking and notify your guests.
              </p>
            </div>
          )}
          {isRemainingMode && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-xl animate-[fadeInUp_0.5s_ease-out_0.9s_both]">
              <p className="text-emerald-200 text-sm text-center">
                🎉 Balance cleared! Your wedding is now <span className="text-white font-semibold">fully paid & confirmed</span>. Guest invitations will be sent shortly.
              </p>
            </div>
          )}

          {/* Confetti-like particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-[confetti_3s_ease-out_forwards]"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: '50%',
                  backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.8
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes drawCheck {
            0% { stroke-dasharray: 30; stroke-dashoffset: 30; opacity: 0; }
            100% { stroke-dasharray: 30; stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes fadeInUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translateY(-200px) rotate(720deg) scale(0); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!booking) return <div className="min-h-screen pt-24 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;

  // Refund Policy Modal Component
  const RefundPolicyModal = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRefundPolicy(false)}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <HiOutlineShieldCheck className="w-6 h-6 text-gold" />
            <h3 className="font-serif text-xl font-bold text-dark">Cancellation & Refund Policy</h3>
          </div>
          <button onClick={() => setShowRefundPolicy(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><HiOutlineX className="w-6 h-6" /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">How it works</p>
            <p className="text-xs text-blue-700 leading-relaxed">Wedding arrangements take approximately 15 days. We begin vendor coordination, venue blocking, and logistics from the moment your booking is confirmed. Refund eligibility depends on how close to the event date you cancel.</p>
          </div>

          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-emerald-800">100% Refund</p>
                <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Full</span>
              </div>
              <p className="text-xs text-emerald-700">Cancelled <strong>more than 30 days</strong> before the wedding date. No arrangements have started yet — you get a complete refund.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-amber-800">75% Refund</p>
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Partial</span>
              </div>
              <p className="text-xs text-amber-700">Cancelled <strong>15–30 days</strong> before the wedding date. Early arrangements have begun (venue blocked, vendor discussions) — 25% covers initial coordination costs.</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-orange-800">50% Refund</p>
                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">Half</span>
              </div>
              <p className="text-xs text-orange-700">Cancelled <strong>7–14 days</strong> before the wedding date. Vendors are booked, materials ordered, and logistics in progress — 50% covers committed costs.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-red-800">20% Refund</p>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">Minimal</span>
              </div>
              <p className="text-xs text-red-700">Cancelled <strong>less than 7 days</strong> before the wedding date. All arrangements are finalized — most costs are already incurred and non-recoverable.</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Important Notes:</strong><br/>
              • Refunds are processed within 7–10 business days to the original payment method.<br/>
              • Wedding date must be at least 15 days from booking date.<br/>
              • For partial payments, refund applies only on the amount paid.<br/>
              • Force majeure events (natural disasters, government restrictions) are handled on a case-by-case basis with maximum possible refund.
            </p>
          </div>
        </div>

        <button onClick={() => setShowRefundPolicy(false)} className="w-full mt-5 py-3 bg-gold text-white rounded-xl font-medium hover:bg-gold/90 transition-all">
          I Understand — Proceed to Payment
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {showRefundPolicy && <RefundPolicyModal />}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-indigo-300 text-sm tracking-[0.2em] uppercase mb-2">Secure Payment</p>
          <h1 className="font-serif text-3xl md:text-4xl text-white font-bold mb-2">Complete Your Booking</h1>
          <p className="text-gray-400">Your dream wedding is just one step away</p>
          {/* Refund Policy Link */}
          <button
            onClick={() => setShowRefundPolicy(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 rounded-full text-amber-300 text-sm font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all animate-pulse hover:animate-none"
          >
            <HiOutlineShieldCheck className="w-4 h-4" /> View Cancellation & Refund Policy
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment Option */}
            {!isRemainingMode && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Payment Option</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPayFull(true)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${payFull ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 text-gray-400 hover:border-white/30'}`}
                  >
                    <p className="font-bold text-lg">Full Payment</p>
                    <p className="text-sm opacity-75">₹{formatPrice(totalAmount)}</p>
                  </button>
                  <button
                    onClick={() => setPayFull(false)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${!payFull ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 text-gray-400 hover:border-white/30'}`}
                  >
                    <p className="font-bold text-lg">Pay 30% Now</p>
                    <p className="text-sm opacity-75">₹{formatPrice(Math.round(totalAmount * 0.3))}</p>
                    <p className="text-xs text-indigo-300 mt-1">Remaining before event</p>
                  </button>
                </div>
              </div>
            )}

            {isRemainingMode && (
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-6">
                <h3 className="text-amber-200 font-semibold mb-2">Paying Remaining Balance</h3>
                <p className="text-sm text-amber-100/80">Already paid: ₹{formatPrice(paidSoFar)} of ₹{formatPrice(totalAmount)}</p>
                <p className="text-lg font-bold text-white mt-2">Due now: ₹{formatPrice(remainingDue)}</p>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Payment Method</h3>
              <div className="flex gap-3 mb-6">
                {[
                  { id: 'card', label: 'Card', icon: <HiOutlineCreditCard className="w-4 h-4" /> },
                  { id: 'upi', label: 'UPI', icon: <HiOutlineDeviceMobile className="w-4 h-4" /> },
                  { id: 'netbanking', label: 'Net Banking', icon: <HiOutlineLibrary className="w-4 h-4" /> }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${paymentMethod === m.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 border border-white/10 hover:border-indigo-400/50'}`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Card Number"
                    maxLength={19}
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      maxLength={4}
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <input
                  type="text"
                  placeholder="Enter UPI ID (e.g. name@paytm)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                />
              )}

              {paymentMethod === 'netbanking' && (
                <div className="space-y-3">
                  <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full px-4 py-3 bg-[#1e1b4b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-400 text-sm" style={{ colorScheme: 'dark' }}>
                    <option value="" className="bg-[#1e1b4b] text-white">Select Bank</option>
                    <option value="sbi" className="bg-[#1e1b4b] text-white">State Bank of India</option>
                    <option value="hdfc" className="bg-[#1e1b4b] text-white">HDFC Bank</option>
                    <option value="icici" className="bg-[#1e1b4b] text-white">ICICI Bank</option>
                    <option value="axis" className="bg-[#1e1b4b] text-white">Axis Bank</option>
                    <option value="kotak" className="bg-[#1e1b4b] text-white">Kotak Mahindra Bank</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1e1b4b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-[#1e1b4b] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={processing || !isFormValid()}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : `Pay ₹${formatPrice(payableAmount)}`}
            </button>

            <p className="text-center text-gray-500 text-xs flex items-center justify-center gap-1.5">
              <HiOutlineLockClosed className="w-3.5 h-3.5" /> Secured with 256-bit SSL encryption
            </p>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-24">
              <h3 className="text-white font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Booking Type</span>
                  <span className="capitalize text-white">{booking.type}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Booking ID</span>
                  <span className="text-white font-mono text-xs">{booking.id?.slice(0, 12)}...</span>
                </div>
                {booking.breakdown && (
                  <>
                    <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                      {booking.breakdown.venue && <div className="flex justify-between text-gray-300"><span>Venue</span><span className="text-white">₹{formatPrice(booking.breakdown.venue)}</span></div>}
                      {booking.breakdown.base && <div className="flex justify-between text-gray-300"><span>Base</span><span className="text-white">₹{formatPrice(booking.breakdown.base)}</span></div>}
                      {booking.breakdown.vendors > 0 && <div className="flex justify-between text-gray-300"><span>Vendors</span><span className="text-white">₹{formatPrice(booking.breakdown.vendors)}</span></div>}
                      <div className="flex justify-between text-gray-300"><span>GST</span><span className="text-white">₹{formatPrice(booking.breakdown.gst)}</span></div>
                    </div>
                  </>
                )}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-200">Total</span>
                    <span className="text-indigo-300">₹{formatPrice(totalAmount)}</span>
                  </div>
                  {paidSoFar > 0 && (
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-400">Already Paid</span>
                      <span className="text-emerald-300">₹{formatPrice(paidSoFar)}</span>
                    </div>
                  )}
                  {(!payFull || isRemainingMode) && (
                    <div className="mt-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <p className="text-indigo-300 text-xs">Paying now: <strong>₹{formatPrice(payableAmount)}</strong></p>
                      {!isRemainingMode && <p className="text-gray-400 text-xs mt-1">Remaining: ₹{formatPrice(totalAmount - payableAmount)} (due before event)</p>}
                      {isRemainingMode && <p className="text-emerald-300 text-xs mt-1">This clears your balance.</p>}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-3 italic">* Final amount may vary based on actual guest count and vendor adjustments. Differences will be refunded or charged accordingly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}