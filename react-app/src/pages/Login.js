import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function Login() {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const signInInitRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate(user?.Role === 'Admin' ? '/admin' : '/', { replace: true });
  }, [isAuthenticated, user, navigate]);

  // Render Catalyst embedded sign-in form
  useEffect(() => {
    if (signInInitRef.current || isAuthenticated) return;
    const initSignIn = () => {
      if (window.catalyst?.auth?.signIn && containerRef.current) {
        signInInitRef.current = true;
        window.catalyst.auth.signIn('catalyst-login-container', {
          service_url: '/'
        });
        // Disable iframe internal scroll once it's injected
        const fixIframe = () => {
          const iframe = containerRef.current?.querySelector('iframe');
          if (iframe) {
            iframe.setAttribute('scrolling', 'no');
            iframe.style.overflow = 'hidden';
            iframe.style.minHeight = '480px';
          } else {
            setTimeout(fixIframe, 200);
          }
        };
        setTimeout(fixIframe, 300);
      } else {
        setTimeout(initSignIn, 200);
      }
    };
    setTimeout(initSignIn, 300);
  }, [isAuthenticated]);

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

      {/* Right Panel — Catalyst Embedded Sign-In */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Sign In
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Sign in or create a new account to continue
            </p>
          </div>

          {/* Catalyst Embedded Sign-In Container */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div
              id="catalyst-login-container"
              ref={containerRef}
              className="min-h-[480px]"
              style={{ display: 'flex', flexDirection: 'column' }}
            />
          </div>

          {/* Switch to Sign Up */}
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <a href="/signup" className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                Sign Up
              </a>
            </p>
          </div>

          {/* Feature badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {[
              { icon: '🔒', label: 'Secure Login' },
              { icon: '🌐', label: 'Google Sign-In' },
              { icon: '✨', label: 'Free Sign-Up' },
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

export default Login;
