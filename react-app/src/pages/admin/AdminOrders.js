import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  Processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  Delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

function AdminOrders() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [editingItems, setEditingItems] = useState(null);
  const [savingItems, setSavingItems] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    fetchOrders();
  }, [isAuthenticated, user, navigate]);

  function fetchOrders() {
    setLoading(true);
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
        setOrders(prev => prev.map(o => o.ROWID === orderId ? { ...o, Status: newStatus } : o));
      }
    } catch (err) { console.error(err); }
    setUpdating(null);
  }

  function startEditItems(order) {
    let items = [];
    try { items = order.enrichedItems || JSON.parse(order.Items || '[]'); } catch {}
    setEditingItems({ orderId: order.ROWID, items: items.map(i => ({ ...i })) });
  }

  function updateItemQty(idx, newQty) {
    if (newQty < 0) return;
    setEditingItems(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, qty: newQty } : item),
    }));
  }

  function removeItem(idx) {
    setEditingItems(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  }

  async function saveEditedItems() {
    if (!editingItems) return;
    setSavingItems(true);
    try {
      const cleanItems = editingItems.items.filter(i => i.qty > 0).map(i => ({
        id: i.id, name: i.name || i.productName, qty: i.qty, price: i.price, image: i.image || '',
      }));
      const res = await fetch(`${API_BASE}/admin/order-items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: editingItems.orderId, items: cleanItems }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => {
          if (o.ROWID === editingItems.orderId) {
            return { ...o, Items: JSON.stringify(cleanItems), enrichedItems: cleanItems, Total_Amount: data.total };
          }
          return o;
        }));
        setEditingItems(null);
      }
    } catch (err) { console.error(err); }
    setSavingItems(false);
  }

  if (!isAuthenticated || user?.Role !== 'Admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => (o.Status || '') === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Order Management</h1>
        <p className="text-sm text-gray-400 mt-1">{orders.length} total orders</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {['all', ...STATUS_OPTIONS].map(f => {
          const count = f === 'all' ? orders.length : orders.filter(o => (o.Status || '') === f).length;
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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-lg font-semibold text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const o = order;
            const isExpanded = expandedId === o.ROWID;
            const status = o.Status || 'Pending';
            let items = [];
            try { items = o.enrichedItems || JSON.parse(o.Items || '[]'); } catch {}
            const isEditing = editingItems?.orderId === o.ROWID;

            return (
              <div key={o.ROWID} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="p-4 sm:p-5 cursor-pointer" onClick={() => { setExpandedId(isExpanded ? null : o.ROWID); if (isEditing) setEditingItems(null); }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{(o.customerName || '?')[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800">{o.customerName || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">#{o.ROWID} • {o.CREATEDTIME ? new Date(o.CREATEDTIME).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-800">₹{parseFloat(o.Total_Amount || 0).toFixed(0)}</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{items.length} items</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {/* Customer & Shipping */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Customer
                        </p>
                        <p className="text-sm font-semibold text-gray-800">{o.customerName || '—'}</p>
                        <p className="text-xs text-gray-500 mt-1">{o.customerEmail || '—'}</p>
                        <p className="text-xs text-gray-500">{o.customerPhone || 'No phone'}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Shipping Address
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{o.Shipping_Address || '—'}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          Payment
                        </p>
                        <p className="text-sm font-semibold text-gray-800">{o.Payment_Method || 'COD'}</p>
                        <p className="text-xs text-gray-500 mt-1">Total: <span className="font-bold text-gray-800">₹{parseFloat(o.Total_Amount || 0).toFixed(0)}</span></p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-4 sm:px-5 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          Order Items ({items.length})
                        </p>
                        {!isEditing && status !== 'Delivered' && status !== 'Cancelled' && (
                          <button onClick={(e) => { e.stopPropagation(); startEditItems(o); }}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit Qty
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 mb-4">
                          {editingItems.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-3 border-2 border-amber-100">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.productName || item.name}</p>
                                <p className="text-xs text-gray-400">₹{item.price} each {item.availableStock !== undefined && <span className="text-amber-600">• Stock: {item.availableStock}</span>}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); updateItemQty(idx, item.qty - 1); }}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">−</button>
                                <input type="number" value={item.qty} min={0}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => { e.stopPropagation(); updateItemQty(idx, parseInt(e.target.value) || 0); }}
                                  className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none" />
                                <button onClick={(e) => { e.stopPropagation(); updateItemQty(idx, item.qty + 1); }}
                                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors">+</button>
                              </div>
                              <span className="text-sm font-bold text-gray-700 w-16 text-right">₹{(parseFloat(item.price || 0) * (item.qty || 0)).toFixed(0)}</span>
                              <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">New Total: <span className="font-bold text-gray-800">₹{editingItems.items.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.qty || 0)), 0).toFixed(0)}</span></p>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItems(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                              <button onClick={(e) => { e.stopPropagation(); saveEditedItems(); }} disabled={savingItems}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5">
                                {savingItems && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt="" className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>'; }} />
                                ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.productName || item.name}</p>
                                <p className="text-xs text-gray-400">Qty: {item.qty} × ₹{item.price}</p>
                              </div>
                              <span className="text-sm font-bold text-gray-700">₹{(parseFloat(item.price || 0) * (item.qty || 1)).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Update */}
                    <div className="px-4 sm:px-5 pb-5">
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                        <label className="text-sm font-medium text-gray-700">Update Status:</label>
                        <select value={status}
                          onChange={(e) => updateStatus(o.ROWID, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updating === o.ROWID}
                          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 cursor-pointer disabled:opacity-50">
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {updating === o.ROWID && <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />}
                      </div>
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
