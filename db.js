
const mysql = require('mysql2/promise');  // Using promise version
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'yAS@track_42',
  database: process.env.DB_NAME || 'track_my_budget'
});

console.log('MySQL pool created.');

module.exports = pool;
