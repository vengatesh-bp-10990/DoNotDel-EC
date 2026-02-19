import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function';
const POLL_INTERVAL = 15000; // 15 seconds
const NOTIFICATION_SOUND_FREQ = 880; // A5 note

// Generate notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Play two-tone chime
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
    playTone(NOTIFICATION_SOUND_FREQ, now, 0.2);       // First chime
    playTone(NOTIFICATION_SOUND_FREQ * 1.5, now + 0.2, 0.3); // Second chime (higher)
    
    // Clean up after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Request browser notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

// Show native browser notification
function showBrowserNotification(title, body, onClick) {
  if (Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      icon: '🛒',
      badge: '🛒',
      tag: 'new-order',
      renotify: true,
      requireInteraction: false,
    });
    notification.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notification.close();
    };
    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch (e) {
    console.warn('Browser notification failed:', e);
  }
}

export function useOrderNotifications(isAdmin) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestOrder, setLatestOrder] = useState(null); // for toast
  const knownOrderIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const pollTimerRef = useRef(null);
  const onNewOrderCallbacks = useRef([]);

  // Subscribe to new order events
  const onNewOrder = useCallback((callback) => {
    onNewOrderCallbacks.current.push(callback);
    return () => {
      onNewOrderCallbacks.current = onNewOrderCallbacks.current.filter(cb => cb !== callback);
    };
  }, []);

  // Dismiss a notification
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Dismiss the toast
  const dismissToast = useCallback(() => {
    setLatestOrder(null);
  }, []);

  // Poll for new orders
  const checkForNewOrders = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders`);
      const data = await res.json();
      if (!data.success || !data.data) return;

      const currentIds = new Set(data.data.map(o => o.ROWID));

      if (isFirstLoad.current) {
        // First load — just record existing orders, don't notify
        knownOrderIds.current = currentIds;
        isFirstLoad.current = false;
        return;
      }

      // Find genuinely new orders
      const newOrders = data.data.filter(o => !knownOrderIds.current.has(o.ROWID));

      if (newOrders.length > 0) {
        // Update known IDs
        knownOrderIds.current = currentIds;

        // Create notification entries
        const newNotifs = newOrders.map(order => ({
          id: order.ROWID,
          orderId: order.ROWID,
          customerName: order.customerName || 'Customer',
          customerEmail: order.customerEmail || '',
          total: parseFloat(order.Total_Amount || 0),
          itemCount: (() => { try { return JSON.parse(order.Items || '[]').length; } catch { return 0; } })(),
          time: new Date(),
          status: order.Status || 'Pending',
        }));

        setNotifications(prev => [...newNotifs, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + newOrders.length);

        // Show toast for the latest new order
        setLatestOrder(newNotifs[0]);
        setTimeout(() => setLatestOrder(null), 6000);

        // Play sound
        playNotificationSound();

        // Browser notification
        if (newOrders.length === 1) {
          const o = newNotifs[0];
          showBrowserNotification(
            '🛒 New Order Received!',
            `${o.customerName || 'Customer'} placed an order for ₹${o.total.toFixed(0)} (${o.itemCount} item${o.itemCount !== 1 ? 's' : ''})`
          );
        } else {
          showBrowserNotification(
            `🛒 ${newOrders.length} New Orders!`,
            `You have ${newOrders.length} new orders to process.`
          );
        }

        // Notify subscribers (e.g., AdminOrders to auto-refresh)
        onNewOrderCallbacks.current.forEach(cb => cb(newOrders));
      } else {
        // Update known IDs (orders might have been deleted)
        knownOrderIds.current = currentIds;
      }
    } catch (e) {
      console.warn('Order poll failed:', e);
    }
  }, [isAdmin]);

  // Request permission on mount
  useEffect(() => {
    if (isAdmin) {
      requestNotificationPermission();
    }
  }, [isAdmin]);

  // Start polling
  useEffect(() => {
    if (!isAdmin) return;

    // Initial check
    checkForNewOrders();

    // Poll every POLL_INTERVAL
    pollTimerRef.current = setInterval(checkForNewOrders, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isAdmin, checkForNewOrders]);

  return {
    notifications,
    unreadCount,
    latestOrder,
    dismissNotification,
    dismissToast,
    clearAll,
    markAllRead,
    onNewOrder,
  };
}
