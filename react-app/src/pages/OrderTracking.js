import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = '/server/do_not_del_ec_function';

function DownloadInvoiceBtn({ orderId }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/invoice/${orderId}`);
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Invoice download failed:', err);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleDownload} disabled={loading}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm">
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )}
      {loading ? 'Generating PDF...' : 'Download Invoice'}
    </button>
  );
}

const STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

function OrderTracking() {
  const { id } = useParams();
  const { isAuthenticated, openAuthModal } = useApp();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/order/${id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setOrder(data.data?.Orders || data.data || null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">Sign in to view order details</p>
          <button onClick={openAuthModal} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-all">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-lg font-semibold text-gray-500 mb-4">Order not found</p>
        <Link to="/orders" className="text-amber-600 font-medium hover:underline">Back to Orders</Link>
      </div>
    );
  }

  const status = order.Status || 'Pending';
  const isCancelled = status === 'Cancelled';
  const currentStep = STEPS.indexOf(status);
  let items = [];
  try { items = JSON.parse(order.Items || '[]'); } catch {}

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/orders" className="hover:text-amber-600">My Orders</Link>
        <span>/</span>
        <span className="text-amber-600 font-medium">Order #{id}</span>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Order Status</h2>

        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <div>
              <p className="font-semibold text-red-700">Order Cancelled</p>
              <p className="text-xs text-red-500">This order has been cancelled.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.max(0, (currentStep / (STEPS.length - 1)) * 100)}%` }} />
            </div>
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step} className="relative flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${done ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'} ${active ? 'ring-4 ring-amber-200 scale-110' : ''}`}>
                    {done ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${done ? 'text-amber-600' : 'text-gray-400'} whitespace-nowrap`}>{step}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Order Info</h3>
          <div className="space-y-2 text-sm">
            <Row label="Order ID" value={`#${order.ROWID}`} />
            <Row label="Date" value={order.CREATEDTIME ? new Date(order.CREATEDTIME).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
            <Row label="Payment" value={order.Payment_Method || 'COD'} />
            <Row label="Total" value={`₹${parseFloat(order.Total_Amount || 0).toFixed(0)}`} bold />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Shipping Address</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{order.Shipping_Address || 'No address provided'}</p>
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Items ({items.length})</h3>
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-bold text-gray-800">₹{(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(0)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-2 pt-3 flex justify-between">
            <span className="text-sm font-bold text-gray-800">Total</span>
            <span className="text-lg font-extrabold text-emerald-600">₹{parseFloat(order.Total_Amount || 0).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Download Invoice */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <DownloadInvoiceBtn orderId={id} />
        <Link to="/orders" className="text-sm font-medium text-amber-600 hover:text-amber-700">← Back to My Orders</Link>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-800 ${bold ? 'font-bold text-emerald-600' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

export default OrderTracking;
