// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db'); // Uses our promise-based pool
const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password required.' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    const [results] = await db.query(query, [username, email, hashedPassword]);
    res.json({ success: true, message: "User registered successfully!", userId: results.insertId });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Error registering user." });
  }
});

// Login Endpoint (Case-insensitive)
router.post('/login', async (req, res) => {
  const { username, password } = req.body; // We expect the login form to send these fields
  if (!username || !password) {
    console.error("Missing credentials:", req.body);
    return res.status(400).json({ success: false, message: 'Username and password required.' });
  }
  
  try {
    const lowerInput = username.toLowerCase();
    const query = 'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?';
    const [results] = await db.query(query, [lowerInput, lowerInput]);
    
    if (results.length === 0) {
      console.error("No user found for input:", lowerInput);
      return res.status(400).json({ success: false, message: "Invalid credentials." });
    }
    
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      console.error("Password mismatch for user:", user.username);
      return res.status(400).json({ success: false, message: "Invalid credentials." });
    }
    
    res.json({ success: true, message: "Login successful!", userId: user.id });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: "Error during login." });
  }
});

module.exports = router;
