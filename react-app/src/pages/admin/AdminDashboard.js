import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = '/server/do_not_del_ec_function';

function AdminDashboard() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    fetch(`${API_BASE}/admin/stats`)
      .then(r => r.json())
      .then(data => { if (data.success) setStats(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || user?.Role !== 'Admin') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: '📦', color: 'bg-blue-50 text-blue-600', link: '/admin/orders' },
    { label: 'Total Revenue', value: `₹${(stats?.totalRevenue || 0).toFixed(0)}`, icon: '💰', color: 'bg-emerald-50 text-emerald-600', link: '/admin/orders' },
    { label: 'Products', value: stats?.totalProducts || 0, icon: '🏷️', color: 'bg-amber-50 text-amber-600', link: '/admin/products' },
    { label: 'Customers', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-purple-50 text-purple-600', link: null },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: '⏳', color: 'bg-red-50 text-red-600', link: '/admin/orders' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back, {user?.Name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card, i) => {
          const Wrapper = card.link ? Link : 'div';
          const props = card.link ? { to: card.link } : {};
          return (
            <Wrapper key={i} {...props}
              className={`${card.color} rounded-2xl p-5 transition-all hover:shadow-lg cursor-pointer`}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="text-sm font-medium opacity-70 mt-1">{card.label}</p>
            </Wrapper>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/orders" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">Manage Orders</p>
            <p className="text-sm text-gray-400">View, update status, manage all orders</p>
          </div>
        </Link>
        <Link to="/admin/products" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">Manage Products</p>
            <p className="text-sm text-gray-400">Add, edit, delete products & stock</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default AdminDashboard;
