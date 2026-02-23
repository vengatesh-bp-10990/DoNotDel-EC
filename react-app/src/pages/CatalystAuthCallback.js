import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Handles Catalyst Auth callback URLs:
 *   /login/accounts/p/{ZAID}/pconfirm  (set password after signup)
 *   /login/accounts/p/{ZAID}/resetpassword (reset password)
 * 
 * Renders the Catalyst embedded signIn form which auto-detects the URL
 * and shows the appropriate form (set password / reset password / sign-in).
 */
function CatalystAuthCallback() {
  const containerRef = useRef(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;

    const tryInit = () => {
      if (window.catalyst?.auth?.signIn && containerRef.current) {
        initRef.current = true;
        window.catalyst.auth.signIn('catalyst-auth-callback-container', {
          service_url: '/',
        });

        // Fix iframe styling once injected
        const fixIframe = () => {
          const iframe = containerRef.current?.querySelector('iframe');
          if (iframe) {
            iframe.setAttribute('scrolling', 'no');
            iframe.style.overflow = 'hidden';
            iframe.style.minHeight = '500px';
            iframe.style.width = '100%';
          } else {
            setTimeout(fixIframe, 200);
          }
        };
        setTimeout(fixIframe, 300);
      } else {
        setTimeout(tryInit, 200);
      }
    };

    setTimeout(tryInit, 300);
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Set Your Password
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            Create a secure password for your account
          </p>
        </div>

        {/* Catalyst Auth Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div
            id="catalyst-auth-callback-container"
            ref={containerRef}
            className="min-h-[500px]"
            style={{ display: 'flex', flexDirection: 'column' }}
          />
        </div>

        {/* Back to login link */}
        <div className="mt-6 text-center">
          <Link to="/login"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CatalystAuthCallback;
