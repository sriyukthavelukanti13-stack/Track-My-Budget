// server.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const port = 3000;

app.use(cors());           // Allow requests from any origin (for development)
app.use(express.json());   // Parse JSON bodies

// Mount the authentication routes at /api/auth
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Auth server running on http://localhost:${port}`);
});
