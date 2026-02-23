import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext();
const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

// VAPID public key for Web Push (generated once, matches backend private key)
const VAPID_PUBLIC_KEY = 'BJyNqcoYniSvYg2w1NJx9hiHQRrdVY0dkA0-LAnEhDdOIgdePw8My9AvRpGLfVmMLmaqHVLg13xLdhWTwBcwaFM';

// Convert URL-safe base64 to Uint8Array (needed for applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
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

  // ─── Web Push: Subscribe and send subscription to backend ───
  const subscribeToPush = useCallback(async (email) => {
    if (pushInitRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push: Browser does not support Web Push');
      return;
    }

    try {
      pushInitRef.current = true;

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Push: Service Worker registered');

      // Wait for the SW to be active
      const sw = registration.active || registration.waiting || registration.installing;
      if (sw && sw.state !== 'activated') {
        await new Promise((resolve) => {
          sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve(); });
        });
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push: Notification permission denied');
        pushInitRef.current = false;
        return;
      }

      // Subscribe to push
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('Push: New subscription created');
      } else {
        console.log('Push: Using existing subscription');
      }

      // Send subscription to backend
      const res = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subscription: subscription.toJSON() }),
      });
      const data = await res.json();
      if (data.success) {
        console.log('Push: Subscription saved to backend');
      } else {
        console.warn('Push: Failed to save subscription:', data.message);
        pushInitRef.current = false;
      }
    } catch (e) {
      console.error('Push subscription error:', e);
      pushInitRef.current = false;
    }
  }, []);

  // Listen for Service Worker messages (in-app push forwarding)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        const payload = event.data.payload;
        console.log('Push message received in-app:', payload);
        window.dispatchEvent(new CustomEvent('catalyst-push', { detail: payload }));
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Check auth on mount
  useEffect(() => {
    let cancelled = false;
    // Restore from localStorage immediately (fast paint)
    try {
      const saved = localStorage.getItem('ec_user');
      if (saved && !cancelled) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Subscribe to push for this user
        if (parsed?.Email) subscribeToPush(parsed.Email);
      }
    } catch { localStorage.removeItem('ec_user'); }
    if (!cancelled) setAuthLoading(false);

    return () => { cancelled = true; };
  }, [subscribeToPush]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ec_user', JSON.stringify(userData));
  }, []);

  // After login/signup, subscribe to push notifications
  const establishCatalystSession = useCallback(async (tokenData, email) => {
    // Store JWT for any future use
    if (tokenData) {
      localStorage.setItem('ec_jwt', JSON.stringify(tokenData));
    }
    // Subscribe to Web Push
    if (email) {
      pushInitRef.current = false; // Allow fresh subscription
      await subscribeToPush(email);
    }
  }, [subscribeToPush]);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ec_user');
    localStorage.removeItem('ec_jwt');
    localStorage.removeItem('cartItems');
    setCartItems([]);
    pushInitRef.current = false;
    // Unregister service worker push subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription())
        .then(sub => { if (sub) sub.unsubscribe(); })
        .catch(() => {});
    }
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
