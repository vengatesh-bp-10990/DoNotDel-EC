import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

const CATEGORIES = ['Coconut Products', 'Hair Oils', 'Groundnut Oils', 'Sarees', 'Nightwear'];

function AdminProducts() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [catFilter, setCatFilter] = useState('All');
  const [form, setForm] = useState({ Name: '', Description: '', Price: '', Category: CATEGORIES[0], Image_URL: '', Stock_Quantity: '' });

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    fetchProducts();
  }, [isAuthenticated, user, navigate]);

  function fetchProducts() {
    fetch(`${API_BASE}/products`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProducts((data.data || []).map(d => d.Products || d));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function openAdd() {
    setEditId(null);
    setForm({ Name: '', Description: '', Price: '', Category: CATEGORIES[0], Image_URL: '', Stock_Quantity: '' });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditId(p.ROWID);
    setForm({ Name: p.Name || '', Description: p.Description || '', Price: p.Price || '', Category: p.Category || CATEGORIES[0], Image_URL: p.Image_URL || '', Stock_Quantity: p.Stock_Quantity || '' });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/admin/product` : `${API_BASE}/admin/product`;
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { ROWID: editId, ...form, Price: parseFloat(form.Price), Stock_Quantity: parseInt(form.Stock_Quantity) || 0 }
        : { ...form, Price: parseFloat(form.Price), Stock_Quantity: parseInt(form.Stock_Quantity) || 0 };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchProducts();
      }
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/admin/product/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setProducts(prev => prev.filter(p => p.ROWID !== id));
    } catch (err) { console.error(err); }
    setDeleting(null);
  }

  async function quickUpdateStock(product, delta) {
    const newQty = Math.max(0, parseInt(product.Stock_Quantity || 0) + delta);
    try {
      await fetch(`${API_BASE}/admin/product`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ROWID: product.ROWID, Stock_Quantity: newQty }),
      });
      setProducts(prev => prev.map(p => p.ROWID === product.ROWID ? { ...p, Stock_Quantity: newQty } : p));
    } catch (err) { console.error(err); }
  }

  if (!isAuthenticated || user?.Role !== 'Admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredProducts = catFilter === 'All' ? products : products.filter(p => p.Category === catFilter);
  const allCats = ['All', ...new Set(products.map(p => p.Category).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Product Management</h1>
          <p className="text-sm text-gray-400 mt-1">{products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-sm font-medium text-amber-600 hover:text-amber-700">← Dashboard</Link>
          <button onClick={openAdd} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {allCats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${catFilter === c ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <div key={product.ROWID} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {product.Image_URL && (
              <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                <img src={product.Image_URL} alt={product.Name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm truncate">{product.Name}</h3>
                  <p className="text-xs text-amber-600 font-medium">{product.Category}</p>
                </div>
                <p className="text-lg font-extrabold text-gray-800 flex-shrink-0">₹{parseFloat(product.Price || 0).toFixed(0)}</p>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-3">{product.Description}</p>

              {/* Stock Controls */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Stock:</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => quickUpdateStock(product, -5)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition-all">−</button>
                  <span className={`text-sm font-bold min-w-[40px] text-center ${parseInt(product.Stock_Quantity) <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                    {parseInt(product.Stock_Quantity || 0)}
                  </span>
                  <button onClick={() => quickUpdateStock(product, 5)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition-all">+</button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(product)} className="flex-1 text-sm font-medium py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">Edit</button>
                <button onClick={() => handleDelete(product.ROWID)} disabled={deleting === product.ROWID}
                  className="text-sm font-medium py-2 px-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-all">
                  {deleting === product.ROWID ? '...' : '🗑'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">{editId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input type="number" value={form.Price} onChange={e => setForm({ ...form, Price: e.target.value })} required min="0" step="0.01"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
                  <input type="number" value={form.Stock_Quantity} onChange={e => setForm({ ...form, Stock_Quantity: e.target.value })} min="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={form.Category} onChange={e => setForm({ ...form, Category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={form.Image_URL} onChange={e => setForm({ ...form, Image_URL: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">
                  {saving ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-5 rounded-xl transition-all text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
