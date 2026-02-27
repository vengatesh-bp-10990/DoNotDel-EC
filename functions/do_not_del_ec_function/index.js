'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// Handle CORS preflight — Catalyst gateway adds ACAO headers on actual responses,
// so we only need to handle OPTIONS (preflight) ourselves to avoid duplicate headers.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    });
    return res.status(204).end();
  }
  next();
});

const ADMIN_EMAIL = 'vengi9360@gmail.com';
const CACHE_SEGMENT_ID = '21282000000050152';

const PRODUCTS_CACHE_KEY = 'all_products';
const NOTIF_PREFIX = 'notif_'; // Cache key prefix for notification queues
const CACHE_EXPIRY_HOURS = 1;
const SENDER_EMAIL = 'vengatesh.bp@zohocorp.com';
const STORE_NAME = 'Homemade Products';
const STORE_URL = 'https://homemade.onslate.in';
const AUTO_CONFIRM_MINUTES = 1; // Auto-confirm Pending orders after this many minutes

// Enable Nimbus for Stratus/Cache access
function initCatalyst(req) {
  const catalystApp = catalyst.initialize(req);
  catalystApp.isNimbusAllowed = true;
  return catalystApp;
}

// ─── Cache Helpers ───
async function getCachedProducts(catalystApp) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    const result = await segment.getValue(PRODUCTS_CACHE_KEY);
    if (result) return JSON.parse(result);
  } catch (e) { /* cache miss */ }
  return null;
}

async function setCachedProducts(catalystApp, data) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    try { await segment.delete(PRODUCTS_CACHE_KEY); } catch (e) { /* may not exist */ }
    await segment.put(PRODUCTS_CACHE_KEY, JSON.stringify(data), CACHE_EXPIRY_HOURS);
  } catch (e) { console.error('Cache set error:', e.message); }
}

async function clearProductsCache(catalystApp) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    await segment.delete(PRODUCTS_CACHE_KEY);
  } catch (e) { /* key may not exist */ }
}

// ─── Email Helpers ───
async function sendEmail(catalystApp, to, subject, htmlContent) {
  try {
    await catalystApp.email().sendMail({
      from_email: SENDER_EMAIL,
      to_email: to,
      subject,
      content: htmlContent,
      html_mode: true,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (e) { console.error(`Email send error to ${to}:`, e.message); }
}

function emailWrapper(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;">${STORE_NAME}</h1>
  </div>
  <div style="padding:32px;">${body}</div>
  <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${STORE_NAME} • <a href="${STORE_URL}" style="color:#f59e0b;">Visit Store</a></p>
  </div>
</div></body></html>`;
}

function orderPlacedEmail(customerName, orderId, total, items, address, paymentMethod) {
  const itemsHtml = items.map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;">${i.name}</td>
     <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14px;">${i.qty}</td>
     <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;">₹${(parseFloat(i.price||0)*parseInt(i.qty||1)).toFixed(0)}</td></tr>`
  ).join('');
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Order Confirmed! 🎉</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${customerName}, your order has been placed successfully.</p>
    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
      <table style="width:100%;font-size:13px;color:#6b7280;">
        <tr><td>Order ID</td><td style="text-align:right;font-weight:700;color:#111;">#${orderId}</td></tr>
        <tr><td>Payment</td><td style="text-align:right;font-weight:600;">${paymentMethod}</td></tr>
        <tr><td>Shipping To</td><td style="text-align:right;font-weight:600;">${address.substring(0,50)}${address.length>50?'...':''}</td></tr>
      </table>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr style="border-bottom:2px solid #e5e7eb;"><th style="text-align:left;padding:8px 0;font-size:12px;color:#9ca3af;">ITEM</th><th style="text-align:center;padding:8px 0;font-size:12px;color:#9ca3af;">QTY</th><th style="text-align:right;padding:8px 0;font-size:12px;color:#9ca3af;">PRICE</th></tr>
      ${itemsHtml}
    </table>
    <div style="text-align:right;font-size:18px;font-weight:800;color:#059669;margin-bottom:24px;">Total: ₹${parseFloat(total).toFixed(0)}</div>
    <div style="text-align:center;">
      <a href="${STORE_URL}/order/${orderId}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Track Your Order →</a>
    </div>
  `);
}

function statusUpdateEmail(customerName, orderId, newStatus, total) {
  const statusEmoji = { Confirmed:'✅', Processing:'⚙️', Shipped:'🚚', Delivered:'📦', Cancelled:'❌' };
  const statusMsg = {
    Confirmed: 'Your order has been confirmed and is being prepared.',
    Processing: 'Your order is being processed and will ship soon.',
    Shipped: 'Your order has been shipped! It\'s on the way.',
    Delivered: 'Your order has been delivered! Enjoy your purchase. 🎉',
    Cancelled: 'Your order has been cancelled. If you have questions, please contact us.',
  };
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">${statusEmoji[newStatus]||'📋'} Order Status Updated</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${customerName}, here's an update on your order.</p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Order #${orderId}</p>
      <div style="display:inline-block;background:${newStatus==='Cancelled'?'#fef2f2':'#ecfdf5'};color:${newStatus==='Cancelled'?'#dc2626':'#059669'};padding:8px 24px;border-radius:999px;font-size:16px;font-weight:700;">
        ${newStatus}
      </div>
      <p style="margin:12px 0 0;color:#6b7280;font-size:14px;">${statusMsg[newStatus]||'Your order status has been updated.'}</p>
    </div>
    <div style="text-align:center;">
      <a href="${STORE_URL}/order/${orderId}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">View Order Details →</a>
    </div>
  `);
}

function newProductEmail(customerName, product) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">🆕 New Product Alert!</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${customerName}, we just added something new you might love!</p>
    <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;margin-bottom:24px;">
      ${product.Image_URL ? `<img src="${product.Image_URL}" alt="${product.Name}" style="width:100%;height:200px;object-fit:cover;">` : ''}
      <div style="padding:20px;">
        <h3 style="margin:0 0 4px;font-size:18px;color:#111;">${product.Name}</h3>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">${product.Category || ''}</p>
        <p style="margin:0 0 12px;color:#6b7280;font-size:14px;line-height:1.5;">${(product.Description||'').substring(0,120)}${(product.Description||'').length>120?'...':''}</p>
        <div style="font-size:22px;font-weight:800;color:#059669;">₹${parseFloat(product.Price||0).toFixed(0)}</div>
      </div>
    </div>
    <div style="text-align:center;">
      <a href="${STORE_URL}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Shop Now →</a>
    </div>
  `);
}

function welcomeEmail(customerName) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;">🎉 Welcome to ${STORE_NAME}!</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Hi ${customerName}, thanks for joining us! We're thrilled to have you.</p>
    <div style="background:#f9fafb;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111;">Your account is ready 🚀</p>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">Browse our handmade collection, place orders, and track them in real-time. We can't wait to serve you!</p>
    </div>
    <div style="text-align:center;">
      <a href="${STORE_URL}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Start Shopping →</a>
    </div>
  `);
}

// ─── POST /google-auth ───
app.post('/google-auth', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential required' });
    const parts = credential.split('.');
    if (parts.length !== 3) return res.status(400).json({ success: false, message: 'Invalid credential' });
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const { email, name } = payload;
    if (!email) return res.status(400).json({ success: false, message: 'No email in token' });

    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    const existing = await zcql.executeZCQLQuery(`SELECT ROWID, Name, Email, Phone, Role FROM Users WHERE Email = '${email}'`);
    if (existing.length > 0) {
      const u = existing[0].Users;
      const role = (email.toLowerCase() === ADMIN_EMAIL) ? 'Admin' : (u.Role || 'Customer');
      if (role !== u.Role) await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Role: role });
      await ensureCatalystAuthUser(catalystApp, email, u.Name);
      const tokenData = await generateCatalystToken(catalystApp, email, u.Name);
      return res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: role }, tokenData });
    }
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'Admin' : 'Customer';
    const newUser = await catalystApp.datastore().table('Users').insertRow({ Name: name || email.split('@')[0], Email: email, Phone: '', Password_Hash: 'GOOGLE_AUTH', Role: role });
    const displayName = name || email.split('@')[0];
    await sendEmail(catalystApp, email, `Welcome to ${STORE_NAME}! 🎉`, welcomeEmail(displayName));
    await ensureCatalystAuthUser(catalystApp, email, displayName);
    const tokenData = await generateCatalystToken(catalystApp, email, displayName);
    res.status(201).json({ success: true, user: { ROWID: newUser.ROWID, Name: displayName, Email: email, Phone: '', Role: role }, tokenData });
  } catch (error) { console.error('Google auth error:', error); res.status(500).json({ success: false, message: 'Google auth failed' }); }
});

// ─── POST /signup ───
// Custom signup: creates user in Datastore + registers in Catalyst Auth + generates JWT for instant sign-in
app.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const catalystApp = initCatalyst(req);
    const existing = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID FROM Users WHERE Email = '${email}'`);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already registered. Please sign in instead.' });

    const hash = await bcrypt.hash(password, 10);
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'Admin' : 'Customer';
    const newUser = await catalystApp.datastore().table('Users').insertRow({ Name: name, Email: email, Phone: phone || '', Password_Hash: hash, Role: role });

    // Send welcome email
    await sendEmail(catalystApp, email, `Welcome to ${STORE_NAME}! 🎉`, welcomeEmail(name));
    // Register in Catalyst Auth (needed for push notifications)
    await ensureCatalystAuthUser(catalystApp, email, name);
    const tokenData = await generateCatalystToken(catalystApp, email, name);
    res.status(201).json({ success: true, message: 'Account created!', user: { ROWID: newUser.ROWID, Name: name, Email: email, Phone: phone || '', Role: role }, tokenData });
  } catch (error) { console.error('Signup error:', error); res.status(500).json({ success: false, message: 'Signup failed' }); }
});

// ─── POST /login ───
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const catalystApp = initCatalyst(req);
    const results = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID, Name, Email, Phone, Password_Hash, Role FROM Users WHERE Email = '${email}'`);
    if (results.length === 0) {
      // Auto-create admin account on first login attempt
      if (email.toLowerCase() === ADMIN_EMAIL) {
        const hash = await bcrypt.hash(password, 10);
        const newUser = await catalystApp.datastore().table('Users').insertRow({ Name: 'Admin', Email: email, Phone: '', Password_Hash: hash, Role: 'Admin' });
        await ensureCatalystAuthUser(catalystApp, email, 'Admin');
        const tokenData = await generateCatalystToken(catalystApp, email, 'Admin');
        return res.json({ success: true, user: { ROWID: newUser.ROWID, Name: 'Admin', Email: email, Phone: '', Role: 'Admin' }, tokenData });
      }
      return res.status(401).json({ success: false, message: 'No account found. Please sign up first.' });
    }
    const u = results[0].Users;
    // If account was created via Google, set the password now on first email/password login
    if (u.Password_Hash === 'GOOGLE_AUTH') {
      const hash = await bcrypt.hash(password, 10);
      const role = (email.toLowerCase() === ADMIN_EMAIL) ? 'Admin' : (u.Role || 'Customer');
      await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Password_Hash: hash, Role: role });
      await ensureCatalystAuthUser(catalystApp, u.Email, u.Name);
      const tokenData = await generateCatalystToken(catalystApp, u.Email, u.Name);
      return res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: role }, tokenData });
    }
    if (u.Password_Hash === 'CATALYST_AUTH') {
      // Legacy account without password — set it now
      const hash = await bcrypt.hash(password, 10);
      await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Password_Hash: hash });
    } else {
      if (!(await bcrypt.compare(password, u.Password_Hash))) return res.status(401).json({ success: false, message: 'Incorrect password' });
    }
    const role = (email.toLowerCase() === ADMIN_EMAIL) ? 'Admin' : (u.Role || 'Customer');
    if (role !== u.Role) await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Role: role });
    // Ensure user exists in Catalyst Auth (needed for push notifications)
    await ensureCatalystAuthUser(catalystApp, u.Email, u.Name);
    const tokenData = await generateCatalystToken(catalystApp, u.Email, u.Name);
    res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: role }, tokenData });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ success: false, message: 'Login failed' }); }
});

// ─── POST /auth/refresh-jwt ── Refresh JWT token for push notifications ───
app.post('/auth/refresh-jwt', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const catalystApp = initCatalyst(req);
    const results = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID, Name FROM Users WHERE Email = '${email}'`);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const u = results[0].Users;
    const tokenData = await generateCatalystToken(catalystApp, email, u.Name);
    if (!tokenData) return res.status(500).json({ success: false, message: 'Token generation failed' });
    res.json({ success: true, tokenData });
  } catch (error) {
    console.error('Refresh JWT error:', error);
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
});

// ─── POST /auth/sync ── Sync Catalyst Auth user to Datastore ───
app.post('/auth/sync', async (req, res) => {
  try {
    const { email, name, catalystUserId } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    const existing = await zcql.executeZCQLQuery(`SELECT ROWID, Name, Email, Phone, Role FROM Users WHERE Email = '${email}'`);
    if (existing.length > 0) {
      const u = existing[0].Users;
      const role = email.toLowerCase() === ADMIN_EMAIL ? 'Admin' : (u.Role || 'Customer');
      if (role !== u.Role) await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Role: role });
      const tokenData = await generateCatalystToken(catalystApp, email, u.Name);
      return res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: role }, tokenData });
    }
    // Create new user in Datastore
    const displayName = name || email.split('@')[0];
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'Admin' : 'Customer';
    const newUser = await catalystApp.datastore().table('Users').insertRow({
      Name: displayName, Email: email, Phone: '', Password_Hash: 'CATALYST_AUTH', Role: role
    });
    // Send welcome email for new users
    await sendEmail(catalystApp, email, `Welcome to ${STORE_NAME}! 🎉`, welcomeEmail(displayName));
    res.status(201).json({ success: true, user: { ROWID: newUser.ROWID, Name: displayName, Email: email, Phone: '', Role: role } });
  } catch (error) { console.error('Auth sync error:', error); res.status(500).json({ success: false, message: 'Auth sync failed' }); }
});

// ─── Notification Queue Cache Helpers ───
// Stores pending notifications per user in a JSON array in Cache
const NOTIF_EXPIRY_HOURS = 24; // Notifications expire after 24 hours

function notifCacheKey(email) {
  return NOTIF_PREFIX + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function addNotification(catalystApp, email, notification) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    const key = notifCacheKey(email);
    // Read existing queue
    let queue = [];
    try {
      const raw = await segment.getValue(key);
      if (raw) {
        const str = (typeof raw === 'string') ? raw : (raw.cache_value || raw.value || JSON.stringify(raw));
        queue = JSON.parse(str);
        if (!Array.isArray(queue)) queue = [];
      }
    } catch (e) { queue = []; }
    // Append new notification
    const notif = { ...notification, id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), time: new Date().toISOString() };
    queue.push(notif);
    // Keep max 50 notifications
    if (queue.length > 50) queue = queue.slice(-50);
    // Write back (delete first since Cache doesn't upsert)
    try { await segment.delete(key); } catch (e) { /* may not exist */ }
    await segment.put(key, JSON.stringify(queue), NOTIF_EXPIRY_HOURS);
    console.log(`Notif: added for ${email}, queue size: ${queue.length}, type: ${notification.type}`);
  } catch (e) {
    console.error('Notif: add error:', e.message);
  }
}

async function getAndClearNotifications(catalystApp, email) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    const key = notifCacheKey(email);
    const raw = await segment.getValue(key);
    if (!raw) return [];
    const str = (typeof raw === 'string') ? raw : (raw.cache_value || raw.value || JSON.stringify(raw));
    const queue = JSON.parse(str);
    if (!Array.isArray(queue) || queue.length === 0) return [];
    // Clear the queue
    try { await segment.delete(key); } catch (e) { /* ignore */ }
    console.log(`Notif: returned ${queue.length} notifications for ${email}`);
    return queue;
  } catch (e) {
    console.error('Notif: get error:', e.message);
    return [];
  }
}

async function deleteNotifications(catalystApp, email) {
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    await segment.delete(notifCacheKey(email));
  } catch (e) { /* may not exist */ }
}

// ─── Notification Check Endpoint (lightweight polling) ───
app.get('/notifications/check', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false, notifications: [] });
    const catalystApp = initCatalyst(req);
    const notifications = await getAndClearNotifications(catalystApp, email);
    res.json({ success: true, notifications });
  } catch (e) {
    console.error('Notification check error:', e.message);
    res.json({ success: true, notifications: [] });
  }
});

// ─── SSE Notification Stream ───
// Server-Sent Events endpoint for real-time notifications
app.get('/notifications/stream', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  const catalystApp = initCatalyst(req);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE connected' })}\n\n`);
  console.log(`SSE: connected for ${email}`);

  let alive = true;

  // Check for notifications every 5 seconds
  const checker = setInterval(async () => {
    if (!alive) return;
    try {
      const notifications = await getAndClearNotifications(catalystApp, email);
      if (notifications && notifications.length > 0) {
        for (const notif of notifications) {
          res.write(`data: ${JSON.stringify(notif)}\n\n`);
        }
        console.log(`SSE: sent ${notifications.length} notifications to ${email}`);
      }
    } catch (e) {
      console.error('SSE check error:', e.message);
    }
  }, 5000);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    if (!alive) return;
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      alive = false;
    }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    alive = false;
    clearInterval(checker);
    clearInterval(heartbeat);
    console.log(`SSE: disconnected for ${email}`);
  });
});

// ─── Test Notification Endpoint (with debug info) ───
app.post('/notifications/test', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email required' });
    const catalystApp = initCatalyst(req);
    const result = await notifyUsers(catalystApp, {
      type: 'TEST',
      title: '🔔 Test Notification',
      body: `Notifications are working for ${email}!`,
    }, [email]);
    res.json({ success: true, message: 'Test notification sent!', debug: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Helper: Send notification to users via Catalyst Push + Cache fallback ───
async function notifyUsers(catalystApp, message, emails) {
  if (!emails || emails.length === 0) return { pushResult: null, cached: false };
  // Store in cache queue as fallback for offline users
  for (const email of emails) {
    await addNotification(catalystApp, email, message);
  }
  // Send real-time push via Catalyst Push Notifications
  try {
    const result = await catalystApp.pushNotification().web().sendNotification(
      JSON.stringify(message),
      emails
    );
    console.log('Push: sent to', emails.join(', '), '| result:', JSON.stringify(result));
    return { pushResult: result, pushSuccess: true, cached: true };
  } catch (e) {
    console.error('Push send error:', e.message, '| status:', e.statusCode || 'N/A', '| full:', JSON.stringify(e));
    return { pushResult: null, pushError: e.message, pushSuccess: false, cached: true };
  }
}

// ─── Generate Catalyst JWT Token ───
// Generates a custom JWT for establishing a Catalyst Auth session on the client
async function generateCatalystToken(catalystApp, email, firstName) {
  try {
    const userManagement = catalystApp.userManagement();
    const token = await userManagement.generateCustomToken({
      type: 'web',
      user_details: {
        email_id: email,
        first_name: firstName || email.split('@')[0],
        last_name: ''
      }
    });
    console.log(`JWT generated for ${email}, type: ${typeof token}, full: ${JSON.stringify(token).substring(0, 300)}`);
    // token may be a string (just JWT) or an object { jwt_token, client_id, scopes, ... }
    // Always return as an object for the frontend
    if (typeof token === 'string') {
      return { jwt_token: token };
    }
    return token;
  } catch (e) {
    console.error(`JWT generation error for ${email}:`, e.message || e);
    return null;
  }
}

// ─── Catalyst Auth Registration Helper ───
// Registers a user in Catalyst Authentication (required for push notifications)
async function ensureCatalystAuthUser(catalystApp, email, firstName) {
  try {
    const signupConfig = {
      platform_type: 'web',
      redirect_url: STORE_URL + '/login',
      template_details: {
        senders_mail: SENDER_EMAIL,
        subject: `Set your password for ${STORE_NAME}`,
        message: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;">${STORE_NAME}</h1>
          </div>
          <div style="padding:32px;background:#fff;">
            <h2 style="margin:0 0 12px;color:#111;">Welcome! Set Your Password</h2>
            <p style="color:#6b7280;font-size:15px;">Hi ${firstName || 'there'},</p>
            <p style="color:#6b7280;font-size:15px;">Click the link below to set your password and activate your account:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="%LINK%" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Set Password</a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">Or copy this link: <a href="%LINK%" style="color:#f59e0b;">%LINK%</a></p>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px;">If you didn't create this account, you can ignore this email.</p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${STORE_NAME}</p>
          </div>
        </div>`
      }
    };
    const userConfig = {
      first_name: firstName || email.split('@')[0],
      last_name: '',
      email_id: email
    };
    await catalystApp.userManagement().registerUser(signupConfig, userConfig);
    console.log(`Catalyst Auth: Registered ${email}`);
    return true;
  } catch (e) {
    // User may already be registered — that's fine
    console.log(`Catalyst Auth note for ${email}:`, e.message || e);
    return false;
  }
}

// ─── Reset Password Helper ───
// Sends a password reset email via Catalyst Auth
app.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });

    const catalystApp = initCatalyst(req);
    await catalystApp.userManagement().resetPassword(email, {
      platform_type: 'web',
      redirect_url: STORE_URL + '/login',
      template_details: {
        senders_mail: SENDER_EMAIL,
        subject: `Reset your ${STORE_NAME} password`,
        message: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px 32px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#fff;font-size:22px;">${STORE_NAME}</h1>
          </div>
          <div style="padding:32px;background:#fff;">
            <h2 style="margin:0 0 12px;color:#111;">Reset Your Password</h2>
            <p style="color:#6b7280;font-size:15px;">We received a request to reset your password.</p>
            <p style="color:#6b7280;font-size:15px;">Click the link below to set a new password:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="%LINK%" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Reset Password</a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">Or copy this link: <a href="%LINK%" style="color:#f59e0b;">%LINK%</a></p>
            <p style="color:#9ca3af;font-size:13px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} ${STORE_NAME}</p>
          </div>
        </div>`
      }
    });

    res.json({ success: true, message: 'Password reset email sent. Check your inbox.' });
  } catch (error) {
    console.error('Reset password error:', error);
    // Don't reveal if the email exists or not for security
    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  }
});

// ─── PUT /profile ───
app.put('/profile', async (req, res) => {
  try {
    const { userId, name, phone } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
    const catalystApp = initCatalyst(req);
    const row = { ROWID: userId };
    if (name) row.Name = name;
    if (phone !== undefined) row.Phone = phone;
    await catalystApp.datastore().table('Users').updateRow(row);
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) { console.error('Profile error:', error); res.status(500).json({ success: false, message: 'Update failed' }); }
});

// ─── DELETE /account ── Permanently delete user account and all associated data ───
app.delete('/account', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) return res.status(400).json({ success: false, message: 'userId and email required' });

    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    const ds = catalystApp.datastore();

    // 1. Delete all orders for this user
    try {
      const orders = await zcql.executeZCQLQuery(`SELECT ROWID FROM Orders WHERE User_ID = '${userId}'`);
      if (orders.length > 0) {
        const orderIds = orders.map(r => (r.Orders || r).ROWID);
        // Delete in batches (Catalyst limit)
        for (const id of orderIds) {
          try { await ds.table('Orders').deleteRow(id); } catch (e) { console.log(`Delete order ${id}:`, e.message); }
        }
        console.log(`Deleted ${orderIds.length} orders for user ${userId}`);
      }
    } catch (e) { console.log('Order deletion note:', e.message); }

    // 2. Delete user row from Datastore
    try {
      await ds.table('Users').deleteRow(userId);
      console.log(`Deleted user ${userId} (${email}) from Datastore`);
    } catch (e) { console.error('User delete error:', e.message); }

    // 3. Remove notifications from cache
    await deleteNotifications(catalystApp, email);

    // 4. Try to delete from Catalyst Auth (best effort)
    try {
      const authUsers = await catalystApp.userManagement().getAllUsers();
      const authUser = authUsers?.find(u => (u.email_id || u.email || '').toLowerCase() === email.toLowerCase());
      if (authUser) {
        await catalystApp.userManagement().deleteUser(authUser.user_id || authUser.userId);
        console.log(`Deleted ${email} from Catalyst Auth`);
      }
    } catch (e) { console.log('Auth user deletion note:', e.message); }

    res.json({ success: true, message: 'Account deleted permanently' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, message: 'Account deletion failed. Please try again.' });
  }
});

// ─── GET /products (with Cache) ───
app.get('/products', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    // Try cache first
    const cached = await getCachedProducts(catalystApp);
    if (cached) return res.json({ success: true, data: cached, source: 'cache' });
    // Cache miss — fetch from Datastore
    const data = await catalystApp.zcql().executeZCQLQuery('SELECT * FROM Products');
    // Store in cache for next time
    await setCachedProducts(catalystApp, data);
    res.json({ success: true, data, source: 'datastore' });
  } catch (error) { console.error('Products error:', error); res.status(500).json({ success: false, message: 'Failed to fetch products' }); }
});

// ─── POST /orders ───
app.post('/orders', async (req, res) => {
  try {
    const { User_ID, Total_Amount, Shipping_Address, Items, Payment_Method } = req.body;
    if (!User_ID || !Total_Amount || !Shipping_Address) return res.status(400).json({ success: false, message: 'Required fields missing' });
    const catalystApp = initCatalyst(req);
    const newOrder = await catalystApp.datastore().table('Orders').insertRow({
      User_ID, Total_Amount, Shipping_Address, Status: 'Pending',
      Items: Items ? JSON.stringify(Items) : '[]',
      Payment_Method: Payment_Method || 'COD'
    });

    // Send order confirmation email BEFORE response (so it completes before function exits)
    try {
      const userRes = await catalystApp.zcql().executeZCQLQuery(`SELECT Name, Email FROM Users WHERE ROWID = '${User_ID}'`);
      if (userRes.length > 0) {
        const user = userRes[0].Users || userRes[0];
        const items = Items || [];
        const html = orderPlacedEmail(user.Name, newOrder.ROWID, Total_Amount, items, Shipping_Address, Payment_Method || 'COD');
        await sendEmail(catalystApp, user.Email, `Order #${newOrder.ROWID} Placed - ${STORE_NAME}`, html);
        // Notify admin about new order
        await notifyUsers(catalystApp, { type: 'NEW_ORDER', orderId: newOrder.ROWID, total: Total_Amount, customerName: user.Name, itemCount: (Items || []).length }, [ADMIN_EMAIL]);
      }
    } catch (emailErr) { console.error('Order email error:', emailErr.message); }

    res.status(201).json({ success: true, message: 'Order placed!', data: newOrder });
  } catch (error) { console.error('Order error:', error); res.status(500).json({ success: false, message: error.message || 'Failed to create order' }); }
});

// ─── GET /orders/:userId ───
app.get('/orders/:userId', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const data = await catalystApp.zcql().executeZCQLQuery(`SELECT * FROM Orders WHERE User_ID = '${req.params.userId}' ORDER BY CREATEDTIME DESC`);
    res.json({ success: true, data });
  } catch (error) { console.error('Get orders error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /order/:orderId ───
app.get('/order/:orderId', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const data = await catalystApp.zcql().executeZCQLQuery(`SELECT * FROM Orders WHERE ROWID = '${req.params.orderId}'`);
    if (data.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: data[0] });
  } catch (error) { console.error('Get order error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /invoice/:orderId ─── Generate PDF invoice using SmartBrowz template
app.get('/invoice/:orderId', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();

    // Fetch order
    const orderRows = await zcql.executeZCQLQuery(`SELECT * FROM Orders WHERE ROWID = '${req.params.orderId}'`);
    if (orderRows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderRows[0].Orders || orderRows[0];

    // Fetch customer
    let customerName = 'Customer';
    try {
      const userRows = await zcql.executeZCQLQuery(`SELECT Name, Email FROM Users WHERE ROWID = '${order.User_ID}'`);
      if (userRows.length > 0) customerName = (userRows[0].Users || userRows[0]).Name || 'Customer';
    } catch (e) { /* fallback */ }

    // Parse items
    let items = [];
    try { items = JSON.parse(order.Items || '[]'); } catch {}

    const subTotal = items.reduce((s, i) => s + (parseFloat(i.price || 0) * (i.qty || 1)), 0);
    const total = parseFloat(order.Total_Amount || subTotal);
    const shippingCharge = 0;
    const tax = Math.max(0, total - subTotal - shippingCharge);
    const paymentMethod = order.Payment_Method || 'COD';
    const shippingAddress = order.Shipping_Address || 'Not provided';

    // Build template data — must match SmartBrowz template variables exactly
    const templateData = {
      customer_name: customerName,
      order_id: order.ROWID,
      order_date: order.CREATEDTIME
        ? new Date(order.CREATEDTIME).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      products: items.map(i => ({
        name: i.name || 'Product',
        unit: 'Qty',
        quantity: String(i.qty || 1),
        price: (parseFloat(i.price || 0) * (i.qty || 1)).toFixed(2),
      })),
      sub_total: subTotal.toFixed(2),
      shipment_charge: shippingCharge.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      billing_address: shippingAddress,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      shipping_method: 'Standard Delivery',
    };

    // Generate PDF using SmartBrowz template
    const TEMPLATE_ID = '644000000005024';
    const smartbrowz = catalystApp.smartbrowz();
    const pdfStream = await smartbrowz.generateFromTemplate(TEMPLATE_ID, {
      template_data: templateData,
      output_options: { output_type: 'pdf' },
      pdf_options: { format: 'A4', print_background: true },
    });

    // Stream the PDF to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.ROWID}.pdf"`);
    pdfStream.pipe(res);
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate invoice' });
  }
});

// ──────── ADMIN ────────

// ─── GET /admin/order-count ─── (lightweight polling endpoint)
app.get('/admin/order-count', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    // Use SELECT ROWID to get all order IDs — reliable count
    const allRows = await zcql.executeZCQLQuery('SELECT ROWID, CREATEDTIME, Total_Amount FROM Orders ORDER BY CREATEDTIME DESC');
    const count = allRows.length;
    const latest = allRows[0]?.Orders || allRows[0] || null;
    res.json({ success: true, count, latestId: latest?.ROWID || null, latestTime: latest?.CREATEDTIME || null, latestAmount: latest?.Total_Amount || null });
  } catch (error) { res.status(500).json({ success: false, count: 0 }); }
});

// ─── GET /admin/orders ───
app.get('/admin/orders', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    const orderRows = await zcql.executeZCQLQuery('SELECT * FROM Orders ORDER BY CREATEDTIME DESC');
    // Fetch all users to map User_ID → user details
    const userRows = await zcql.executeZCQLQuery('SELECT ROWID, Name, Email, Phone FROM Users');
    const userMap = {};
    userRows.forEach(r => { const u = r.Users || r; userMap[u.ROWID] = u; });
    // Fetch all products to map id → product details (image etc)
    const prodRows = await zcql.executeZCQLQuery('SELECT ROWID, Name, Image_URL, Price, Stock_Quantity FROM Products');
    const prodMap = {};
    prodRows.forEach(r => { const p = r.Products || r; prodMap[p.ROWID] = p; });
    // Enrich orders
    const enriched = orderRows.map(row => {
      const o = row.Orders || row;
      const customer = userMap[o.User_ID] || {};
      let items = [];
      try { items = JSON.parse(o.Items || '[]'); } catch {}
      const enrichedItems = items.map(item => {
        const prod = prodMap[item.id] || {};
        return { ...item, image: item.image || prod.Image_URL || '', productName: prod.Name || item.name, availableStock: parseInt(prod.Stock_Quantity || 0) };
      });
      return { ...o, customerName: customer.Name || '', customerEmail: customer.Email || '', customerPhone: customer.Phone || '', enrichedItems };
    });
    res.json({ success: true, data: enriched });
  } catch (error) { console.error('Admin orders error:', error); res.status(500).json({ success: false, message: error.message || 'Failed' }); }
});

// ─── PUT /admin/order-status ───
app.put('/admin/order-status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ success: false, message: 'orderId, status required' });
    const catalystApp = initCatalyst(req);
    await catalystApp.datastore().table('Orders').updateRow({ ROWID: orderId, Status: status });

    // Send status update email BEFORE response
    try {
      const orderRes = await catalystApp.zcql().executeZCQLQuery(`SELECT User_ID, Total_Amount FROM Orders WHERE ROWID = '${orderId}'`);
      if (orderRes.length > 0) {
        const order = orderRes[0].Orders || orderRes[0];
        const userRes = await catalystApp.zcql().executeZCQLQuery(`SELECT Name, Email FROM Users WHERE ROWID = '${order.User_ID}'`);
        if (userRes.length > 0) {
          const user = userRes[0].Users || userRes[0];
          const html = statusUpdateEmail(user.Name, orderId, status, order.Total_Amount);
          await sendEmail(catalystApp, user.Email, `Order #${orderId} ${status} - ${STORE_NAME}`, html);
          // Notify customer about status change
          await notifyUsers(catalystApp, { type: 'ORDER_STATUS', orderId, status }, [user.Email]);
        }
      }
    } catch (emailErr) { console.error('Status email error:', emailErr.message); }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── PUT /admin/order-items ── update item quantities & recalc total ───
app.put('/admin/order-items', async (req, res) => {
  try {
    const { orderId, items } = req.body;
    if (!orderId || !items) return res.status(400).json({ success: false, message: 'orderId, items required' });
    const newTotal = items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.qty || 1)), 0);
    const catalystApp = initCatalyst(req);
    await catalystApp.datastore().table('Orders').updateRow({ ROWID: orderId, Items: JSON.stringify(items), Total_Amount: newTotal });
    res.json({ success: true, message: 'Order items updated', total: newTotal });
  } catch (error) { console.error('Update order items error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── POST /admin/setup-auth ─── Register admin in Catalyst Auth (one-time)
app.post('/admin/setup-auth', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const registered = await ensureCatalystAuthUser(catalystApp, ADMIN_EMAIL, 'Admin');
    res.json({ success: true, message: `Admin auth setup ${registered ? 'completed' : 'already done'}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ──────── CATEGORY CRUD ────────

// ─── POST /admin/auto-confirm ─── Auto-confirm a single pending order
app.post('/admin/auto-confirm', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();

    // Verify order is still Pending
    const orderRes = await zcql.executeZCQLQuery(`SELECT ROWID, Status, User_ID, Total_Amount, CREATEDTIME FROM Orders WHERE ROWID = '${orderId}'`);
    if (!orderRes.length) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderRes[0].Orders || orderRes[0];
    if (order.Status !== 'Pending') return res.json({ success: true, message: 'Already confirmed', status: order.Status });

    // Update to Confirmed
    await catalystApp.datastore().table('Orders').updateRow({ ROWID: orderId, Status: 'Confirmed' });
    console.log(`Order #${orderId} auto-confirmed via API`);

    // Send email BEFORE response
    try {
      const userRes = await zcql.executeZCQLQuery(`SELECT Name, Email FROM Users WHERE ROWID = '${order.User_ID}'`);
      if (userRes.length > 0) {
        const user = userRes[0].Users || userRes[0];
        const html = statusUpdateEmail(user.Name, orderId, 'Confirmed', order.Total_Amount);
        await sendEmail(catalystApp, user.Email, `Order #${orderId} Auto-Confirmed - ${STORE_NAME}`, html);
        // Notify customer about auto-confirm
        await notifyUsers(catalystApp, { type: 'ORDER_STATUS', orderId, status: 'Confirmed' }, [user.Email]);
      }
    } catch (emailErr) { console.error('Auto-confirm email error:', emailErr.message); }

    res.json({ success: true, message: 'Auto-confirmed', status: 'Confirmed' });
  } catch (error) { console.error('Auto-confirm error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /admin/categories ───
app.get('/admin/categories', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    let data = [];
    try {
      data = await zcql.executeZCQLQuery('SELECT * FROM Categories');
    } catch (e) { /* Categories table may not exist */ }

    // If Categories table is empty, derive from Products and auto-insert
    if (data.length === 0) {
      try {
        const products = await zcql.executeZCQLQuery('SELECT Category FROM Products');
        const uniqueCats = [...new Set(products.map(p => (p.Products || p).Category).filter(Boolean))];
        if (uniqueCats.length > 0) {
          const table = catalystApp.datastore().table('Categories');
          for (const name of uniqueCats) {
            try { await table.insertRow({ Category_Name: name, Description: '', Image_URL: '' }); } catch (e) { /* skip */ }
          }
          data = await zcql.executeZCQLQuery('SELECT * FROM Categories');
        }
      } catch (e) { console.error('Category sync error:', e.message); }
    }
    // Normalize: add a Name field mapped from Category_Name for frontend compatibility
    const normalized = data.map(row => {
      const c = row.Categories || row;
      return { ...c, Name: c.Category_Name || c.Name || '' };
    });
    res.json({ success: true, data: normalized });
  } catch (error) { console.error('Fetch categories error:', error.message); res.status(500).json({ success: false, message: error.message || 'Failed to fetch categories' }); }
});

// ─── POST /admin/category ───
app.post('/admin/category', async (req, res) => {
  try {
    const { Name, Description, Image_URL } = req.body;
    if (!Name) return res.status(400).json({ success: false, message: 'Name required' });
    const catalystApp = initCatalyst(req);
    const cat = await catalystApp.datastore().table('Categories').insertRow({ Category_Name: Name, Description: Description || '', Image_URL: Image_URL || '' });
    res.status(201).json({ success: true, data: { ...cat, Name: Name } });
  } catch (error) { console.error('Category create error:', error.message); res.status(500).json({ success: false, message: error.message || 'Failed to create category' }); }
});

// ─── PUT /admin/category ───
app.put('/admin/category', async (req, res) => {
  try {
    const { ROWID, Name, Description, Image_URL } = req.body;
    if (!ROWID) return res.status(400).json({ success: false, message: 'ROWID required' });
    const catalystApp = initCatalyst(req);
    const updateData = { ROWID };
    if (Name !== undefined) updateData.Category_Name = Name;
    if (Description !== undefined) updateData.Description = Description;
    if (Image_URL !== undefined) updateData.Image_URL = Image_URL;
    await catalystApp.datastore().table('Categories').updateRow(updateData);
    res.json({ success: true, message: 'Category updated' });
  } catch (error) { res.status(500).json({ success: false, message: error.message || 'Failed' }); }
});

// ─── DELETE /admin/category/:id ───
app.delete('/admin/category/:id', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    await catalystApp.datastore().table('Categories').deleteRow(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── POST /admin/product ───
app.post('/admin/product', async (req, res) => {
  try {
    const { Name, Description, Price, Category, Image_URL, Stock_Quantity } = req.body;
    if (!Name || !Price || !Category) return res.status(400).json({ success: false, message: 'Name, Price, Category required' });
    const catalystApp = initCatalyst(req);
    const p = await catalystApp.datastore().table('Products').insertRow({ Name, Description: Description || '', Price, Category, Image_URL: Image_URL || '', Stock_Quantity: Stock_Quantity || 0 });
    await clearProductsCache(catalystApp);

    // Send new product email to ALL users BEFORE response
    try {
      const allUsers = await catalystApp.zcql().executeZCQLQuery('SELECT Name, Email FROM Users');
      const product = { Name, Description, Price, Category, Image_URL };
      for (const row of allUsers) {
        const u = row.Users || row;
        const html = newProductEmail(u.Name, product);
        await sendEmail(catalystApp, u.Email, `New Product: ${Name} - ${STORE_NAME}`, html);
      }
    } catch (emailErr) { console.error('New product email error:', emailErr.message); }

    res.status(201).json({ success: true, data: p });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── PUT /admin/product ───
app.put('/admin/product', async (req, res) => {
  try {
    const { ROWID, ...fields } = req.body;
    if (!ROWID) return res.status(400).json({ success: false, message: 'ROWID required' });
    const catalystApp = initCatalyst(req);
    await catalystApp.datastore().table('Products').updateRow({ ROWID, ...fields });
    await clearProductsCache(catalystApp);
    res.json({ success: true, message: 'Product updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── DELETE /admin/product/:id ───
app.delete('/admin/product/:id', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    await catalystApp.datastore().table('Products').deleteRow(req.params.id);
    await clearProductsCache(catalystApp);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /admin/stats ───
app.get('/admin/stats', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const z = catalystApp.zcql();
    const [orders, products, users] = await Promise.all([
      z.executeZCQLQuery('SELECT ROWID, Total_Amount, Status FROM Orders'),
      z.executeZCQLQuery('SELECT ROWID FROM Products'),
      z.executeZCQLQuery('SELECT ROWID FROM Users'),
    ]);
    const revenue = orders.reduce((s, o) => s + parseFloat(o.Orders?.Total_Amount || 0), 0);
    const pending = orders.filter(o => o.Orders?.Status === 'Pending').length;
    res.json({ success: true, data: { totalOrders: orders.length, totalProducts: products.length, totalUsers: users.length, totalRevenue: revenue, pendingOrders: pending } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /cache-test ─── (diagnostic for cache)
app.get('/cache-test', async (req, res) => {
  const catalystApp = initCatalyst(req);
  const results = { segmentId: CACHE_SEGMENT_ID };
  try {
    const segment = catalystApp.cache().segment(CACHE_SEGMENT_ID);
    results.segmentOk = true;
    try {
      await segment.put('test_key', 'hello_world', 1);
      results.putOk = true;
    } catch (e) { results.putError = e.message; }
    try {
      const val = await segment.getValue('test_key');
      results.getResult = val;
    } catch (e) { results.getError = e.message; }
    try {
      await segment.delete('test_key');
      results.deleteOk = true;
    } catch (e) { results.deleteError = e.message; }
  } catch (e) { results.segmentError = e.message; }
  res.json(results);
});

// ─── GET /migrate-images ─── (one-time: update coconut oil images to Stratus URL)
app.get('/migrate-images', async (req, res) => {
  res.json({ success: true, message: 'Deprecated. Use /seed instead.' });
});

// ─── POST /seed/reset ─── Clear ALL old data and re-seed categories + products
app.post('/seed/reset', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const zcql = catalystApp.zcql();
    const ds = catalystApp.datastore();
    const log = [];

    // 1. Delete all old orders
    try {
      const rows = await zcql.executeZCQLQuery('SELECT ROWID FROM Orders');
      if (rows.length > 0) {
        const ids = rows.map(r => (r.Orders || r).ROWID);
        for (const id of ids) await ds.table('Orders').deleteRow(id);
      }
      log.push(`Deleted ${rows.length} orders`);
    } catch (e) { log.push('Orders delete: ' + e.message); }

    // 2. Delete all cart items
    try {
      const rows = await zcql.executeZCQLQuery('SELECT ROWID FROM Cart');
      if (rows.length > 0) {
        const ids = rows.map(r => (r.Cart || r).ROWID);
        for (const id of ids) await ds.table('Cart').deleteRow(id);
      }
      log.push(`Deleted ${rows.length} cart items`);
    } catch (e) { log.push('Cart delete: ' + e.message); }

    // 3. Delete all old products
    try {
      const rows = await zcql.executeZCQLQuery('SELECT ROWID FROM Products');
      if (rows.length > 0) {
        const ids = rows.map(r => (r.Products || r).ROWID);
        for (const id of ids) await ds.table('Products').deleteRow(id);
      }
      log.push(`Deleted ${rows.length} products`);
    } catch (e) { log.push('Products delete: ' + e.message); }

    // 4. Delete all old categories
    try {
      const rows = await zcql.executeZCQLQuery('SELECT ROWID FROM Categories');
      if (rows.length > 0) {
        const ids = rows.map(r => (r.Categories || r).ROWID);
        for (const id of ids) await ds.table('Categories').deleteRow(id);
      }
      log.push(`Deleted ${rows.length} categories`);
    } catch (e) { log.push('Categories delete: ' + e.message); }

    // 5. Seed new categories
    const categories = [
      { Category_Name: 'Oils', Description: 'Pure cold-pressed & traditional cooking oils', Image_URL: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600' },
      { Category_Name: 'Ghees', Description: 'Homemade pure ghee from farm-fresh milk', Image_URL: 'https://images.unsplash.com/photo-1631963637200-f571aa6c1305?w=600' },
      { Category_Name: 'Pattu Sarees', Description: 'Handwoven Kanchipuram silk sarees', Image_URL: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600' },
      { Category_Name: 'Night Wears', Description: 'Comfortable nightwear for women', Image_URL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600' },
      { Category_Name: 'Coconuts', Description: 'Fresh coconuts & unpeeled coconuts', Image_URL: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=600' },
    ];
    const catTable = ds.table('Categories');
    for (const c of categories) await catTable.insertRow(c);
    log.push(`Seeded ${categories.length} categories`);

    // 6. Seed new products
    const products = [
      // Oils
      { Name: 'Cold-Pressed Coconut Oil', Description: 'Pure cold-pressed coconut oil from fresh Kerala coconuts. Chemical-free, retains natural nutrients.', Price: 350, Category: 'Oils', Image_URL: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600', Stock_Quantity: 50 },
      { Name: 'Groundnut Oil', Description: 'Farm-fresh cold-pressed groundnut oil for traditional South Indian cooking.', Price: 320, Category: 'Oils', Image_URL: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600', Stock_Quantity: 45 },
      { Name: 'Gingelly Oil (Sesame Oil)', Description: 'Pure gingelly oil, perfect for pickles, seasoning & traditional cooking.', Price: 380, Category: 'Oils', Image_URL: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600', Stock_Quantity: 40 },
      { Name: 'Castor Oil', Description: 'Cold-pressed castor oil for hair care, skin care & medicinal use.', Price: 280, Category: 'Oils', Image_URL: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600', Stock_Quantity: 35 },

      // Ghees
      { Name: 'Homemade Pure Cow Ghee', Description: 'Traditional homemade ghee from pure cow milk. Rich aroma & golden color.', Price: 650, Category: 'Ghees', Image_URL: 'https://images.unsplash.com/photo-1631963637200-f571aa6c1305?w=600', Stock_Quantity: 25 },
      { Name: 'Homemade Buffalo Ghee', Description: 'Premium buffalo ghee, hand-churned for authentic taste. Perfect for sweets & cooking.', Price: 550, Category: 'Ghees', Image_URL: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600', Stock_Quantity: 20 },

      // Pattu Sarees
      { Name: 'Kanchipuram Pattu Saree - Maroon', Description: 'Authentic Kanchipuram silk saree with gold zari border. Handwoven by master weavers.', Price: 4500, Category: 'Pattu Sarees', Image_URL: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600', Stock_Quantity: 10 },
      { Name: 'Kanchipuram Pattu Saree - Royal Blue', Description: 'Elegant royal blue Kanchipuram silk with intricate temple border design.', Price: 5200, Category: 'Pattu Sarees', Image_URL: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', Stock_Quantity: 8 },
      { Name: 'Kanchipuram Pattu Saree - Green Gold', Description: 'Traditional green & gold Kanchipuram silk saree. Wedding collection.', Price: 6000, Category: 'Pattu Sarees', Image_URL: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600', Stock_Quantity: 5 },

      // Night Wears
      { Name: 'Cotton Nighty', Description: 'Soft breathable cotton nighty for comfortable sleep. Floral print.', Price: 499, Category: 'Night Wears', Image_URL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', Stock_Quantity: 50 },
      { Name: 'Night Pant for Women', Description: 'Comfortable cotton night pant with elastic waist. Multiple colors available.', Price: 399, Category: 'Night Wears', Image_URL: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600', Stock_Quantity: 40 },
      { Name: 'Night T-Shirt for Women', Description: 'Soft cotton night t-shirt with cute prints. Relaxed fit.', Price: 349, Category: 'Night Wears', Image_URL: 'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=600', Stock_Quantity: 45 },

      // Coconuts
      { Name: 'Fresh Coconut', Description: 'Farm-fresh coconuts, perfect for cooking & making coconut milk.', Price: 45, Category: 'Coconuts', Image_URL: 'https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=600', Stock_Quantity: 100 },
      { Name: 'Unpeeled Coconut (With Husk)', Description: 'Whole unpeeled coconuts with coir husk. Ideal for pooja & traditional use.', Price: 35, Category: 'Coconuts', Image_URL: 'https://images.unsplash.com/photo-1580984969071-a8da8c4e4c56?w=600', Stock_Quantity: 80 },
    ];
    const prodTable = ds.table('Products');
    for (const p of products) await prodTable.insertRow(p);
    log.push(`Seeded ${products.length} products`);

    // 7. Clear products cache
    await clearProductsCache(catalystApp);
    log.push('Cleared products cache');

    res.json({ success: true, log });
  } catch (error) { console.error('Seed reset error:', error); res.status(500).json({ success: false, message: error.message }); }
});

// ─── GET /seed ─── (legacy, now redirects to reset)
app.get('/seed', async (req, res) => {
  res.json({ success: false, message: 'Use POST /seed/reset instead to clear old data and seed fresh.' });
});

// ─── DEBUG: Get table columns ───
app.get('/debug/columns/:table', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const cols = await catalystApp.datastore().table(req.params.table).getAllColumns();
    res.json({ success: true, columns: cols.map(c => ({ name: c.column_name, type: c.data_type })) });
  } catch (error) { res.json({ success: false, message: error.message }); }
});

// ─── DEBUG: Test email ───
app.get('/debug/test-email', async (req, res) => {
  try {
    const catalystApp = initCatalyst(req);
    const to = req.query.to || SENDER_EMAIL;
    console.log('Testing email to:', to);
    const result = await catalystApp.email().sendMail({
      from_email: SENDER_EMAIL,
      to_email: to,
      subject: 'Test Email from Homemade Products',
      content: '<h1>Test</h1><p>If you see this, email is working!</p>',
      html_mode: true,
    });
    console.log('Email result:', JSON.stringify(result));
    res.json({ success: true, message: 'Email sent', result });
  } catch (error) {
    console.error('Test email error:', error);
    res.json({ success: false, message: error.message, stack: error.stack, details: JSON.stringify(error) });
  }
});

module.exports = app;