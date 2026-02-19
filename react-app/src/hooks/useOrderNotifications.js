import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = '/server/do_not_del_ec_function';
const POLL_INTERVAL = 10000; // 10 seconds
const LS_KEY = 'admin_known_order_count';
const LS_NOTIFS_KEY = 'admin_notifications';
const LS_INIT_KEY = 'admin_notif_initialized';

// ─── Sound (Web Audio API — no external files) ───
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

// ─── Browser Notification ───
function showBrowserNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '🛒',
      tag: 'new-order-' + Date.now(),
      renotify: true,
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch (e) { /* notification not supported */ }
}

// ─── Persisted state helpers (all in localStorage to survive remounts) ───
function getStoredCount() {
  try { return parseInt(localStorage.getItem(LS_KEY) || '0'); } catch { return 0; }
}
function setStoredCount(c) {
  try { localStorage.setItem(LS_KEY, String(c)); } catch {}
}
function isInitialized() {
  try { return localStorage.getItem(LS_INIT_KEY) === 'true'; } catch { return false; }
}
function markInitialized() {
  try { localStorage.setItem(LS_INIT_KEY, 'true'); } catch {}
}
function getStoredNotifs() {
  try { return JSON.parse(localStorage.getItem(LS_NOTIFS_KEY) || '[]'); } catch { return []; }
}
function setStoredNotifs(arr) {
  try { localStorage.setItem(LS_NOTIFS_KEY, JSON.stringify(arr.slice(0, 30))); } catch {}
}

export function useOrderNotifications(isAdmin) {
  const [notifications, setNotifications] = useState(() => getStoredNotifs());
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestOrder, setLatestOrder] = useState(null);
  const pollTimerRef = useRef(null);
  const onNewOrderCallbacks = useRef([]);

  // Subscribe to new order events (for AdminOrders auto-refresh)
  const onNewOrder = useCallback((cb) => {
    onNewOrderCallbacks.current.push(cb);
    return () => { onNewOrderCallbacks.current = onNewOrderCallbacks.current.filter(c => c !== cb); };
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id);
      setStoredNotifs(next);
      return next;
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setStoredNotifs([]);
    setUnreadCount(0);
  }, []);

  const markAllRead = useCallback(() => { setUnreadCount(0); }, []);
  const dismissToast = useCallback(() => { setLatestOrder(null); }, []);

  // ─── Main poll function ───
  const checkForNewOrders = useCallback(async () => {
    if (!isAdmin) return;
    try {
      console.log('[Notif] Polling order-count...');
      const res = await fetch(`${API_BASE}/admin/order-count`);
      const data = await res.json();
      console.log('[Notif] Response:', data);
      if (!data.success) return;

      const currentCount = data.count || 0;
      const storedCount = getStoredCount();
      const alreadyInit = isInitialized();

      console.log(`[Notif] current=${currentCount}, stored=${storedCount}, initialized=${alreadyInit}`);

      // First time ever — just store the count, don't notify
      if (!alreadyInit) {
        console.log('[Notif] First time init — storing count, no notification');
        setStoredCount(currentCount);
        markInitialized();
        return;
      }

      if (currentCount > storedCount) {
        const newCount = currentCount - storedCount;
        console.log(`[Notif] 🔔 ${newCount} NEW order(s) detected!`);
        setStoredCount(currentCount);

        // Fetch full order details for the new orders
        try {
          const ordersRes = await fetch(`${API_BASE}/admin/orders`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.data) {
            const newOrders = ordersData.data.slice(0, newCount);

            const newNotifs = newOrders.map(o => ({
              id: o.ROWID,
              orderId: o.ROWID,
              customerName: o.customerName || o.customerEmail || 'Customer',
              total: parseFloat(o.Total_Amount || 0),
              itemCount: (() => { try { return (o.enrichedItems || JSON.parse(o.Items || '[]')).length; } catch { return 0; } })(),
              time: new Date().toISOString(),
              status: o.Status || 'Pending',
            }));

            setNotifications(prev => {
              const next = [...newNotifs, ...prev].slice(0, 30);
              setStoredNotifs(next);
              return next;
            });
            setUnreadCount(prev => prev + newCount);

            // Toast for latest
            setLatestOrder(newNotifs[0]);
            setTimeout(() => setLatestOrder(null), 6000);

            // Sound
            playNotificationSound();

            // Browser notification
            if (newCount === 1) {
              const o = newNotifs[0];
              showBrowserNotification(
                '🛒 New Order Received!',
                `${o.customerName} — ₹${o.total.toFixed(0)} (${o.itemCount} item${o.itemCount !== 1 ? 's' : ''})`
              );
            } else {
              showBrowserNotification('🛒 New Orders!', `${newCount} new orders received.`);
            }

            // Notify subscribers (AdminOrders auto-refresh)
            onNewOrderCallbacks.current.forEach(cb => cb(newOrders));
          }
        } catch (e) { console.warn('[Notif] Failed to fetch order details:', e); }
      } else if (currentCount < storedCount) {
        // Orders deleted — sync count down
        console.log('[Notif] Count decreased, syncing');
        setStoredCount(currentCount);
      }
    } catch (e) {
      console.warn('[Notif] Poll error:', e);
    }
  }, [isAdmin]);

  // Request browser notification permission
  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAdmin]);

  // Start polling
  useEffect(() => {
    if (!isAdmin) return;
    console.log('[Notif] Starting poll, interval:', POLL_INTERVAL);
    checkForNewOrders();
    pollTimerRef.current = setInterval(checkForNewOrders, POLL_INTERVAL);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [isAdmin, checkForNewOrders]);

  return { notifications, unreadCount, latestOrder, dismissNotification, dismissToast, clearAll, markAllRead, onNewOrder };
}
