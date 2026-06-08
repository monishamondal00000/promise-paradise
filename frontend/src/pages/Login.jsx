import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res?.user?.isAdmin) {
        navigate('/admin');
      } else {
        navigate(returnUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.12),_transparent_32%),linear-gradient(135deg,_#fffaf4_0%,_#fff_48%,_#f8f5ef_100%)]">
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-10">
        <div className="w-full max-w-md rounded-[32px] bg-white/88 backdrop-blur-sm border border-white/70 shadow-[0_24px_80px_rgba(30,24,14,0.12)] p-8 md:p-10">
          <h1 className="font-serif text-3xl font-bold text-dark mb-2">Welcome Back</h1>
          <p className="text-gray-500 mb-8">Sign in to continue planning your dream wedding</p>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Email or Phone Number <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm"
                placeholder="your@email.com or 98765 43210"
                required
              />
              <p className="text-xs text-gray-400 mt-1">You can login with your registered email or phone number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold text-sm pr-11"
                  placeholder="Enter your password"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-white rounded-xl hover:bg-gold/90 transition-all font-medium disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link to="/register" className="text-gold font-medium hover:underline">Register</Link>
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
          <h2 className="font-serif text-4xl leading-tight mb-3">Celebrate every vow in style.</h2>
          <p className="text-sm text-white/80">Curated venues, elegant details, and planning support for weddings that feel personal.</p>
        </div>
      </div>
    </div>
  );
}
