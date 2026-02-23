import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function AuthModal() {
  const { showAuthModal, closeAuthModal } = useApp();
  const navigate = useNavigate();
  const backdropRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showAuthModal]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && showAuthModal) closeAuthModal();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showAuthModal, closeAuthModal]);

  const handleSignIn = () => {
    closeAuthModal();
    navigate('/login');
  };

  if (!showAuthModal) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) closeAuthModal(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-modal-backdrop"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-modal-slide overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors group"
        >
          <svg className="w-4 h-4 text-white group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🏠</span>
          </div>
          <h3 className="text-xl font-bold text-white">Welcome to Homemade Products</h3>
          <p className="text-white/80 text-sm mt-1">Sign in to continue shopping</p>
        </div>

        {/* Sign In Redirect */}
        <div className="px-5 sm:px-7 py-8 text-center">
          <p className="text-gray-600 mb-6">You need to sign in to perform this action.</p>
          <button
            onClick={handleSignIn}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-200 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign In / Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
