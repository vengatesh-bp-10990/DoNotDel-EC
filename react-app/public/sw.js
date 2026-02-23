/* Service Worker for Web Push Notifications */

self.addEventListener('push', (event) => {
  let data = { title: 'Homemade Products', body: 'You have a new notification' };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'hp-notification-' + Date.now(),
    renotify: true,
    data: data, // Pass full data to click handler
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Homemade Products', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  // Determine URL based on notification type
  let url = '/';
  if (data.type === 'NEW_ORDER') {
    url = '/admin/orders';
  } else if (data.type === 'ORDER_STATUS') {
    url = data.orderId ? `/order/${data.orderId}` : '/orders';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new tab
      return clients.openWindow(url);
    })
  );
});

// Also post message to open tabs so in-app notifications work
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      windowClients.forEach((client) => {
        client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
      });
    })
  );
});
