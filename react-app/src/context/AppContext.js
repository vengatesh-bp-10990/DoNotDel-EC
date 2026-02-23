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

  // Check Catalyst auth on mount
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      // Restore from localStorage immediately (fast paint)
      try {
        const saved = localStorage.getItem('ec_user');
        if (saved && !cancelled) setUser(JSON.parse(saved));
      } catch { localStorage.removeItem('ec_user'); }

      const cat = window.catalyst;
      if (!cat?.auth) { if (!cancelled) setAuthLoading(false); return; }
      try {
        let catUser = null;
        if (typeof cat.auth.isUserAuthenticated === 'function') {
          catUser = await cat.auth.isUserAuthenticated();
        }
        if (!catUser && typeof cat.auth.getCurrentUser === 'function') {
          catUser = await cat.auth.getCurrentUser();
        }
        if (catUser && !cancelled) {
          await syncUser(catUser);
          enablePush();
        } else if (!cancelled) {
          setUser(null);
          localStorage.removeItem('ec_user');
        }
      } catch (e) {
        console.log('Catalyst auth check:', e.message || 'Not authenticated');
      }
      if (!cancelled) setAuthLoading(false);
    }
    const waitForSDK = () => {
      if (window.catalyst?.auth) { checkAuth(); }
      else { setTimeout(waitForSDK, 150); }
    };
    setTimeout(waitForSDK, 200);
    return () => { cancelled = true; };
  }, [syncUser, enablePush]);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ec_user', JSON.stringify(userData));
  }, []);

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
