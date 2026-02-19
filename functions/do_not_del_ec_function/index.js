'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const bcrypt = require('bcryptjs');

const app = express();

app.use(express.json());

// ─── POST /google-auth — Handle Google Sign-In credential ───
app.post('/google-auth', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    // Decode the JWT payload (base64url encoded)
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid credential format' });
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not extract email from Google token' });
    }

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    // Check if user exists
    const existing = await zcql.executeZCQLQuery(
      `SELECT ROWID, Name, Email, Phone, Role FROM Users WHERE Email = '${email}'`
    );

    if (existing.length > 0) {
      const userData = existing[0].Users;
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          ROWID: userData.ROWID,
          Name: userData.Name,
          Email: userData.Email,
          Phone: userData.Phone || '',
          Role: userData.Role
        }
      });
    }

    // Create new user (no password needed for Google users)
    const datastore = catalystApp.datastore();
    const usersTable = datastore.table('Users');
    const newUser = await usersTable.insertRow({
      Name: name || email.split('@')[0],
      Email: email,
      Phone: '',
      Password_Hash: 'GOOGLE_AUTH',
      Role: 'Customer'
    });

    res.status(201).json({
      success: true,
      message: 'Account created via Google',
      user: {
        ROWID: newUser.ROWID,
        Name: name || email.split('@')[0],
        Email: email,
        Phone: '',
        Role: 'Customer'
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
});

// ─── POST /signup — Create a new user with hashed password ───
app.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    // Check if email already exists
    const existing = await zcql.executeZCQLQuery(
      `SELECT ROWID, Name, Email FROM Users WHERE Email = '${email}'`
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const datastore = catalystApp.datastore();
    const usersTable = datastore.table('Users');
    const newUser = await usersTable.insertRow({
      Name: name,
      Email: email,
      Phone: phone || '',
      Password_Hash: passwordHash,
      Role: 'Customer'
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        ROWID: newUser.ROWID,
        Name: name,
        Email: email,
        Phone: phone || '',
        Role: 'Customer'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
  }
});

// ─── POST /login — Authenticate user with email & password ───
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const results = await zcql.executeZCQLQuery(
      `SELECT ROWID, Name, Email, Phone, Password_Hash, Role FROM Users WHERE Email = '${email}'`
    );

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'No account found with this email' });
    }

    const userData = results[0].Users;

    // Verify password
    const isMatch = await bcrypt.compare(password, userData.Password_Hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Return user data (never return password hash)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        ROWID: userData.ROWID,
        Name: userData.Name,
        Email: userData.Email,
        Phone: userData.Phone || '',
        Role: userData.Role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// GET /products — Fetch all products
app.get('/products', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const queryResult = await zcql.executeZCQLQuery('SELECT * FROM Products');
    res.status(200).json({ success: true, data: queryResult });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// POST /register — Register a new user (or return existing)
app.post('/register', async (req, res) => {
  try {
    const { Name, Email } = req.body;

    if (!Name || !Email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    // Check if user already exists
    const existing = await zcql.executeZCQLQuery(
      `SELECT * FROM Users WHERE Email = '${Email}'`
    );

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        ROWID: existing[0].Users.ROWID
      });
    }

    // Create new user with Role 'Customer'
    const datastore = catalystApp.datastore();
    const usersTable = datastore.table('Users');
    const newUser = await usersTable.insertRow({
      Name,
      Email,
      Role: 'Customer'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ROWID: newUser.ROWID
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Failed to register user' });
  }
});

// POST /orders — Create a new order with status 'Pending'
app.post('/orders', async (req, res) => {
  try {
    const { User_ID, Total_Amount, Shipping_Address } = req.body;

    if (!User_ID || !Total_Amount || !Shipping_Address) {
      return res.status(400).json({
        success: false,
        message: 'User_ID, Total_Amount, and Shipping_Address are required'
      });
    }

    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const ordersTable = datastore.table('Orders');

    const newOrder = await ordersTable.insertRow({
      User_ID,
      Total_Amount,
      Shipping_Address,
      Status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// GET /seed — Populate Products table with dummy data
app.get('/seed', async (req, res) => {
  try {
    const products = [
      {
        Name: 'Coconut Oil',
        Description: 'Pure cold-pressed coconut oil, ideal for cooking and hair care.',
        Price: 250,
        Category: 'Oils',
        Image_URL: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600',
        Stock_Quantity: 20
      },
      {
        Name: 'Homemade Hair Oil',
        Description: 'Traditional herbal hair oil made with natural ingredients for healthy hair.',
        Price: 500,
        Category: 'Oils',
        Image_URL: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600',
        Stock_Quantity: 15
      },
      {
        Name: 'Groundnut Oil',
        Description: 'Farm-fresh groundnut oil with rich aroma, perfect for deep frying.',
        Price: 350,
        Category: 'Oils',
        Image_URL: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600',
        Stock_Quantity: 25
      },
      {
        Name: 'Silk Saree',
        Description: 'Elegant handwoven silk saree with intricate zari border work.',
        Price: 1500,
        Category: 'Clothing',
        Image_URL: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
        Stock_Quantity: 10
      },
      {
        Name: 'Cotton Nightwear',
        Description: 'Comfortable breathable cotton nightwear set for a restful sleep.',
        Price: 700,
        Category: 'Clothing',
        Image_URL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
        Stock_Quantity: 30
      }
    ];

    const catalystApp = catalyst.initialize(req);
    const datastore = catalystApp.datastore();
    const productsTable = datastore.table('Products');

    const insertedRows = [];
    for (const product of products) {
      const row = await productsTable.insertRow(product);
      insertedRows.push(row);
    }

    res.status(201).json({
      success: true,
      message: 'Database seeded successfully',
      data: insertedRows
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ success: false, message: 'Failed to seed database' });
  }
});

module.exports = app;
