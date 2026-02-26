import { useState, useEffect, useRef, useCallback } from 'react';

const LS_NOTIFS_KEY = 'admin_notifications';

// ─── localStorage helpers ───
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

  // Request browser notification permission
  useEffect(() => {
    if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAdmin]);

  // ─── Push-only: listen for Catalyst push notifications (NO polling) ───
  useEffect(() => {
    if (!isAdmin) return;

    const handlePush = (e) => {
      const data = e.detail;
      if (data?.type === 'NEW_ORDER') {
        const notif = {
          id: data.orderId || Date.now(),
          orderId: data.orderId,
          customerName: data.customerName || 'Customer',
          total: parseFloat(data.total || 0),
          itemCount: data.itemCount || 0,
          time: new Date().toISOString(),
          status: 'Pending',
        };

        // Add to notification list
        setNotifications(prev => {
          const next = [notif, ...prev].slice(0, 30);
          setStoredNotifs(next);
          return next;
        });
        setUnreadCount(prev => prev + 1);

        // Toast
        setLatestOrder(notif);
        setTimeout(() => setLatestOrder(null), 6000);

        // Notify subscribers (AdminOrders will refresh its order list)
        onNewOrderCallbacks.current.forEach(cb => cb([data]));
      }
    };

    window.addEventListener('catalyst-push', handlePush);
    return () => window.removeEventListener('catalyst-push', handlePush);
  }, [isAdmin]);

  return { notifications, unreadCount, latestOrder, dismissNotification, dismissToast, clearAll, markAllRead, onNewOrder };
}
