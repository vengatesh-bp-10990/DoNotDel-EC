import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Processing: 'bg-indigo-100 text-indigo-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

function AdminOrders() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    fetchOrders();
  }, [isAuthenticated, user, navigate]);

  function fetchOrders() {
    fetch(`${API_BASE}/admin/orders`)
      .then(r => r.json())
      .then(data => { if (data.success) setOrders(data.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  async function updateStatus(orderId, newStatus) {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API_BASE}/admin/order-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => {
          if ((o.Orders?.ROWID || o.ROWID) === orderId) {
            return { ...o, Orders: { ...(o.Orders || o), Status: newStatus } };
          }
          return o;
        }));
      }
    } catch (err) { console.error(err); }
    setUpdating(null);
  }

  if (!isAuthenticated || user?.Role !== 'Admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => (o.Orders?.Status || '') === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Order Management</h1>
          <p className="text-sm text-gray-400 mt-1">{orders.length} total orders</p>
        </div>
        <Link to="/admin" className="text-sm font-medium text-amber-600 hover:text-amber-700">← Dashboard</Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {['all', ...STATUS_OPTIONS].map(f => {
          const count = f === 'all' ? orders.length : orders.filter(o => (o.Orders?.Status || '') === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'All' : f} ({count})
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg font-semibold text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const o = order.Orders || order;
            const isExpanded = expandedId === o.ROWID;
            const status = o.Status || 'Pending';
            let items = [];
            try { items = JSON.parse(o.Items || '[]'); } catch {}
            return (
              <div key={o.ROWID} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : o.ROWID)}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800">Order #{o.ROWID}</p>
                      <p className="text-xs text-gray-400">{o.CREATEDTIME ? new Date(o.CREATEDTIME).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-800">₹{parseFloat(o.Total_Amount || 0).toFixed(0)}</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Shipping Address</p>
                        <p className="text-sm text-gray-600">{o.Shipping_Address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">User ID</p>
                        <p className="text-sm text-gray-600">{o.User_ID || '—'}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1">Payment</p>
                        <p className="text-sm text-gray-600">{o.Payment_Method || 'COD'}</p>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
                        <div className="space-y-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                              <span className="text-gray-700">{item.name} × {item.qty}</span>
                              <span className="font-medium text-gray-700">₹{(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Update */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                      <label className="text-sm font-medium text-gray-700">Update Status:</label>
                      <select value={status}
                        onChange={(e) => updateStatus(o.ROWID, e.target.value)}
                        disabled={updating === o.ROWID}
                        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 cursor-pointer disabled:opacity-50">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {updating === o.ROWID && <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
