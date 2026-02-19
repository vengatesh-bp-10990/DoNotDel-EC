import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = '/server/do_not_del_ec_function';

function AdminCategories() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ Name: '', Description: '', Image_URL: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    fetchData();
  }, [isAuthenticated, user, navigate]);

  async function fetchData() {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/admin/categories`).then(r => r.json()),
        fetch(`${API_BASE}/products`).then(r => r.json()),
      ]);
      if (catRes.success) setCategories((catRes.data || []).map(d => d.Categories || d));
      if (prodRes.success) setProducts((prodRes.data || []).map(d => d.Products || d));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ Name: '', Description: '', Image_URL: '' });
    setShowForm(true);
  }

  function openEdit(cat) {
    setEditId(cat.ROWID);
    setForm({ Name: cat.Name || '', Description: cat.Description || '', Image_URL: cat.Image_URL || '' });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { ROWID: editId, ...form } : form;
      const res = await fetch(`${API_BASE}/admin/category`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/admin/category/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setCategories(prev => prev.filter(c => c.ROWID !== id));
    } catch (err) { console.error(err); }
    setDeleting(null);
  }

  if (!isAuthenticated || user?.Role !== 'Admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  function getProductCount(catName) {
    return products.filter(p => p.Category === catName).length;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categories</p>
        </div>
        <button onClick={openAdd} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">No categories yet</p>
          <p className="text-gray-400 text-sm mt-1">Add a category to organize your products</p>
          <button onClick={openAdd} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-5 rounded-xl text-sm font-semibold transition-all">
            Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.ROWID} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
              {cat.Image_URL ? (
                <div className="h-36 bg-gray-50 overflow-hidden">
                  <img src={cat.Image_URL} alt={cat.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                  <svg className="w-12 h-12 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-800">{cat.Name}</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0">
                    {getProductCount(cat.Name)} products
                  </span>
                </div>
                {cat.Description && <p className="text-sm text-gray-400 line-clamp-2 mb-3">{cat.Description}</p>}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(cat)} className="flex-1 text-sm font-medium py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">Edit</button>
                  <button onClick={() => handleDelete(cat.ROWID)} disabled={deleting === cat.ROWID}
                    className="text-sm font-medium py-2 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-all">
                    {deleting === cat.ROWID ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">{editId ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input type="text" value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" placeholder="e.g. Coconut Products" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm resize-none" placeholder="Brief description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={form.Image_URL} onChange={e => setForm({ ...form, Image_URL: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-xl transition-all text-sm">
                  {saving ? 'Saving...' : editId ? 'Update' : 'Add Category'}
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

export default AdminCategories;
