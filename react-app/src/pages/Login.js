import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const GOOGLE_CLIENT_ID = '492564361626-u3tpqrrq76k2h3kpo2e74m18cqs7ggri.apps.googleusercontent.com';

function Login() {
  const { loginWithCredentials, googleSignIn, isAuthenticated, user } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setLoading(true);
      setError('');
      const data = await googleSignIn(response.credential);
      const role = data?.user?.Role;
      navigate(role === 'Admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [googleSignIn, navigate]);

  useEffect(() => {
    const renderGoogleButton = () => {
      if (window.google && window.google.accounts && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth,
          text: 'continue_with',
          shape: 'pill',
        });
      }
    };
    if (window.google && window.google.accounts) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse]);

  useEffect(() => {
    if (isAuthenticated) navigate(user?.Role === 'Admin' ? '/admin' : '/', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim()) return setError('Email is required');
    if (!form.password) return setError('Password is required');

    setLoading(true);
    try {
      const data = await loginWithCredentials({ email: form.email.trim().toLowerCase(), password: form.password });
      const role = data?.user?.Role;
      navigate(role === 'Admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  );
  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
            <span className="text-2xl font-bold text-white">Homemade Products</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
            Welcome<br />Back
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-md">
            Sign in to access your cart, track orders, and shop premium homemade oils & handcrafted clothing.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🛒', text: 'Add to cart & checkout seamlessly' },
              { icon: '📦', text: 'Track your orders in real-time' },
              { icon: '💰', text: 'Cash on Delivery — no hassle' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Custom Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Sign In
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Access your account to continue shopping
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-7 space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-200 hover:shadow-amber-300 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google Sign In */}
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </form>

          {/* Switch to Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
