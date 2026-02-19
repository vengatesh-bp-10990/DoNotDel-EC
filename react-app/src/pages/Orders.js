import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';
const STATUS_POLL_INTERVAL = 10000; // 10 seconds

function DownloadInvoiceBtn({ orderId, small }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      className={`inline-flex items-center gap-1.5 font-semibold rounded-xl transition-all ${
        small
          ? 'text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'text-sm px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
      } disabled:opacity-50`}>
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )}
      {loading ? 'Generating...' : 'Invoice'}
    </button>
  );
}

const STATUS_CONFIG = {
  Pending: { color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  Confirmed: { color: 'bg-blue-100 text-blue-700', icon: '✓' },
  Processing: { color: 'bg-indigo-100 text-indigo-700', icon: '⚙️' },
  Shipped: { color: 'bg-purple-100 text-purple-700', icon: '🚚' },
  Delivered: { color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  Cancelled: { color: 'bg-red-100 text-red-700', icon: '✕' },
};

function Orders() {
  const { user, isAuthenticated, openAuthModal } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatedOrderId, setUpdatedOrderId] = useState(null);
  const prevStatusMapRef = useRef({});
  const pollRef = useRef(null);

  const fetchOrders = useCallback(() => {
    if (!isAuthenticated || !user?.ROWID) return Promise.resolve();
    return fetch(`${API_BASE}/orders/${user.ROWID}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const list = data.data || [];
          // Detect status changes for flash effect
          list.forEach(order => {
            const o = order.Orders || order;
            const prev = prevStatusMapRef.current[o.ROWID];
            if (prev && prev !== o.Status) {
              setUpdatedOrderId(o.ROWID);
              setTimeout(() => setUpdatedOrderId(null), 2500);
            }
            prevStatusMapRef.current[o.ROWID] = o.Status;
          });
          setOrders(list);
        }
      })
      .catch(console.error);
  }, [isAuthenticated, user]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated || !user?.ROWID) { setLoading(false); return; }
    fetchOrders().finally(() => setLoading(false));
  }, [isAuthenticated, user, fetchOrders]);

  // Poll for status changes
  useEffect(() => {
    if (!isAuthenticated || !user?.ROWID) return;
    pollRef.current = setInterval(fetchOrders, STATUS_POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, user, fetchOrders]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">Sign in to view your orders</p>
          <button onClick={openAuthModal} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-all">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading orders...</p>
      </div>
    );
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => (o.Orders?.Status || '') === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">My Orders</h1>
          <p className="text-sm text-gray-400 mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/" className="text-sm font-medium text-amber-600 hover:text-amber-700">Continue Shopping</Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {['all', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-lg font-semibold text-gray-500 mb-1">No orders found</p>
          <p className="text-sm text-gray-400 mb-4">{filter !== 'all' ? 'Try a different filter' : 'Place your first order!'}</p>
          <Link to="/" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all">Shop Now</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const o = order.Orders || order;
            const status = o.Status || 'Pending';
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
            let items = [];
            try { items = JSON.parse(o.Items || '[]'); } catch {}
            return (
              <Link key={o.ROWID} to={`/order/${o.ROWID}`}
                className={`block bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-500 p-5 ${updatedOrderId === o.ROWID ? 'ring-4 ring-amber-300 scale-[1.01] shadow-lg' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Order #{o.ROWID}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.CREATEDTIME ? new Date(o.CREATEDTIME).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.color}`}>
                    {cfg.icon} {status}
                  </span>
                </div>

                {items.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                    {items.slice(0, 4).map((item, i) => (
                      <div key={i} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg whitespace-nowrap">
                        {item.name} × {item.qty}
                      </div>
                    ))}
                    {items.length > 4 && <div className="text-xs text-gray-400 px-2 py-1">+{items.length - 4} more</div>}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold text-gray-800">₹{parseFloat(o.Total_Amount || 0).toFixed(0)}</span>
                    <span className="text-gray-400">{o.Payment_Method || 'COD'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DownloadInvoiceBtn orderId={o.ROWID} small />
                    <span className="text-xs text-amber-600 font-medium">View Details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Orders;
