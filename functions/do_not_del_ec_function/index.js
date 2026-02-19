'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const ADMIN_EMAIL = 'vengi9360@gmail.com';
const CACHE_SEGMENT_ID = '21282000000050152';
const PRODUCTS_CACHE_KEY = 'all_products';
const CACHE_EXPIRY_HOURS = 1;

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

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const existing = await zcql.executeZCQLQuery(`SELECT ROWID, Name, Email, Phone, Role FROM Users WHERE Email = '${email}'`);
    if (existing.length > 0) {
      const u = existing[0].Users;
      return res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: u.Role } });
    }
    const role = email === ADMIN_EMAIL ? 'Admin' : 'Customer';
    const newUser = await catalystApp.datastore().table('Users').insertRow({ Name: name || email.split('@')[0], Email: email, Phone: '', Password_Hash: 'GOOGLE_AUTH', Role: role });
    res.status(201).json({ success: true, user: { ROWID: newUser.ROWID, Name: name || email.split('@')[0], Email: email, Phone: '', Role: role } });
  } catch (error) { console.error('Google auth error:', error); res.status(500).json({ success: false, message: 'Google auth failed' }); }
});

// ─── POST /signup ───
app.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, password required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars' });

    const catalystApp = catalyst.initialize(req);
    const existing = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID FROM Users WHERE Email = '${email}'`);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const role = email === ADMIN_EMAIL ? 'Admin' : 'Customer';
    const newUser = await catalystApp.datastore().table('Users').insertRow({ Name: name, Email: email, Phone: phone || '', Password_Hash: hash, Role: role });
    res.status(201).json({ success: true, message: 'Account created!', user: { ROWID: newUser.ROWID, Name: name, Email: email, Phone: phone || '', Role: role } });
  } catch (error) { console.error('Signup error:', error); res.status(500).json({ success: false, message: 'Signup failed' }); }
});

// ─── POST /login ───
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const catalystApp = catalyst.initialize(req);
    const results = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID, Name, Email, Phone, Password_Hash, Role FROM Users WHERE Email = '${email}'`);
    if (results.length === 0) return res.status(401).json({ success: false, message: 'No account found' });
    const u = results[0].Users;
    // If account was created via Google, set the password now on first email/password login
    if (u.Password_Hash === 'GOOGLE_AUTH') {
      const hash = await bcrypt.hash(password, 10);
      await catalystApp.datastore().table('Users').updateRow({ ROWID: u.ROWID, Password_Hash: hash });
      return res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: u.Role } });
    }
    if (!(await bcrypt.compare(password, u.Password_Hash))) return res.status(401).json({ success: false, message: 'Incorrect password' });
    res.json({ success: true, user: { ROWID: u.ROWID, Name: u.Name, Email: u.Email, Phone: u.Phone || '', Role: u.Role } });
  } catch (error) { console.error('Login error:', error); res.status(500).json({ success: false, message: 'Login failed' }); }
});

// ─── PUT /profile ───
app.put('/profile', async (req, res) => {
  try {
    const { userId, name, phone } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
    const catalystApp = catalyst.initialize(req);
    const row = { ROWID: userId };
    if (name) row.Name = name;
    if (phone !== undefined) row.Phone = phone;
    await catalystApp.datastore().table('Users').updateRow(row);
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) { console.error('Profile error:', error); res.status(500).json({ success: false, message: 'Update failed' }); }
});

// ─── GET /products (with Cache) ───
app.get('/products', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
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
    const catalystApp = catalyst.initialize(req);
    const newOrder = await catalystApp.datastore().table('Orders').insertRow({
      User_ID, Total_Amount, Shipping_Address, Status: 'Pending',
      Items: Items ? JSON.stringify(Items) : '[]',
      Payment_Method: Payment_Method || 'COD'
    });
    res.status(201).json({ success: true, message: 'Order placed!', data: newOrder });
  } catch (error) { console.error('Order error:', error); res.status(500).json({ success: false, message: 'Failed to create order' }); }
});

// ─── GET /orders/:userId ───
app.get('/orders/:userId', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const data = await catalystApp.zcql().executeZCQLQuery(`SELECT * FROM Orders WHERE User_ID = '${req.params.userId}' ORDER BY CREATEDTIME DESC`);
    res.json({ success: true, data });
  } catch (error) { console.error('Get orders error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /order/:orderId ───
app.get('/order/:orderId', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const data = await catalystApp.zcql().executeZCQLQuery(`SELECT * FROM Orders WHERE ROWID = '${req.params.orderId}'`);
    if (data.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: data[0] });
  } catch (error) { console.error('Get order error:', error); res.status(500).json({ success: false, message: 'Failed' }); }
});

// ──────── ADMIN ────────

// ─── GET /admin/orders ───
app.get('/admin/orders', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const data = await catalystApp.zcql().executeZCQLQuery('SELECT * FROM Orders ORDER BY CREATEDTIME DESC');
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── PUT /admin/order-status ───
app.put('/admin/order-status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ success: false, message: 'orderId, status required' });
    const catalystApp = catalyst.initialize(req);
    await catalystApp.datastore().table('Orders').updateRow({ ROWID: orderId, Status: status });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── POST /admin/product ───
app.post('/admin/product', async (req, res) => {
  try {
    const { Name, Description, Price, Category, Image_URL, Stock_Quantity } = req.body;
    if (!Name || !Price || !Category) return res.status(400).json({ success: false, message: 'Name, Price, Category required' });
    const catalystApp = catalyst.initialize(req);
    const p = await catalystApp.datastore().table('Products').insertRow({ Name, Description: Description || '', Price, Category, Image_URL: Image_URL || '', Stock_Quantity: Stock_Quantity || 0 });
    await clearProductsCache(catalystApp);
    res.status(201).json({ success: true, data: p });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── PUT /admin/product ───
app.put('/admin/product', async (req, res) => {
  try {
    const { ROWID, ...fields } = req.body;
    if (!ROWID) return res.status(400).json({ success: false, message: 'ROWID required' });
    const catalystApp = catalyst.initialize(req);
    await catalystApp.datastore().table('Products').updateRow({ ROWID, ...fields });
    await clearProductsCache(catalystApp);
    res.json({ success: true, message: 'Product updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── DELETE /admin/product/:id ───
app.delete('/admin/product/:id', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    await catalystApp.datastore().table('Products').deleteRow(req.params.id);
    await clearProductsCache(catalystApp);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /admin/categories ───
app.get('/admin/categories', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const data = await catalystApp.zcql().executeZCQLQuery('SELECT * FROM Categories');
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to fetch categories' }); }
});

// ─── POST /admin/category ───
app.post('/admin/category', async (req, res) => {
  try {
    const { Name, Description, Image_URL } = req.body;
    if (!Name) return res.status(400).json({ success: false, message: 'Name required' });
    const catalystApp = catalyst.initialize(req);
    const cat = await catalystApp.datastore().table('Categories').insertRow({ Name, Description: Description || '', Image_URL: Image_URL || '' });
    res.status(201).json({ success: true, data: cat });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── PUT /admin/category ───
app.put('/admin/category', async (req, res) => {
  try {
    const { ROWID, ...fields } = req.body;
    if (!ROWID) return res.status(400).json({ success: false, message: 'ROWID required' });
    const catalystApp = catalyst.initialize(req);
    await catalystApp.datastore().table('Categories').updateRow({ ROWID, ...fields });
    res.json({ success: true, message: 'Category updated' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── DELETE /admin/category/:id ───
app.delete('/admin/category/:id', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    await catalystApp.datastore().table('Categories').deleteRow(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /admin/stats ───
app.get('/admin/stats', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const z = catalystApp.zcql();
    const [orders, products, users, categories] = await Promise.all([
      z.executeZCQLQuery('SELECT ROWID, Total_Amount, Status FROM Orders'),
      z.executeZCQLQuery('SELECT ROWID FROM Products'),
      z.executeZCQLQuery('SELECT ROWID FROM Users'),
      z.executeZCQLQuery('SELECT ROWID FROM Categories'),
    ]);
    const revenue = orders.reduce((s, o) => s + parseFloat(o.Orders?.Total_Amount || 0), 0);
    const pending = orders.filter(o => o.Orders?.Status === 'Pending').length;
    res.json({ success: true, data: { totalOrders: orders.length, totalProducts: products.length, totalUsers: users.length, totalRevenue: revenue, pendingOrders: pending, totalCategories: categories.length } });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ─── GET /cache-test ─── (diagnostic for cache)
app.get('/cache-test', async (req, res) => {
  const catalystApp = catalyst.initialize(req);
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
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const allProducts = await zcql.executeZCQLQuery("SELECT ROWID, Name, Image_URL FROM Products");
    const table = catalystApp.datastore().table('Products');
    const stratusUrl = 'https://ecom-imgs-development.zohostratus.in/product_imgs/C-oil.webp';
    let updated = 0;
    const details = [];
    for (const row of allProducts) {
      const p = row.Products;
      if (p.Name && p.Name.toLowerCase().includes('coconut')) {
        await table.updateRow({ ROWID: p.ROWID, Image_URL: stratusUrl });
        updated++;
        details.push({ ROWID: p.ROWID, Name: p.Name });
      }
    }
    await clearProductsCache(catalystApp);
    res.json({ success: true, message: `Updated ${updated} coconut product(s)`, details, totalProducts: allProducts.length });
  } catch (error) { console.error('Migrate images error:', error); res.status(500).json({ success: false, message: 'Migration failed', error: error.message }); }
});

// ─── GET /seed ───
app.get('/seed', async (req, res) => {
  try {
    const products = [
      { Name: 'Cold-Pressed Coconut Oil', Description: 'Pure cold-pressed coconut oil from fresh Kerala coconuts.', Price: 250, Category: 'Coconut Products', Image_URL: 'https://ecom-imgs-development.zohostratus.in/product_imgs/C-oil.webp', Stock_Quantity: 50 },
      { Name: 'Virgin Coconut Oil', Description: 'Premium virgin coconut oil, perfect for skin & cooking.', Price: 450, Category: 'Coconut Products', Image_URL: 'https://ecom-imgs-development.zohostratus.in/product_imgs/C-oil.webp', Stock_Quantity: 30 },
      { Name: 'Herbal Hair Oil', Description: 'Traditional hair oil with bhringraj, amla & coconut.', Price: 350, Category: 'Hair Oils', Image_URL: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600', Stock_Quantity: 40 },
      { Name: 'Curry Leaf Hair Oil', Description: 'Homemade curry leaf infused oil for hair growth.', Price: 299, Category: 'Hair Oils', Image_URL: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600', Stock_Quantity: 35 },
      { Name: 'Cold-Pressed Groundnut Oil', Description: 'Farm-fresh groundnut oil for traditional cooking.', Price: 320, Category: 'Groundnut Oils', Image_URL: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600', Stock_Quantity: 45 },
      { Name: 'Filtered Groundnut Oil', Description: 'Double-filtered pure groundnut oil. No chemicals.', Price: 380, Category: 'Groundnut Oils', Image_URL: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600', Stock_Quantity: 25 },
      { Name: 'Kanchipuram Silk Saree', Description: 'Handwoven silk saree with intricate zari border.', Price: 2500, Category: 'Sarees', Image_URL: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600', Stock_Quantity: 15 },
      { Name: 'Cotton Handloom Saree', Description: 'Soft cotton handloom saree, light and breathable.', Price: 850, Category: 'Sarees', Image_URL: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', Stock_Quantity: 20 },
      { Name: 'Cotton Nightwear Set', Description: 'Comfortable cotton nightwear set for women.', Price: 699, Category: 'Nightwear', Image_URL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600', Stock_Quantity: 40 },
      { Name: 'Silk Nightwear Gown', Description: 'Premium silk nightwear gown, soft and luxurious.', Price: 1200, Category: 'Nightwear', Image_URL: 'https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?w=600', Stock_Quantity: 18 },
    ];
    const catalystApp = catalyst.initialize(req);
    const table = catalystApp.datastore().table('Products');
    const inserted = [];
    for (const p of products) inserted.push(await table.insertRow(p));
    await clearProductsCache(catalystApp);
    res.status(201).json({ success: true, message: 'Seeded 10 products', data: inserted });
  } catch (error) { res.status(500).json({ success: false, message: 'Seed failed' }); }
});

module.exports = app;