const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const getDb = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const router = express.Router();

// REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    
    // 1. Check if user exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // 2. Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save user to SQLite
    const result = await db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)', 
      [email, hashedPassword]
    );
    const newUserId = result.lastID;

    // 4. Generate BOTH tokens
    const accessToken = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: newUserId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // 5. Save Refresh Token to database
    await db.run('UPDATE users SET refreshToken = ? WHERE id = ?', [refreshToken, newUserId]);

    // 6. Send BOTH tokens as cookies
    res.cookie('accessToken', accessToken, { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 
    });
    res.cookie('refreshToken', refreshToken, { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    res.status(201).json({ message: 'Registration successful' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();

    // 1. Find user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // 3. Generate BOTH tokens
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // 4. Save Refresh Token to database
    await db.run('UPDATE users SET refreshToken = ? WHERE id = ?', [refreshToken, user.id]);

    // 5. Send BOTH tokens as cookies
    res.cookie('accessToken', accessToken, { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 
    });
    res.cookie('refreshToken', refreshToken, { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 
    });
    
    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REFRESH TOKEN ROUTE
router.post('/refresh', async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) return res.status(401).json({ message: 'No refresh token' });

    // 1. Verify the refresh token is mathematically valid
    const verified = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
    
    // 2. Verify it matches the one in our database
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [verified.userId]);
    
    if (!user || user.refreshToken !== incomingRefreshToken) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // 3. Issue a new Access Token
    const newAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    res.cookie('accessToken', newAccessToken, { 
        httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 * 1000 
    }).json({ message: 'Token refreshed' });

  } catch (err) {
    res.status(403).json({ message: 'Refresh token expired or invalid' });
  }
});

// CHECK USER ROUTE (For React Context on load)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, email FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ _id: user.id, email: user.email }); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGOUT ROUTE
router.post('/logout', async (req, res) => {
  const db = await getDb();
  
  // Remove refresh token from DB if they have an active access token
  const token = req.cookies.accessToken;
  if (token) {
      try {
          const verified = jwt.verify(token, process.env.JWT_SECRET);
          await db.run('UPDATE users SET refreshToken = NULL WHERE id = ?', [verified.userId]);
      } catch(e) { 
        // If access token is already expired, we ignore the error
      }
  }

  // Tell browser to delete both cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;