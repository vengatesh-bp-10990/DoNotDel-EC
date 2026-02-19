import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

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
  const { cartItems, cartTotal, clearCart, isAuthenticated, user, openAuthModal } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=address, 2=review, 3=done
  const [form, setForm] = useState({
    fullName: user?.Name || '',
    phone: user?.Phone || '',
    email: user?.Email || '',
    addressLine1: '', addressLine2: '', city: '', state: 'Tamil Nadu', pincode: '',
    sameAsBilling: true,
    bFullName: '', bAddressLine1: '', bCity: '', bState: 'Tamil Nadu', bPincode: '',
  });
  const [orderId, setOrderId] = useState(null);

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
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
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-lg">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Confirmed!</h2>
          <p className="text-gray-500 mb-1">Your order has been placed successfully.</p>
          {orderId && <p className="text-sm text-amber-600 font-medium mb-4">Order ID: #{orderId}</p>}
          <p className="text-sm text-gray-400 mb-6">Payment: Cash on Delivery</p>
          <div className="flex gap-3 justify-center">
            <Link to="/orders" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">View Orders</Link>
            <Link to="/" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">Continue Shopping</Link>
          </div>
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
                  <InputField label="Pincode" name="pincode" value={form.pincode} placeholder="600001" required half onChange={handleChange} />
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
