import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

function DownloadInvoiceButton({ orderId }) {
  const [loading, setLoading] = React.useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoice/${orderId}`);
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice-${orderId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Failed to download invoice.'); }
    setLoading(false);
  };
  return (
    <button onClick={handleDownload} disabled={loading}
      className="mt-3 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm shadow-sm disabled:opacity-50">
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )}
      {loading ? 'Generating...' : 'Download Invoice'}
    </button>
  );
}

function InputField({ label, name, value, placeholder, required, type = 'text', half, onChange }) {
  return (
    <div className={half ? 'flex-1' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-400">*</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm transition-all" />
    </div>
  );
}

function Checkout() {
  const { cartItems, cartTotal, clearCart, isAuthenticated, user, openAuthModal, location, lookupPincode } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=address, 2=review, 3=done
  const [form, setForm] = useState({
    fullName: user?.Name || '',
    phone: user?.Phone || '',
    email: user?.Email || '',
    addressLine1: '', addressLine2: '',
    city: location?.city || '',
    state: location?.state || 'Tamil Nadu',
    pincode: location?.pincode || '',
    sameAsBilling: true,
    bFullName: '', bAddressLine1: '', bCity: '', bState: 'Tamil Nadu', bPincode: '',
  });
  const [orderId, setOrderId] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Auto-fill city/state when pincode changes (6 digits)
  const handlePincodeLookup = useCallback(async (pincode) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    const result = await lookupPincode(pincode);
    if (result) {
      setForm(prev => ({ ...prev, city: result.city, state: result.state }));
    }
    setPincodeLoading(false);
  }, [lookupPincode]);

  // If saved location updates and fields are still empty, auto-fill
  useEffect(() => {
    if (location) {
      setForm(prev => ({
        ...prev,
        city: prev.city || location.city || '',
        state: prev.state || location.state || 'Tamil Nadu',
        pincode: prev.pincode || location.pincode || '',
      }));
    }
  }, [location]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">Please sign in to checkout</p>
          <button onClick={openAuthModal} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-all">Sign In</button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !orderId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Cart is empty</h2>
          <p className="text-gray-500 mb-6">Add items before checking out</p>
          <Link to="/" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-all inline-block">Shop Now</Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Auto-lookup when pincode reaches 6 digits
    if (name === 'pincode' && value.replace(/\D/g, '').length === 6) {
      handlePincodeLookup(value.replace(/\D/g, ''));
    }
  };
  const deliveryFee = cartTotal >= 500 ? 0 : 40;
  const grandTotal = cartTotal + deliveryFee;

  async function placeOrder() {
    setLoading(true);
    try {
      const shippingAddr = `${form.fullName}, ${form.addressLine1}${form.addressLine2 ? ', ' + form.addressLine2 : ''}, ${form.city}, ${form.state} - ${form.pincode}, Ph: ${form.phone}`;
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          User_ID: user?.ROWID || user?.Email,
          Total_Amount: grandTotal,
          Shipping_Address: shippingAddr,
          Items: cartItems.map(i => ({ name: i.Name, qty: i.quantity, price: i.Price, id: i.ROWID })),
          Payment_Method: 'COD',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderId(data.data?.ROWID);
        clearCart();
        setStep(3);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  // Step 3: Order confirmed
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-10">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12 text-center max-w-lg w-full relative overflow-hidden">
          {/* Confetti-like top accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />

          {/* Animated check icon */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-500 mb-1">Thank you for your order. We'll start preparing it right away.</p>
          {orderId && (
            <div className="inline-block bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 mb-4">
              <p className="text-sm font-semibold text-amber-700">Order ID: <span className="font-mono">#{orderId}</span></p>
            </div>
          )}
          <p className="text-sm text-gray-400 mb-6">Payment Method: Cash on Delivery</p>

          {/* Quick summary */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">What's Next?</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-700 font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Order Confirmation</p>
                  <p className="text-xs text-gray-400">Your order is being reviewed and confirmed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 font-bold text-xs">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Packing & Shipping</p>
                  <p className="text-xs text-gray-400">We'll carefully pack and ship your items</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-700 font-bold text-xs">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Delivery</p>
                  <p className="text-xs text-gray-400">Your homemade products arrive at your door!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {orderId && (
              <Link to={`/order/${orderId}`} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-amber-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Track Your Order
              </Link>
            )}
            <Link to="/" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all text-sm inline-flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              Continue Shopping
            </Link>
          </div>
          {orderId && <DownloadInvoiceButton orderId={orderId} />}

          <Link to="/orders" className="inline-block mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline">
            View All Orders →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/cart" className="hover:text-amber-600">Cart</Link>
        <span>/</span>
        <span className={step >= 1 ? 'text-amber-600 font-medium' : ''}>Address</span>
        <span>/</span>
        <span className={step >= 2 ? 'text-amber-600 font-medium' : ''}>Review & Pay</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Form */}
        <div className="flex-1">
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Delivery Address
              </h2>
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
                <div className="flex gap-4">
                  <InputField label="Full Name" name="fullName" value={form.fullName} placeholder="Your name" required half onChange={handleChange} />
                  <InputField label="Phone" name="phone" value={form.phone} placeholder="+91 98765 43210" required type="tel" half onChange={handleChange} />
                </div>
                <InputField label="Email" name="email" value={form.email} placeholder="email@example.com" type="email" onChange={handleChange} />
                <InputField label="Address Line 1" name="addressLine1" value={form.addressLine1} placeholder="House/Flat No, Street" required onChange={handleChange} />
                <InputField label="Address Line 2" name="addressLine2" value={form.addressLine2} placeholder="Landmark (optional)" onChange={handleChange} />
                <div className="flex gap-4">
                  <InputField label="City" name="city" value={form.city} placeholder="City" required half onChange={handleChange} />
                  <div className="flex-1 relative">
                    <InputField label="Pincode" name="pincode" value={form.pincode} placeholder="600001" required onChange={handleChange} />
                    {pincodeLoading && <div className="absolute right-3 top-8 w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />}
                  </div>
                </div>
                <InputField label="State" name="state" value={form.state} placeholder="State" required onChange={handleChange} />

                <label className="flex items-center gap-2 text-sm text-gray-600 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.sameAsBilling} onChange={() => setForm({ ...form, sameAsBilling: !form.sameAsBilling })} className="accent-amber-600 w-4 h-4" />
                  Billing address same as delivery
                </label>

                {!form.sameAsBilling && (
                  <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Billing Address</h3>
                    <InputField label="Full Name" name="bFullName" value={form.bFullName} placeholder="Billing name" required onChange={handleChange} />
                    <InputField label="Address" name="bAddressLine1" value={form.bAddressLine1} placeholder="Billing address" required onChange={handleChange} />
                    <div className="flex gap-4">
                      <InputField label="City" name="bCity" value={form.bCity} placeholder="City" required half onChange={handleChange} />
                      <InputField label="Pincode" name="bPincode" value={form.bPincode} placeholder="Pincode" required half onChange={handleChange} />
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl mt-4 transition-all">
                  Continue to Review
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Delivery Address</h2>
                  <button onClick={() => setStep(1)} className="text-sm text-amber-600 hover:underline">Edit</button>
                </div>
                <p className="text-sm text-gray-600">{form.fullName}</p>
                <p className="text-sm text-gray-500">{form.addressLine1}{form.addressLine2 && `, ${form.addressLine2}`}</p>
                <p className="text-sm text-gray-500">{form.city}, {form.state} - {form.pincode}</p>
                <p className="text-sm text-gray-500">Ph: {form.phone}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Items</h2>
                <div className="divide-y divide-gray-50">
                  {cartItems.map(item => (
                    <div key={item.ROWID} className="flex items-center gap-4 py-3">
                      <img src={item.Image_URL} alt={item.Name} className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.Name}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">₹{(parseFloat(item.Price) * item.quantity).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method</h2>
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when you receive your order</p>
                  </div>
                </div>
              </div>

              <button onClick={placeOrder} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order...</> : `Place Order — ₹${grandTotal.toFixed(0)}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="lg:w-80">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {cartItems.map(item => (
                <div key={item.ROWID} className="flex justify-between text-gray-500">
                  <span className="truncate mr-2">{item.Name} × {item.quantity}</span>
                  <span className="font-medium text-gray-700">₹{(parseFloat(item.Price) * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{cartTotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Delivery</span><span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
              <div className="flex justify-between text-lg font-extrabold text-gray-800 border-t border-gray-100 pt-3"><span>Total</span><span className="text-emerald-600">₹{grandTotal.toFixed(0)}</span></div>
            </div>
            {cartTotal < 500 && <p className="text-xs text-amber-600 mt-3">Add ₹{(500 - cartTotal).toFixed(0)} more for free delivery!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
