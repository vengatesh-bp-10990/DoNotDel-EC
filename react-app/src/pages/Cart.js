import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function Cart() {
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart, isAuthenticated, openAuthModal } = useApp();
  const navigate = useNavigate();

  function handleCheckout() {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) { openAuthModal(); return; }
    navigate('/checkout');
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="card p-10 text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
          <Link to="/" className="btn-primary inline-block">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Shopping Cart</h1>
          <p className="text-gray-400 text-sm mt-1">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1 space-y-4">
          {cartItems.map((item, index) => (
            <div
              key={item.ROWID}
              className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={item.Image_URL}
                  alt={item.Name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h3 className="text-base font-bold text-gray-800 truncate">{item.Name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{item.Category}</p>
                <p className="text-emerald-600 font-bold mt-1">₹{parseFloat(item.Price).toFixed(0)}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => updateQuantity(item.ROWID, -1)}
                  className="w-9 h-9 rounded-lg bg-white hover:bg-gray-50 text-gray-600 font-bold flex items-center justify-center transition-all shadow-sm text-lg"
                >
                  −
                </button>
                <span className="text-base font-bold w-10 text-center text-gray-800">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.ROWID, 1)}
                  className="w-9 h-9 rounded-lg bg-white hover:bg-gray-50 text-gray-600 font-bold flex items-center justify-center transition-all shadow-sm text-lg"
                >
                  +
                </button>
              </div>

              {/* Subtotal & Remove */}
              <div className="flex flex-col items-center gap-2 min-w-[90px]">
                <span className="text-lg font-extrabold text-gray-800">
                  ₹{(parseFloat(item.Price) * item.quantity).toFixed(0)}
                </span>
                <button
                  onClick={() => removeFromCart(item.ROWID)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:w-96">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Order Summary</h2>

            <div className="space-y-3 mb-5">
              {cartItems.map((item) => (
                <div key={item.ROWID} className="flex justify-between text-sm">
                  <span className="text-gray-500 truncate mr-4">{item.Name} × {item.quantity}</span>
                  <span className="text-gray-700 font-medium flex-shrink-0">₹{(parseFloat(item.Price) * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-2">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Delivery</span>
                <span className="text-emerald-600 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-xl font-extrabold text-gray-800 border-t border-gray-100 pt-4">
                <span>Total</span>
                <span className="text-emerald-600">₹{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4 flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-700">
                  Please <button onClick={openAuthModal} className="font-bold underline underline-offset-2 hover:text-indigo-600">log in</button> to place your order.
                </p>
              </div>
            )}

            <button onClick={handleCheckout}
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
              {!isAuthenticated ? (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>Login to Checkout</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>Proceed to Checkout</>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">Secure checkout · Cash on Delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
