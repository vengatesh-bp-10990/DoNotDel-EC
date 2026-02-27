import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext();
const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

// ─── Browser Notification Helper ───
function showBrowserNotification(data) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    let title = 'Homemade Products';
    let body = 'You have a new notification';
    if (data.type === 'NEW_ORDER') {
      title = '\ud83d\uded2 New Order Received!';
      body = `${data.customerName || 'Customer'} \u2014 \u20b9${parseFloat(data.total || 0).toFixed(0)}`;
    } else if (data.type === 'ORDER_STATUS') {
      title = '\ud83d\udce6 Order Update';
      body = `Order #${data.orderId} \u2014 ${data.status}`;
    } else if (data.type === 'TEST') {
      title = data.title || '\ud83d\udd14 Test Notification';
      body = data.body || 'Notifications are working!';
    }
    const n = new Notification(title, { body, icon: '/logo192.png', tag: 'notif-' + Date.now(), renotify: true });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch (e) { console.error('Browser notification error:', e); }
}
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1320, now + 0.18, 0.25);
    setTimeout(() => ctx.close(), 1000);
  } catch (e) { /* sound not supported */ }
}

function AppProvider({ children }) {
  /* ─── User State (restored from localStorage on mount) ─── */
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ec_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);

  /* ─── Auth Modal State ─── */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  // ─── Notification Polling (Cache-based, toggle-controlled) ───
  const pollingRef = useRef(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => {
    try { return localStorage.getItem('ec_notif_enabled') === 'true'; } catch { return false; }
  });

  const startNotificationPolling = useCallback((email) => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (!email) return;

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    console.log('Notifications: polling started for', email);

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/check?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.success && data.notifications?.length > 0) {
          for (const notif of data.notifications) {
            window.dispatchEvent(new CustomEvent('catalyst-push', { detail: notif }));
            playNotificationSound();
            showBrowserNotification(notif);
          }
        }
      } catch (e) { /* polling error — ignore */ }
    };

    poll(); // Poll immediately
    pollingRef.current = setInterval(poll, 10000); // Then every 10s
  }, []);

  const stopNotificationPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  // Toggle notifications on/off
  const setNotificationsEnabled = useCallback((enabled) => {
    setNotificationsEnabledState(enabled);
    localStorage.setItem('ec_notif_enabled', enabled ? 'true' : 'false');
  }, []);

  // Start/stop polling based on toggle + user login
  useEffect(() => {
    if (notificationsEnabled && user?.Email) {
      startNotificationPolling(user.Email);
    } else {
      stopNotificationPolling();
    }
    return () => stopNotificationPolling();
  }, [notificationsEnabled, user?.Email, startNotificationPolling, stopNotificationPolling]);

  // ─── Auth Functions ───
  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ec_user', JSON.stringify(userData));
  }, []);

  // Kept for backward compatibility with Login/Signup pages
  const establishCatalystSession = useCallback(async (tokenData, email) => {
    console.log('Session established for', email);
  }, []);

  const logoutUser = useCallback(() => {
    stopNotificationPolling();
    setNotificationsEnabledState(false);
    setUser(null);
    localStorage.removeItem('ec_user');
    localStorage.removeItem('ec_jwt');
    localStorage.removeItem('ec_push_email');
    localStorage.removeItem('ec_notif_enabled');
    localStorage.removeItem('cartItems');
    setCartItems([]);
    window.location.href = '/';
  }, [stopNotificationPolling]);

  /* ─── Cart State ─── */
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cartItems');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  /* ─── Location State ─── */
  const [location, setLocationState] = useState(() => {
    try {
      const saved = localStorage.getItem('ec_location');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const setLocation = useCallback((loc) => {
    setLocationState(loc);
    if (loc) localStorage.setItem('ec_location', JSON.stringify(loc));
    else localStorage.removeItem('ec_location');
  }, []);

  // Lookup pincode from India Post API
  const lookupPincode = useCallback(async (pincode) => {
    if (!pincode || pincode.length !== 6) return null;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          pincode,
          city: po.District || po.Division || '',
          state: po.State || '',
          area: po.Name || '',
          postOffices: data[0].PostOffice,
        };
      }
    } catch (e) { console.error('Pincode lookup error:', e); }
    return null;
  }, []);

  // Auto-detect location on mount via geolocation → reverse geocode
  useEffect(() => {
    if (location) return; // Already have saved location
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data?.address || {};
          const pincode = addr.postcode || '';
          const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
          const state = addr.state || '';

          if (pincode) {
            setLocation({ pincode, city, state, lat: latitude, lng: longitude });
          }
        } catch (e) { console.error('Reverse geocode error:', e); }
      },
      () => { /* User denied geolocation — that's fine */ },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [location, setLocation]);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  function addToCart(product) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.ROWID === product.ROWID);
      if (existing) {
        return prev.map((item) =>
          item.ROWID === product.ROWID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCartItems((prev) => prev.filter((item) => item.ROWID !== productId));
  }

  function updateQuantity(productId, amount) {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.ROWID === productId
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  /* ─── Computed Values ─── */
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.Price) * item.quantity,
    0
  );
  const isAuthenticated = !!user;

  return (
    <AppContext.Provider
      value={{
        // Auth
        user,
        isAuthenticated,
        authLoading,
        loginUser,
        logoutUser,
        establishCatalystSession,
        // Auth Modal
        showAuthModal,
        openAuthModal,
        closeAuthModal,
        // Cart
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        // Notifications
        notificationsEnabled,
        setNotificationsEnabled,
        // Location
        location,
        setLocation,
        lookupPincode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export { AppProvider, useApp };
