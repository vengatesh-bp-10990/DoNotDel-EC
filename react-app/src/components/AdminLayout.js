import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

// Context so child pages can subscribe to new-order events
export const AdminNotificationContext = createContext(null);
export function useAdminNotifications() { return useContext(AdminNotificationContext); }

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { path: '/admin/orders', label: 'Orders', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
  )},
  { path: '/admin/products', label: 'Products', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  )},
  { path: '/admin/categories', label: 'Categories', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
  )},
];

function AdminLayout({ children }) {
  const { user, logoutUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef(null);

  const isAdmin = user?.Role === 'Admin';
  const notif = useOrderNotifications(isAdmin);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) setShowNotifPanel(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const currentLabel = NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Admin';

  return (
    <AdminNotificationContext.Provider value={notif}>
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>        
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-800 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white text-sm font-bold">🏠</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Homemade Products</p>
              <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Admin Console</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}>
                  <span className={isActive ? 'text-amber-400' : 'text-gray-500'}>{item.icon}</span>
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-800">
              <Link to="/" onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                View Storefront
              </Link>
            </div>
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{(user?.Name || 'A').charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.Name || 'Admin'}</p>
                <p className="text-gray-500 text-xs truncate">{user?.Email}</p>
              </div>
              <button onClick={handleLogout} title="Logout"
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifPanelRef}>
              <button onClick={() => { setShowNotifPanel(p => !p); if (!showNotifPanel) notif.markAllRead(); }}
                className="relative p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notif.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-sm">
                    {notif.unreadCount > 9 ? '9+' : notif.unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel Dropdown */}
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                    {notif.notifications.length > 0 && (
                      <button onClick={notif.clearAll} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear All</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notif.notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-sm font-medium">No notifications yet</p>
                        <p className="text-xs mt-1">New orders will appear here</p>
                      </div>
                    ) : (
                      notif.notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-amber-50/50 transition-colors border-b border-gray-50 last:border-0">
                          <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-base">🛒</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">New Order #{n.orderId?.slice(-4)}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {n.customerName || n.customerEmail || 'Customer'} — ₹{n.total?.toFixed(0)} ({n.itemCount} item{n.itemCount !== 1 ? 's' : ''})
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.time)}</p>
                          </div>
                          <button onClick={() => notif.dismissNotification(n.id)} className="p-1 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100 flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {notif.notifications.length > 0 && (
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                      <button onClick={() => { setShowNotifPanel(false); navigate('/admin/orders'); }}
                        className="w-full text-center text-xs font-semibold text-amber-600 hover:text-amber-700">
                        View All Orders →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Toast Notification — slides in from top-right */}
      {notif.latestOrder && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 sm:w-96">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <span className="text-white text-lg">🛒</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800">New Order Received!</p>
                  <button onClick={notif.dismissToast} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {notif.latestOrder.customerName || 'Customer'} placed an order for <span className="font-bold text-amber-600">₹{notif.latestOrder.total?.toFixed(0)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notif.latestOrder.itemCount} item{notif.latestOrder.itemCount !== 1 ? 's' : ''} — {notif.latestOrder.status}
                </p>
                <button onClick={() => { notif.dismissToast(); navigate('/admin/orders'); }}
                  className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  View Order <span>→</span>
                </button>
              </div>
            </div>
            {/* Progress bar auto-dismiss indicator */}
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-shrink-width" />
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminNotificationContext.Provider>
  );
}

// Human-readable time ago
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default AdminLayout;
