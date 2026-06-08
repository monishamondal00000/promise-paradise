import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlinePhone, HiOutlineShieldCheck } from 'react-icons/hi';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState(false); // false = form step, true = OTP verification step
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateForm = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.phone.trim()) return 'Phone number is required.';
    const cleanPhone = form.phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
    if (cleanPhone.length < 10) return 'Please enter a valid 10-digit phone number.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSendOTP = async () => {
    setError('');
    setSuccess('');
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setOtpSending(true);
    try {
      const res = await API.post('/auth/send-otp', {
        phone: form.phone,
        email: form.email,
        name: form.name
      });
      setOtpStep(true);
      setOtpSent(true);
      setResendTimer(30);
      setSuccess('OTP sent to your registered email!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError('');
    setSuccess('');
    setOtpSending(true);
    try {
      const res = await API.post('/auth/resend-otp', {
        phone: form.phone,
        email: form.email,
        name: form.name
      });
      setResendTimer(30);
      setSuccess('OTP resent to your email!');
    } catch (err) {
      if (err.response?.data?.waitSeconds) {
        setResendTimer(err.response.data.waitSeconds);
      }
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otpStep) {
      handleSendOTP();
      return;
    }

    // Submit with OTP
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.phone, form.password, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.12),_transparent_32%),linear-gradient(135deg,_#fffaf4_0%,_#fff_48%,_#f8f5ef_100%)]">
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-10">
        <div className="w-full max-w-md rounded-[32px] bg-white/88 backdrop-blur-sm border border-white/70 shadow-[0_24px_80px_rgba(30,24,14,0.12)] p-8 md:p-10">
          <h1 className="font-serif text-3xl font-bold text-dark mb-2">Create Account</h1>
          <p className="text-gray-500 mb-8">Begin your journey to the perfect wedding</p>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!otpStep ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Full Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Phone Number <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                    placeholder="+91 98765 43210"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">OTP will be sent to this number for verification</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm pr-11"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Confirm Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm pr-11"
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirm ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={otpSending}
                  className="w-full py-3 bg-gold text-white rounded-xl hover:bg-gold/90 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <HiOutlinePhone className="w-4 h-4" />
                  {otpSending ? 'Sending OTP...' : 'Register'}
                </button>
              </>
            ) : (
              <>
                {/* OTP Verification Step */}
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <HiOutlineShieldCheck className="w-5 h-5 text-gold" />
                    <p className="text-sm font-medium text-dark">OTP Verification</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter the 6-digit OTP sent to your email
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="------"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-2">OTP is valid for 5 minutes</p>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setOtp(''); setError(''); setSuccess(''); }}
                    className="text-sm text-gray-500 hover:text-dark"
                  >
                    ← Change details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || otpSending}
                    className="text-sm text-gold font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 bg-gold text-white rounded-xl hover:bg-gold/90 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <HiOutlineShieldCheck className="w-4 h-4" />
                  {loading ? 'Verifying & Creating Account...' : 'Verify & Create Account'}
                </button>
              </>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/login" className="text-gold font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block flex-1 relative overflow-hidden my-6 mr-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <img
          src="/images/landing/home%20%283%29.jpeg"
          alt="Wedding couple"
          className="w-full h-full object-cover scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/30 to-black/50" />
        <div className="absolute top-10 right-10 w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm animate-pulse" />
        <div className="absolute bottom-12 left-14 w-20 h-20 rounded-full border border-white/25 bg-gold/10 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute left-16 bottom-16 max-w-xs text-white z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-3">Promise Paradise</p>
          <h2 className="font-serif text-4xl leading-tight mb-3">Begin your celebration beautifully.</h2>
          <p className="text-sm text-white/80">Create your account to explore curated venues, vendor teams, and wedding experiences.</p>
        </div>
      </div>
    </div>
  );
}
