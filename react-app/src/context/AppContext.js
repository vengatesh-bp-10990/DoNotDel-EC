import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext();
const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';

function AppProvider({ children }) {
  /* ─── User State ─── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const pushInitRef = useRef(false);

  /* ─── Auth Modal State ─── */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  // Sync Catalyst user to our Datastore
  const syncUser = useCallback(async (catUser) => {
    try {
      const email = catUser.email_id || catUser.emailid || catUser.email;
      const firstName = catUser.first_name || catUser.firstName || '';
      const lastName = catUser.last_name || catUser.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'User';
      const catalystUserId = catUser.user_id || catUser.userid || catUser.userId || '';
      if (!email) throw new Error('No email from Catalyst auth');
      const res = await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, catalystUserId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('ec_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (e) { console.error('Sync user error:', e); }
    return null;
  }, []);

  // Enable Catalyst push notifications
  const enablePush = useCallback(() => {
    if (pushInitRef.current) return;
    const cat = window.catalyst;
    if (!cat?.notification) return;
    pushInitRef.current = true;
    try {
      cat.notification.enableNotification().then(() => {
        cat.notification.messageHandler = (msg) => {
          try {
            const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
            window.dispatchEvent(new CustomEvent('catalyst-push', { detail: data }));
          } catch {
            window.dispatchEvent(new CustomEvent('catalyst-push', { detail: { message: msg } }));
          }
        };
        console.log('Push notifications enabled');
      }).catch(e => console.error('Push enable failed:', e));
    } catch (e) { console.error('Push notification error:', e); }
  }, []);

  // Load Catalyst SDK init.js dynamically (prevents auto-login form on page load)
  const loadCatalystSDK = useCallback(() => {
    return new Promise((resolve) => {
      if (window.catalyst?.auth?.signinWithJwt) { resolve(true); return; }
      // Check if init.js script is already loading
      if (document.querySelector('script[src*="/__catalyst/sdk/init.js"]')) {
        const wait = () => {
          if (window.catalyst?.auth) resolve(true);
          else setTimeout(wait, 100);
        };
        setTimeout(wait, 200);
        return;
      }
      const s = document.createElement('script');
      s.src = '/__catalyst/sdk/init.js';
      s.onload = () => {
        const wait = () => {
          if (window.catalyst?.auth) resolve(true);
          else setTimeout(wait, 100);
        };
        setTimeout(wait, 200);
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }, []);

  // Check auth on mount — localStorage only (init.js not loaded yet to avoid auto-login)
  useEffect(() => {
    let cancelled = false;
    // Restore from localStorage immediately (fast paint)
    try {
      const saved = localStorage.getItem('ec_user');
      if (saved && !cancelled) {
        setUser(JSON.parse(saved));
        // For returning users, load SDK in background for push notifications
        loadCatalystSDK().then((ok) => {
          if (ok && !cancelled) enablePush();
        });
      }
    } catch { localStorage.removeItem('ec_user'); }
    if (!cancelled) setAuthLoading(false);
    return () => { cancelled = true; };
  }, [enablePush, loadCatalystSDK]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ec_user', JSON.stringify(userData));
    // Try to enable push notifications for this session
    enablePush();
  }, [enablePush]);

  // Establish a Catalyst Auth session using JWT from our backend (generateCustomToken)
  // This gives the user a proper Catalyst session — needed for push notifications
  const establishCatalystSession = useCallback(async (jwtToken) => {
    if (!jwtToken) return;
    // Load Catalyst SDK dynamically (if not already loaded)
    const sdkReady = await loadCatalystSDK();
    if (!sdkReady) { console.warn('Catalyst SDK failed to load'); return; }
    const cat = window.catalyst;
    if (!cat?.auth?.signinWithJwt) {
      console.warn('Catalyst SDK signinWithJwt not available');
      return;
    }
    try {
      await cat.auth.signinWithJwt(() => {
        return Promise.resolve({
          jwt_token: jwtToken,
        });
      });
      console.log('Catalyst JWT session established');
      // Now enable push with the new session
      pushInitRef.current = false;
      enablePush();
    } catch (e) {
      console.error('Catalyst JWT sign-in error:', e);
      // Don't block the user — they can still use the app, just no push
    }
  }, [enablePush, loadCatalystSDK]);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ec_user');
    localStorage.removeItem('cartItems');
    setCartItems([]);
    pushInitRef.current = false;
    try {
      if (window.catalyst?.auth?.signOut) {
        window.catalyst.auth.signOut(window.location.origin + '/');
        return;
      }
    } catch (e) { console.error('Catalyst signOut error:', e); }
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
