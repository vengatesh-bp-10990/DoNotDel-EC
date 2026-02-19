import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

function AdminDashboard() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.Role !== 'Admin') { navigate('/'); return; }
    Promise.all([
      fetch(`${API_BASE}/admin/stats`).then(r => r.json()),
      fetch(`${API_BASE}/admin/orders`).then(r => r.json()),
    ])
      .then(([statsData, ordersData]) => {
        if (statsData.success) setStats(statsData.data);
        if (ordersData.success) setRecentOrders((ordersData.data || []).slice(0, 5));
      })
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

  const STATUS_COLORS = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-indigo-100 text-indigo-700',
    Shipped: 'bg-purple-100 text-purple-700',
    Delivered: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-red-100 text-red-700',
  };

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: '📦', color: 'bg-blue-50 text-blue-600 border-blue-200', link: '/admin/orders' },
    { label: 'Revenue', value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', link: '/admin/orders' },
    { label: 'Products', value: stats?.totalProducts || 0, icon: '🏷️', color: 'bg-amber-50 text-amber-600 border-amber-200', link: '/admin/products' },
    { label: 'Categories', value: stats?.totalCategories || 0, icon: '📂', color: 'bg-cyan-50 text-cyan-600 border-cyan-200', link: '/admin/categories' },
    { label: 'Customers', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-purple-50 text-purple-600 border-purple-200', link: null },
    { label: 'Pending', value: stats?.pendingOrders || 0, icon: '⏳', color: 'bg-red-50 text-red-600 border-red-200', link: '/admin/orders' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Welcome back, {user?.Name}</h2>
        <p className="text-sm text-gray-400 mt-1">Here's what's happening with your store today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => {
          const Wrapper = card.link ? Link : 'div';
          const props = card.link ? { to: card.link } : {};
          return (
            <Wrapper key={i} {...props}
              className={`${card.color} border rounded-2xl p-4 transition-all hover:shadow-lg hover:scale-105 cursor-pointer`}>
              <div className="text-2xl mb-1">{card.icon}</div>
              <p className="text-2xl font-extrabold">{card.value}</p>
              <p className="text-xs font-medium opacity-70 mt-1">{card.label}</p>
            </Wrapper>
          );
        })}
      </div>

      {/* Quick Actions + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h3>
          {[
            { to: '/admin/orders', label: 'Manage Orders', desc: 'View & update order status', icon: '📦', bg: 'bg-blue-50' },
            { to: '/admin/products', label: 'Manage Products', desc: 'Add, edit & manage stock', icon: '🏷️', bg: 'bg-amber-50' },
            { to: '/admin/categories', label: 'Manage Categories', desc: 'Organize product categories', icon: '📂', bg: 'bg-cyan-50' },
          ].map((item, i) => (
            <Link key={i} to={item.to}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all flex items-center gap-3">
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center text-lg`}>
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs font-medium text-amber-600 hover:text-amber-700">View All →</Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No orders yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order, i) => {
                    const o = order.Orders || order;
                    const status = o.Status || 'Pending';
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">#{(o.ROWID || '').slice(-6)}</td>
                        <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">{o.Shipping_Name || 'N/A'}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">₹{parseFloat(o.Total_Amount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
