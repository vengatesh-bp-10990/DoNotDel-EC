import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function Signup() {
  const { isAuthenticated, user } = useApp();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const signInInitRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate(user?.Role === 'Admin' ? '/admin' : '/', { replace: true });
  }, [isAuthenticated, user, navigate]);

  // Render Catalyst embedded sign-in form (handles signup when Public Signup is enabled)
  useEffect(() => {
    if (signInInitRef.current || isAuthenticated) return;
    const initSignIn = () => {
      if (window.catalyst?.auth?.signIn && containerRef.current) {
        signInInitRef.current = true;
        window.catalyst.auth.signIn('catalyst-signup-container', {
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

      {/* Right Panel — Catalyst Embedded Sign-Up */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Create Account
            </h2>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Enter your email to get started — it's free!
            </p>
          </div>

          {/* Catalyst Embedded Sign-In/Sign-Up Container */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div
              id="catalyst-signup-container"
              ref={containerRef}
              className="min-h-[480px]"
              style={{ display: 'flex', flexDirection: 'column' }}
            />
          </div>

          {/* Feature badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              { icon: '🔒', label: 'Secure & Private' },
              { icon: '🌐', label: 'Google Sign-Up' },
              { icon: '⚡', label: 'Instant Access' },
            ].map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-500 font-medium">
                <span>{badge.icon}</span> {badge.label}
              </span>
            ))}
          </div>

          {/* Switch to Login */}
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
