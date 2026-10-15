
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pool = require('./db');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  name: 'rentease.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.use('/api', authRoutes);
// Test API
app.get('/', (req, res) => {
  res.json({
    message: 'RentEase backend is running!',
  });
});

// Test database connection through the API
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database'
    );

    res.json({
      status: 'success',
      message: 'Database connected successfully!',
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`RentEase backend running on port ${PORT}`);
});
