import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

function Signup() {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(user?.Role === 'Admin' ? '/admin' : '/', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) { setError('Name and email are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message || 'Signup failed'); setLoading(false); return; }
      setRegisteredEmail(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err) { setError('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  // ─── Success Screen: "Check your email" ───
  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
        <div className="w-full max-w-md text-center">
          {/* Animated mail icon */}
          <div className="relative mx-auto w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Check Your Email
          </h1>

          <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-2">
            We've sent a link to set your password to:
          </p>

          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 mb-6">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="font-semibold text-emerald-700 text-sm sm:text-base break-all">{registeredEmail}</span>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 text-left">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Next Steps</p>
            <div className="space-y-4">
              {[
                { step: '1', text: 'Open your email inbox', sub: 'Check spam/junk if you don\'t see it' },
                { step: '2', text: 'Click "Set Password"', sub: 'Use the button in the email we sent' },
                { step: '3', text: 'Create your password', sub: 'Choose a strong password for your account' },
                { step: '4', text: 'Sign in & start shopping!', sub: 'You\'re all set to explore our store' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-xs font-bold">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-amber-200 transition-all hover:shadow-xl hover:scale-[1.02]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Go to Sign In
          </Link>

          <p className="text-xs text-gray-400 mt-6">
            Didn't get the email?{' '}
            <button onClick={() => setSuccess(false)} className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2">
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─── Registration Form ───
  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
            <span className="text-2xl font-bold text-white">Homemade Products</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
            Join Us<br />Today
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-md">
            Create your free account and start shopping premium coconut oils, hair oils, sarees & more.
          </p>

          <div className="space-y-4">
            {[
              { icon: '✨', text: 'Free account — no credit card needed' },
              { icon: '🎁', text: 'Exclusive deals for new members' },
              { icon: '🚚', text: 'Free delivery on every order' },
              { icon: '🔔', text: 'Real-time order notifications' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Create Account
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Sign up to start shopping homemade products
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700 font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all bg-white" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all bg-white" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all bg-white" />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-400">
              A verification link will be sent to your email to set your password
            </p>
          </div>

          {/* Switch to Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                Sign In
              </Link>
            </p>
          </div>

          {/* Feature badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {[
              { icon: '🔒', label: 'Secure Signup' },
              { icon: '📧', label: 'Email Verification' },
              { icon: '✨', label: 'Free Account' },
            ].map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-500 font-medium">
                <span>{badge.icon}</span> {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
