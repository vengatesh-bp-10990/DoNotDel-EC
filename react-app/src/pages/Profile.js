import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

function Profile() {
  const { user, isAuthenticated, loginUser, openAuthModal } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.Name || '', phone: user?.Phone || '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">Sign in to view your profile</p>
          <button onClick={openAuthModal} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-all">Sign In</button>
        </div>
      </div>
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.ROWID, name: form.name, phone: form.phone }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, Name: form.name, Phone: form.phone };
        loginUser(updated);
        setMsg('Profile updated successfully!');
        setEditing(false);
      } else {
        setMsg(data.message || 'Update failed');
      }
    } catch { setMsg('Network error'); }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {(user.Name || user.Email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.Name || 'User'}</h2>
            <p className="text-white/80 text-sm">{user.Email}</p>
            {user.Role === 'Admin' && (
              <span className="inline-block mt-1 text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Admin</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {msg && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${msg.includes('success') ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {msg}
            </div>
          )}

          {!editing ? (
            <div className="space-y-4">
              <InfoRow label="Name" value={user.Name || '—'} />
              <InfoRow label="Email" value={user.Email} />
              <InfoRow label="Phone" value={user.Phone || 'Not set'} />
              <InfoRow label="Role" value={user.Role || 'Customer'} />
              <InfoRow label="User ID" value={user.ROWID} />
              <button onClick={() => { setEditing(true); setForm({ name: user.Name || '', phone: user.Phone || '' }); setMsg(''); }}
                className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition-all text-sm">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/orders" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <p className="font-bold text-gray-800">My Orders</p>
            <p className="text-sm text-gray-400">Track and manage orders</p>
          </div>
        </Link>
        <Link to="/" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          </div>
          <div>
            <p className="font-bold text-gray-800">Continue Shopping</p>
            <p className="text-sm text-gray-400">Browse our products</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default Profile;
