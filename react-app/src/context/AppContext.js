import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext();

// ─── Show browser notification helper ───
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
  /* ─── User State ─── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const pushInitRef = useRef(false);

  /* ─── Auth Modal State ─── */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  // ─── Catalyst Push Notifications Setup ───
  const setupCatalystPush = useCallback(async (jwtToken) => {
    if (pushInitRef.current) return;
    try {
      pushInitRef.current = true;

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Establish Catalyst session with JWT
      if (jwtToken && window.catalyst?.auth?.signinWithJwt) {
        try {
          // Build the token details object
          let tokenDetails;
          if (typeof jwtToken === 'object') {
            tokenDetails = jwtToken;
            console.log('Catalyst: JWT token object keys:', Object.keys(jwtToken));
          } else {
            tokenDetails = { jwt_token: jwtToken };
          }
          console.log('Catalyst: calling signinWithJwt with async callback...');
          // signinWithJwt expects a CALLBACK that returns a Promise of token details
          const signInResult = await window.catalyst.auth.signinWithJwt(async () => tokenDetails);
          console.log('Catalyst: signinWithJwt result:', signInResult);
        } catch (e) {
          console.error('Catalyst: signinWithJwt error:', e.message || e, e);
        }
      } else {
        console.warn('Catalyst: No JWT token or signinWithJwt not available. jwtToken:', !!jwtToken, 'signinWithJwt:', !!window.catalyst?.auth?.signinWithJwt);
      }

      // Enable Catalyst Push Notifications (WebSocket-based real-time)
      if (window.catalyst?.notification?.enableNotification) {
        try {
          console.log('Catalyst: calling enableNotification...');
          const enableResult = await window.catalyst.notification.enableNotification();
          console.log('Catalyst: enableNotification result:', enableResult);

          // Handle incoming push messages — plays sound + shows browser notification
          window.catalyst.notification.messageHandler = (msg) => {
            console.log('Catalyst push received:', msg);
            try {
              const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
              window.dispatchEvent(new CustomEvent('catalyst-push', { detail: data }));
              playNotificationSound();
              showBrowserNotification(data);
            } catch (e) { console.error('Push message parse error:', e); }
          };
        } catch (e) {
          console.error('Catalyst: enableNotification failed:', e.message || e, e);
          pushInitRef.current = false;
        }
      } else {
        console.warn('Catalyst: notification API not available');
        pushInitRef.current = false;
      }
    } catch (e) {
      console.error('Catalyst push setup error:', e);
      pushInitRef.current = false;
    }
  }, []);

  // Check auth on mount — restore Catalyst push session
  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem('ec_user');
      if (saved && !cancelled) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Restore Catalyst push session from saved JWT
        const savedJwt = localStorage.getItem('ec_jwt');
        if (parsed?.Email) {
          const jwt = savedJwt ? JSON.parse(savedJwt) : null;
          setupCatalystPush(jwt);
        }
      }
    } catch { localStorage.removeItem('ec_user'); }
    if (!cancelled) setAuthLoading(false);

    return () => { cancelled = true; };
  }, [setupCatalystPush]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ec_user', JSON.stringify(userData));
  }, []);

  // After login/signup, establish Catalyst session for push notifications
  const establishCatalystSession = useCallback(async (tokenData, email) => {
    if (tokenData) {
      localStorage.setItem('ec_jwt', JSON.stringify(tokenData));
    }
    // Setup Catalyst Push with JWT token
    pushInitRef.current = false;
    await setupCatalystPush(tokenData);
  }, [setupCatalystPush]);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ec_user');
    localStorage.removeItem('ec_jwt');
    localStorage.removeItem('cartItems');
    setCartItems([]);
    pushInitRef.current = false;
    window.location.href = '/';
  }, []);

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
